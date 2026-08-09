"""
Ingestion Pipeline — transforms raw scraped JSON into graph entities and events.
Entity resolution, causal classification, temporal tagging.
"""

from datetime import datetime

from graph.connection import neo4j_driver
from graph.models import Entity, Event, DecisionTrace, gen_id
from ai.entity_extractor import extract_entities_and_events
from ai.causal_classifier import classify_causal_link
from ai.contradiction_detector import detect_contradictions
from config.scraper_registry import ScraperEntry


async def ingest_scraped_data(results: list[dict], scraper: ScraperEntry):
    """
    Main ingestion pipeline:
    1. Claude API extracts entities + events from scraped data
    2. Entity resolution (dedup against existing graph)
    3. Insert entities + events into Neo4j
    4. Classify causal links between new and existing events
    5. Check for contradictions
    """
    for item in results:
        try:
            # Step 1: Extract entities and events via Claude API
            extraction = await extract_entities_and_events(item, scraper)
            if not extraction:
                continue

            async with neo4j_driver.session() as session:
                # Step 2: Upsert entities (resolve duplicates)
                for entity in extraction.entities:
                    await _upsert_entity(session, entity)

                # Step 3: Create event node
                for event in extraction.events:
                    await _create_event(session, event)

                    # Step 4: Link entities to event (bipartite mapping)
                    for entity in extraction.entities:
                        await _link_entity_event(session, entity.id, event.id)

                    # Step 5: Classify causal relationships
                    await classify_causal_link(session, event)

                    # Step 6: Check for contradictions
                    await detect_contradictions(session, event, extraction.entities)

        except Exception as e:
            print(f"    Ingestion error: {e}")


async def _upsert_entity(session, entity: Entity):
    """Insert or update entity. Handles alias resolution."""
    await session.run(
        """
        MERGE (e:Entity {name: $name})
        ON CREATE SET
            e.id = $id,
            e.type = $type,
            e.properties = $properties,
            e.aliases = $aliases,
            e.created_at = datetime(),
            e.updated_at = datetime()
        ON MATCH SET
            e.updated_at = datetime(),
            e.properties = $properties
        """,
        id=entity.id,
        name=entity.name,
        type=entity.type,
        properties=str(entity.properties),
        aliases=entity.aliases,
    )


async def _create_event(session, event: Event):
    """Create event node with bi-temporal timestamps."""
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
            source_url: $url
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
