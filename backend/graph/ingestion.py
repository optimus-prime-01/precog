"""
Ingestion Pipeline — transforms raw scraped JSON into graph entities and events.
Entity resolution, causal classification, temporal tagging.

Follows Graphiti pattern:
1. Create Episode node (raw ground truth)
2. Extract entities/events from episode
3. Link entities to episodes via MENTIONED_IN edges
4. Soft-invalidate contradicted edges instead of deleting
"""

import json
from datetime import datetime

from graph.connection import neo4j_driver
from graph.models import Entity, Event, Episode, DecisionTrace, gen_id
from ai.entity_extractor import extract_entities_and_events
from ai.causal_classifier import classify_causal_link
from ai.contradiction_detector import detect_contradictions
from config.scraper_registry import ScraperEntry


async def ingest_scraped_data(results: list[dict], scraper: ScraperEntry):
    """
    Main ingestion pipeline:
    1. Create Episode node storing raw scraped JSON (ground truth)
    2. Claude API extracts entities + events from scraped data
    3. Entity resolution (dedup against existing graph)
    4. Insert entities + events into Neo4j, linked to episode
    5. Classify causal links between new and existing events
    6. Check for contradictions (soft invalidation)
    """
    for item in results:
        try:
            # Step 1: Create Episode node for raw data (Graphiti episodic memory)
            episode = Episode(
                source=scraper.name,
                source_type=scraper.source_type,
                content=json.dumps(item, default=str),
                valid_at=datetime.utcnow(),
            )

            async with neo4j_driver.session() as session:
                await _create_episode(session, episode)

            # Step 2: Extract entities and events via Claude API
            extraction = await extract_entities_and_events(item, scraper)
            if not extraction:
                continue

            async with neo4j_driver.session() as session:
                # Step 3: Upsert entities (resolve duplicates, update summaries)
                for entity in extraction.entities:
                    entity.valid_at = datetime.utcnow()
                    await _upsert_entity(session, entity, episode.id)

                # Step 4: Create event nodes linked to episode
                for event in extraction.events:
                    event.episode_id = episode.id
                    event.source_description = f"{scraper.name} ({scraper.source_type})"
                    await _create_event(session, event)

                    # Step 5: Link entities to event (bipartite mapping)
                    for entity in extraction.entities:
                        await _link_entity_event(session, entity.id, event.id)

                    # Step 6: Link entities to episode (MENTIONED_IN — Graphiti EpisodicEdge)
                    for entity in extraction.entities:
                        await _link_entity_episode(session, entity.id, episode.id)

                    # Step 7: Classify causal relationships
                    await classify_causal_link(session, event)

                    # Step 8: Check for contradictions (soft invalidation)
                    await detect_contradictions(session, event, extraction.entities)

        except Exception as e:
            print(f"    Ingestion error: {e}")


async def _create_episode(session, episode: Episode):
    """Create an Episode node storing the raw scraped data as ground truth."""
    await session.run(
        """
        CREATE (ep:Episode {
            id: $id,
            source: $source,
            source_type: $source_type,
            content: $content,
            valid_at: datetime($valid_at),
            created_at: datetime()
        })
        """,
        id=episode.id,
        source=episode.source,
        source_type=episode.source_type,
        content=episode.content,
        valid_at=episode.valid_at.isoformat(),
    )


async def _upsert_entity(session, entity: Entity, episode_id: str):
    """Insert or update entity. On match, update evolving summary and merge labels."""
    await session.run(
        """
        MERGE (e:Entity {name: $name})
        ON CREATE SET
            e.id = $id,
            e.type = $type,
            e.properties = $properties,
            e.aliases = $aliases,
            e.summary = $summary,
            e.labels = $labels,
            e.attributes = $attributes,
            e.valid_at = datetime($valid_at),
            e.group_id = $group_id,
            e.created_at = datetime(),
            e.updated_at = datetime()
        ON MATCH SET
            e.updated_at = datetime(),
            e.properties = $properties,
            e.summary = CASE
                WHEN e.summary = '' THEN $summary
                WHEN $summary = '' THEN e.summary
                ELSE e.summary + ' | ' + $summary
            END
        """,
        id=entity.id,
        name=entity.name,
        type=entity.type,
        properties=str(entity.properties),
        aliases=entity.aliases,
        summary=entity.summary,
        labels=entity.labels,
        attributes=str(entity.attributes),
        valid_at=entity.valid_at.isoformat() if entity.valid_at else datetime.utcnow().isoformat(),
        group_id=entity.group_id,
    )


async def _create_event(session, event: Event):
    """Create event node with bi-temporal timestamps and episode linkage."""
    await session.run(
        """
        CREATE (e:Event {
            id: $id,
            title: $title,
            description: $description,
            event_time: datetime($event_time),
            ingestion_time: datetime(),
            validity_window_days: $validity,
            confidence: $confidence,
            source_scraper: $scraper,
            source_url: $url,
            episode_id: $episode_id,
            source_description: $source_description
        })
        """,
        id=event.id,
        title=event.title,
        description=event.description,
        event_time=event.event_time.isoformat(),
        validity=event.validity_window_days,
        confidence=event.confidence,
        scraper=event.source_scraper,
        url=event.source_url,
        episode_id=event.episode_id,
        source_description=event.source_description,
    )


async def _link_entity_event(session, entity_id: str, event_id: str):
    """Create bipartite mapping between entity and event."""
    await session.run(
        """
        MATCH (ent:Entity {id: $ent_id})
        MATCH (evt:Event {id: $evt_id})
        MERGE (ent)-[:PARTICIPATES_IN]->(evt)
        """,
        ent_id=entity_id,
        evt_id=event_id,
    )


async def _link_entity_episode(session, entity_id: str, episode_id: str):
    """Link entity to the episode it was mentioned in (Graphiti EpisodicEdge)."""
    await session.run(
        """
        MATCH (ent:Entity {id: $ent_id})
        MATCH (ep:Episode {id: $ep_id})
        MERGE (ent)-[:MENTIONED_IN]->(ep)
        """,
        ent_id=entity_id,
        ep_id=episode_id,
    )


async def soft_invalidate_edge(session, edge_id: str, reason: str = ""):
    """
    Soft-invalidate an EntityEdge by setting invalid_at and expired_at
    instead of deleting it. Preserves historical fact record (Graphiti pattern).

    This should be called when a new fact contradicts an existing edge.
    """
    await session.run(
        """
        MATCH (ee:EntityEdge {id: $edge_id})
        WHERE ee.expired_at IS NULL
        SET ee.invalid_at = datetime(),
            ee.expired_at = datetime()
        """,
        edge_id=edge_id,
    )
