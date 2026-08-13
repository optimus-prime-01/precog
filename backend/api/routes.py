"""
API Routes — serves graph data, predictions, contradictions, and NL queries to the dashboard.
"""

from fastapi import APIRouter, Request

from graph.connection import neo4j_driver
from ai.claude_client import ask_claude, ask_claude_json
from config.scraper_registry import registry
import collections
import datetime

# In-memory log buffer — stores last 100 backend events
_log_buffer: collections.deque = collections.deque(maxlen=100)


def add_log(source: str, message: str, level: str = "info"):
    """Add a log entry to the buffer."""
    _log_buffer.append({
        "time": datetime.datetime.utcnow().isoformat(),
        "source": source,
        "message": message,
        "level": level,
    })


router = APIRouter()


@router.get("/graph")
async def get_graph():
    """Return all entities, events, and edges for the graph explorer."""
    async with neo4j_driver.session() as session:
        # Entities with source info
        ent_result = await session.run(
            """MATCH (e:Entity)
               OPTIONAL MATCH (e)-[:MENTIONED_IN]->(ep:Episode)
               WITH e, collect(DISTINCT ep.source) AS sources
               RETURN e.id AS id, e.name AS name, e.type AS type, sources
               LIMIT 200"""
        )
        entities = [record.data() async for record in ent_result]

        # Events
        evt_result = await session.run(
            """MATCH (e:Event) RETURN e.id AS id, e.title AS title,
               toString(e.event_time) AS event_time, e.confidence AS confidence,
               e.source_scraper AS source LIMIT 200"""
        )
        events = [record.data() async for record in evt_result]

        # Entity-Entity edges
        rel_result = await session.run(
            """MATCH (a:Entity)-[r]->(b:Entity)
               RETURN a.id AS source, b.id AS target, type(r) AS type LIMIT 500"""
        )
        entity_edges = [record.data() async for record in rel_result]

        # Entity-Event edges (bipartite)
        part_result = await session.run(
            """MATCH (ent:Entity)-[:PARTICIPATES_IN]->(evt:Event)
               RETURN ent.id AS source, evt.id AS target LIMIT 500"""
        )
        bipartite_edges = [record.data() async for record in part_result]

        # Causal edges
        causal_result = await session.run(
            """MATCH (a:Event)-[r:CAUSES]->(b:Event)
               RETURN a.id AS source, b.id AS target, r.confidence AS confidence,
                      r.reasoning AS reasoning LIMIT 200"""
        )
        causal_edges = [record.data() async for record in causal_result]

    return {
        "entities": entities,
        "events": events,
        "entity_edges": entity_edges,
        "bipartite_edges": bipartite_edges,
        "causal_edges": causal_edges,
    }


@router.get("/predictions")
async def get_predictions():
    """Return all predictions, sorted by recency."""
    async with neo4j_driver.session() as session:
        result = await session.run(
            """MATCH (p:Prediction)
               RETURN p.id AS id, p.text AS text, p.confidence AS confidence,
                      p.prediction_type AS type, p.reasoning AS reasoning,
                      p.timeframe AS timeframe, p.watch_for AS watch_for,
                      p.weak_signals AS signals, p.causal_chain AS chain,
                      toString(p.created_at) AS created_at,
                      p.resolved AS resolved
               ORDER BY p.created_at DESC
               LIMIT 50"""
        )
        predictions = [record.data() async for record in result]
    return {"predictions": predictions}


@router.get("/contradictions")
async def get_contradictions():
    """Return all active contradictions."""
    async with neo4j_driver.session() as session:
        result = await session.run(
            """MATCH (c:Contradiction)
               WHERE c.status = 'active'
               RETURN c.id AS id, c.entity AS entity, c.fact_a AS fact_a,
                      c.source_a AS source_a, c.fact_b AS fact_b,
                      c.source_b AS source_b, c.analysis AS analysis,
                      c.severity AS severity, toString(c.created_at) AS created_at
               ORDER BY c.created_at DESC
               LIMIT 30"""
        )
        contradictions = [record.data() async for record in result]
    return {"contradictions": contradictions}


@router.get("/scrapers")
async def get_scrapers():
    """Return scraper registry status."""
    return {"scrapers": registry.to_dict()}


@router.get("/traces/{node_id}")
async def get_decision_trace(node_id: str):
    """Return decision traces for a given node."""
    async with neo4j_driver.session() as session:
        result = await session.run(
            """MATCH (t:DecisionTrace)
               WHERE t.target CONTAINS $id
               RETURN t.id AS id, t.action AS action, t.target AS target,
                      t.reasoning AS reasoning, t.confidence AS confidence,
                      toString(t.created_at) AS created_at
               ORDER BY t.created_at DESC
               LIMIT 20""",
            id=node_id,
        )
        traces = [record.data() async for record in result]
    return {"traces": traces}


@router.get("/entity/{entity_id}")
async def get_entity_detail(entity_id: str):
    """Return full detail for an entity — events, connections, sources, traces."""
    async with neo4j_driver.session() as session:
        # Entity info
        ent = await session.run(
            "MATCH (e:Entity {id: $id}) RETURN e.name AS name, e.type AS type, e.summary AS summary, toString(e.created_at) AS created_at, toString(e.updated_at) AS updated_at",
            id=entity_id,
        )
        entity = await ent.single()
        if not entity:
            return {"error": "Entity not found"}

        # Events this entity participates in
        evt = await session.run(
            """MATCH (e:Entity {id: $id})-[:PARTICIPATES_IN]->(evt:Event)
               RETURN evt.title AS title, evt.source_scraper AS source,
                      toString(evt.event_time) AS event_time, evt.confidence AS confidence
               ORDER BY evt.event_time DESC LIMIT 20""",
            id=entity_id,
        )
        events = [r.data() async for r in evt]

        # Connected entities
        conn = await session.run(
            """MATCH (e:Entity {id: $id})-[:PARTICIPATES_IN]->(evt:Event)<-[:PARTICIPATES_IN]-(other:Entity)
               WHERE other.id <> $id
               RETURN other.name AS name, other.type AS type, count(evt) AS shared_events
               ORDER BY shared_events DESC LIMIT 15""",
            id=entity_id,
        )
        connections = [r.data() async for r in conn]

        # Sources (which scrapers brought this entity)
        src = await session.run(
            """MATCH (e:Entity {id: $id})-[:MENTIONED_IN]->(ep:Episode)
               RETURN ep.source AS source, ep.source_type AS type, count(ep) AS count
               ORDER BY count DESC""",
            id=entity_id,
        )
        sources = [r.data() async for r in src]

        # Contradictions involving this entity
        contra = await session.run(
            """MATCH (c:Contradiction)
               WHERE c.entity CONTAINS $name
               RETURN c.fact_a AS fact_a, c.fact_b AS fact_b, c.analysis AS analysis, c.severity AS severity
               LIMIT 5""",
            name=entity.data()["name"],
        )
        contradictions = [r.data() async for r in contra]

    return {
        "entity": entity.data(),
        "events": events,
        "connections": connections,
        "sources": sources,
        "contradictions": contradictions,
    }


@router.post("/query")
async def natural_language_query(request: Request):
    """
    Answer a question using the graph.
    If graph has no relevant data, auto-scrape the topic, enrich the graph, then answer.
    """
    from config.scraper_registry import ScraperEntry
    from graph.ingestion import ingest_scraped_data
    from scrapers.multi_source import scrape_all_sources

    body = await request.json()
    question = body.get("question", "")

    if not question:
        return {"error": "No question provided"}

    async def get_graph_context():
        async with neo4j_driver.session() as session:
            ent_result = await session.run(
                """MATCH (e:Entity)-[r]-()
                   RETURN e.name AS name, e.type AS type, count(r) AS connections
                   ORDER BY connections DESC LIMIT 30"""
            )
            entities = [record.data() async for record in ent_result]

            evt_result = await session.run(
                """MATCH (e:Event)
                   OPTIONAL MATCH (ent:Entity)-[:PARTICIPATES_IN]->(e)
                   WITH e, collect(ent.name) AS involved_entities
                   RETURN e.title AS title, e.source_scraper AS source,
                          toString(e.event_time) AS time, e.confidence AS confidence,
                          involved_entities
                   ORDER BY e.event_time DESC LIMIT 25"""
            )
            events = [record.data() async for record in evt_result]

            chain_result = await session.run(
                """MATCH path = (a:Event)-[:CAUSES*1..3]->(b:Event)
                   RETURN [n IN nodes(path) | n.title] AS chain,
                          [r IN relationships(path) | r.confidence] AS confidences
                   LIMIT 10"""
            )
            chains = [record.data() async for record in chain_result]

            contra_result = await session.run(
                """MATCH (c:Contradiction) WHERE c.status = 'active'
                   RETURN c.entity AS entity, c.fact_a AS fact_a, c.fact_b AS fact_b,
                          c.analysis AS analysis, c.severity AS severity
                   LIMIT 10"""
            )
            contradictions = [record.data() async for record in contra_result]

            rel_result = await session.run(
                """MATCH (a:Entity)-[r]->(b:Entity)
                   RETURN a.name AS source_name, type(r) AS relationship, b.name AS target_name
                   LIMIT 30"""
            )
            relationships = [record.data() async for record in rel_result]

        return entities, events, chains, contradictions, relationships

    # Step 1: Check if graph has relevant data
    entities, events, chains, contradictions, relationships = await get_graph_context()

    # Ask LLM: does the graph have data about this question?
    try:
        relevance = await ask_claude_json(
            """Check if the graph data contains relevant information to answer the question.
Return JSON: {"has_data": true/false, "search_query": "short search query to find missing data"}""",
            f"Question: {question}\nEntities in graph: {[e['name'] for e in entities[:20]]}",
        )
    except Exception:
        relevance = {"has_data": True, "search_query": question}

    enriched = False

    # Step 2: If no relevant data, auto-scrape and enrich
    if not relevance.get("has_data", True):
        search_q = relevance.get("search_query", question)
        print(f"[Query] No data for '{question}'. Auto-scraping: '{search_q}'")

        # Scrape ALL sources for the missing topic
        queries = [search_q, f"{search_q} 2026", f"{search_q} news"]
        unique, _ = await scrape_all_sources(queries, use_brightdata=False)

        if unique:
            scraper = ScraperEntry(
                collector_id=f"c_query_{search_q[:15].replace(' ', '_')}",
                name=f"query_enrichment",
                url="https://auto-enrichment",
                description=f"Auto-scraped for query: {question[:50]}",
                source_type="news",
            )
            try:
                await ingest_scraped_data(unique[:8], scraper)
                enriched = True
                print(f"[Query] Enriched graph with {min(len(unique), 8)} items")
            except Exception as e:
                print(f"[Query] Enrichment failed: {str(e)[:80]}")

            # Re-fetch graph context with new data
            entities, events, chains, contradictions, relationships = await get_graph_context()

    # Step 3: Answer with (enriched) graph context
    system = """You are PRECOG, a causal web intelligence engine. You answer questions by reasoning over a live knowledge graph built from scraped web data.

Your reasoning process:
1. DIRECT ANSWER: Answer the question directly in 1-2 sentences.
2. GRAPH EVIDENCE: Cite specific events, causal chains, and entity relationships from the data. Include source and confidence.
3. CONTRADICTIONS: If any active contradictions are relevant, mention them.
4. CAUSAL REASONING: Trace cause-effect chains.
5. SECOND-ORDER EFFECTS: What downstream consequences follow?

Rules:
- No markdown. Plain text only. No ** or ## or *.
- Use line breaks between sections for readability.
- Cite sources like: (Source: scraper_name, confidence: 0.8)
- Be specific. Name entities, events, and relationships."""

    user = f"""Question: {question}

GRAPH DATA:

Top entities (by connections): {entities}

Entity relationships: {relationships}

Recent events (with involved entities): {events[:15]}

Causal chains (proven): {chains}

Active contradictions: {contradictions}

Reason over this data to answer the question."""

    answer = await ask_claude(system, user)

    return {
        "question": question,
        "answer": answer,
        "enriched": enriched,
        "enriched_message": f"Graph auto-enriched with new data about '{relevance.get('search_query', '')}'" if enriched else None,
    }


@router.get("/logs")
async def get_logs():
    """Return recent backend activity logs."""
    return {"logs": list(_log_buffer)}


@router.post("/clear-graph")
async def clear_graph():
    """Clear all nodes and relationships from the graph."""
    async with neo4j_driver.session() as session:
        await session.run("MATCH (n) DETACH DELETE n")
    return {"status": "ok", "message": "Graph cleared"}


@router.get("/compare/{entity_id_a}/{entity_id_b}")
async def compare_entities(entity_id_a: str, entity_id_b: str):
    """Compare two entities — shared connections, shared events, unique events."""
    async with neo4j_driver.session() as session:
        # Entity A info
        a_res = await session.run(
            "MATCH (e:Entity {id: $id}) RETURN e.name AS name, e.type AS type",
            id=entity_id_a,
        )
        entity_a = await a_res.single()
        if not entity_a:
            return {"error": "Entity A not found"}

        # Entity B info
        b_res = await session.run(
            "MATCH (e:Entity {id: $id}) RETURN e.name AS name, e.type AS type",
            id=entity_id_b,
        )
        entity_b = await b_res.single()
        if not entity_b:
            return {"error": "Entity B not found"}

        # Shared connections — entities that both A and B connect to via events
        shared_conn = await session.run(
            """MATCH (a:Entity {id: $id_a})-[:PARTICIPATES_IN]->(evt:Event)<-[:PARTICIPATES_IN]-(shared:Entity)
               WHERE (shared)-[:PARTICIPATES_IN]->(:Event)<-[:PARTICIPATES_IN]-(:Entity {id: $id_b})
               AND shared.id <> $id_a AND shared.id <> $id_b
               RETURN DISTINCT shared.name AS name, shared.type AS type""",
            id_a=entity_id_a, id_b=entity_id_b,
        )
        shared_connections = [r.data() async for r in shared_conn]

        # Shared events — events both entities participate in
        shared_evt = await session.run(
            """MATCH (a:Entity {id: $id_a})-[:PARTICIPATES_IN]->(evt:Event)<-[:PARTICIPATES_IN]-(b:Entity {id: $id_b})
               RETURN evt.title AS title, toString(evt.event_time) AS event_time, evt.confidence AS confidence
               ORDER BY evt.event_time DESC""",
            id_a=entity_id_a, id_b=entity_id_b,
        )
        shared_events = [r.data() async for r in shared_evt]

        # Unique events for A
        unique_a = await session.run(
            """MATCH (a:Entity {id: $id_a})-[:PARTICIPATES_IN]->(evt:Event)
               WHERE NOT (evt)<-[:PARTICIPATES_IN]-(:Entity {id: $id_b})
               RETURN evt.title AS title, toString(evt.event_time) AS event_time
               ORDER BY evt.event_time DESC LIMIT 15""",
            id_a=entity_id_a, id_b=entity_id_b,
        )
        unique_events_a = [r.data() async for r in unique_a]

        # Unique events for B
        unique_b = await session.run(
            """MATCH (b:Entity {id: $id_b})-[:PARTICIPATES_IN]->(evt:Event)
               WHERE NOT (evt)<-[:PARTICIPATES_IN]-(:Entity {id: $id_a})
               RETURN evt.title AS title, toString(evt.event_time) AS event_time
               ORDER BY evt.event_time DESC LIMIT 15""",
            id_a=entity_id_a, id_b=entity_id_b,
        )
        unique_events_b = [r.data() async for r in unique_b]

    return {
        "entity_a": entity_a.data(),
        "entity_b": entity_b.data(),
        "shared_connections": shared_connections,
        "shared_events": shared_events,
        "unique_events_a": unique_events_a,
        "unique_events_b": unique_events_b,
    }


@router.get("/export-report")
async def export_report():
    """Generate a text report of the entire graph state."""
    async with neo4j_driver.session() as session:
        # Entities
        ent_result = await session.run(
            "MATCH (e:Entity) RETURN e.name AS name, e.type AS type ORDER BY e.type, e.name"
        )
        entities = [r.data() async for r in ent_result]

        # Events
        evt_result = await session.run(
            """MATCH (e:Event)
               RETURN e.title AS title, toString(e.event_time) AS event_time,
                      e.confidence AS confidence, e.source_scraper AS source
               ORDER BY e.event_time DESC"""
        )
        events = [r.data() async for r in evt_result]

        # Predictions
        pred_result = await session.run(
            """MATCH (p:Prediction)
               RETURN p.text AS text, p.confidence AS confidence,
                      p.prediction_type AS type, p.reasoning AS reasoning,
                      p.timeframe AS timeframe
               ORDER BY p.created_at DESC LIMIT 50"""
        )
        predictions = [r.data() async for r in pred_result]

        # Contradictions
        contra_result = await session.run(
            """MATCH (c:Contradiction) WHERE c.status = 'active'
               RETURN c.entity AS entity, c.fact_a AS fact_a, c.fact_b AS fact_b,
                      c.analysis AS analysis, c.severity AS severity
               ORDER BY c.created_at DESC"""
        )
        contradictions = [r.data() async for r in contra_result]

        # Causal links count
        causal_result = await session.run("MATCH ()-[r:CAUSES]->() RETURN count(r) AS count")
        causal_count = (await causal_result.single())["count"]

    # Build report text
    lines = []
    lines.append("=" * 60)
    lines.append("PRECOG - Predictive Causal Context Graph Report")
    lines.append(f"Generated: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    lines.append("=" * 60)
    lines.append("")

    # Stats
    lines.append("--- GRAPH STATS ---")
    lines.append(f"Entities: {len(entities)}")
    lines.append(f"Events: {len(events)}")
    lines.append(f"Causal Links: {causal_count}")
    lines.append(f"Predictions: {len(predictions)}")
    lines.append(f"Contradictions: {len(contradictions)}")
    lines.append("")

    # Entities
    lines.append("--- ENTITIES ---")
    for ent in entities:
        lines.append(f"  [{ent['type']}] {ent['name']}")
    lines.append("")

    # Events
    lines.append("--- EVENTS ---")
    for evt in events:
        date = evt.get("event_time", "N/A") or "N/A"
        conf = evt.get("confidence")
        conf_str = f" (confidence: {conf:.0%})" if conf else ""
        source = evt.get("source", "")
        source_str = f" [source: {source}]" if source else ""
        lines.append(f"  {date[:10] if date != 'N/A' else date} | {evt['title']}{conf_str}{source_str}")
    lines.append("")

    # Predictions
    lines.append("--- PREDICTIONS ---")
    for pred in predictions:
        conf = pred.get("confidence")
        conf_str = f" ({conf:.0%})" if conf else ""
        tf = pred.get("timeframe", "")
        tf_str = f" [{tf}]" if tf else ""
        lines.append(f"  {pred.get('type', 'prediction')}{conf_str}{tf_str}: {pred['text']}")
        if pred.get("reasoning"):
            lines.append(f"    Reasoning: {pred['reasoning'][:200]}")
    lines.append("")

    # Contradictions
    lines.append("--- CONTRADICTIONS ---")
    for c in contradictions:
        lines.append(f"  Entity: {c['entity']} (severity: {c.get('severity', 'N/A')})")
        lines.append(f"    A: {c['fact_a']}")
        lines.append(f"    B: {c['fact_b']}")
        if c.get("analysis"):
            lines.append(f"    Analysis: {c['analysis'][:200]}")
        lines.append("")

    lines.append("=" * 60)
    lines.append("End of Report")

    return {"report": "\n".join(lines)}


@router.get("/event/{event_id}")
async def get_event_detail(event_id: str):
    """Return full detail for an event — entities, causal parents/children, source episode."""
    async with neo4j_driver.session() as session:
        # Event info
        evt = await session.run(
            """MATCH (e:Event {id: $id})
               RETURN e.title AS title, toString(e.event_time) AS event_time,
                      e.confidence AS confidence, e.source_scraper AS source,
                      e.summary AS summary""",
            id=event_id,
        )
        event = await evt.single()
        if not event:
            return {"error": "Event not found"}

        # Involved entities
        ent_res = await session.run(
            """MATCH (ent:Entity)-[:PARTICIPATES_IN]->(e:Event {id: $id})
               RETURN ent.id AS id, ent.name AS name, ent.type AS type""",
            id=event_id,
        )
        entities = [r.data() async for r in ent_res]

        # Causal parents — events that caused this event
        parents_res = await session.run(
            """MATCH (parent:Event)-[r:CAUSES]->(e:Event {id: $id})
               RETURN parent.id AS id, parent.title AS title,
                      toString(parent.event_time) AS event_time,
                      r.confidence AS confidence, r.reasoning AS reasoning""",
            id=event_id,
        )
        causal_parents = [r.data() async for r in parents_res]

        # Causal children — events this event caused
        children_res = await session.run(
            """MATCH (e:Event {id: $id})-[r:CAUSES]->(child:Event)
               RETURN child.id AS id, child.title AS title,
                      toString(child.event_time) AS event_time,
                      r.confidence AS confidence, r.reasoning AS reasoning""",
            id=event_id,
        )
        causal_children = [r.data() async for r in children_res]

        # Source episode — the scraped data that produced this event
        ep_res = await session.run(
            """MATCH (e:Event {id: $id})<-[:PRODUCED]-(ep:Episode)
               RETURN ep.source AS source, ep.source_type AS source_type,
                      ep.title AS title, ep.content AS content, ep.url AS url,
                      toString(ep.scraped_at) AS scraped_at
               LIMIT 3""",
            id=event_id,
        )
        episodes = [r.data() async for r in ep_res]

        # Fallback: try MENTIONED_IN relationship for episodes
        if not episodes:
            ep_res2 = await session.run(
                """MATCH (ent:Entity)-[:PARTICIPATES_IN]->(e:Event {id: $id})
                   MATCH (ent)-[:MENTIONED_IN]->(ep:Episode)
                   RETURN DISTINCT ep.source AS source, ep.source_type AS source_type,
                          ep.title AS title, ep.content AS content, ep.url AS url,
                          toString(ep.scraped_at) AS scraped_at
                   LIMIT 3""",
                id=event_id,
            )
            episodes = [r.data() async for r in ep_res2]

    return {
        "event": event.data(),
        "entities": entities,
        "causal_parents": causal_parents,
        "causal_children": causal_children,
        "episodes": episodes,
    }


@router.post("/add-topic")
async def add_topic(request: Request):
    """
    Add a new topic using ALL available sources:
    1. Bright Data Scraper Studio (DCA API) — real web scraping
    2. HackerNews Algolia (popular + recent)
    3. GitHub trending repos
    Returns instantly, ingestion runs in background.
    """
    import asyncio
    from config.scraper_registry import ScraperEntry
    from graph.ingestion import ingest_scraped_data
    from scrapers.multi_source import scrape_all_sources
    from scrapers.brightdata import brightdata

    body = await request.json()
    topic = body.get("topic", "").strip()
    if not topic:
        return {"error": "No topic provided"}

    # Generate search queries
    words = topic.split()
    search_queries = [
        topic,
        f"{topic} 2026",
        " ".join(words[:2]) if len(words) > 1 else f"{topic} news",
        f"{words[0]} company" if words else topic,
        f"{topic} latest",
        f"{topic} impact",
        f"{topic} competition",
        f"{topic} future",
    ]

    # Scrape ALL sources in parallel (Bright Data + HN + GitHub)
    unique, logs = await scrape_all_sources(search_queries, use_brightdata=True)

    if not unique:
        return {"status": "error", "message": "No data found for this topic", "steps": logs}

    # Count sources
    source_counts = {}
    for s in unique:
        src = s.get("source", "unknown")
        source_counts[src] = source_counts.get(src, 0) + 1

    # Background: LLM ingestion + new scraper creation
    async def background_work():
        from ai.prediction_engine import PredictionEngine

        scraper_entry = ScraperEntry(
            collector_id=f"c_topic_{topic[:20].replace(' ', '_')}",
            name=f"topic_{topic[:20].replace(' ', '_')}",
            url="https://multi-source",
            description=f"Data about: {topic}",
            source_type="news",
        )
        try:
            await ingest_scraped_data(unique[:30], scraper_entry)
            print(f"  [BG] Ingested {min(len(unique), 30)} items for: {topic}")
        except Exception as e:
            print(f"  [BG] Ingestion error: {str(e)[:80]}")

        # Run prediction engine after ingestion
        try:
            engine = PredictionEngine()
            await engine.detect_all_predictions()
            print("  [BG] Predictions generated")
        except Exception as e:
            print(f"  [BG] Prediction error: {str(e)[:80]}")

        # Create new Bright Data scraper for this topic (background, 5-15 min)
        try:
            cid = await brightdata.create_scraper(
                f"https://news.google.com/search?q={topic.replace(' ', '+')}",
                f"extract news article titles, dates, source names about {topic[:50]}",
            )
            if cid:
                registry.register(ScraperEntry(
                    collector_id=cid,
                    name=f"bd_{topic[:15].replace(' ', '_')}",
                    url=f"https://news.google.com/search?q={topic.replace(' ', '+')}",
                    description=f"Bright Data scraper for {topic}",
                    source_type="news",
                ))
                print(f"  [BG] New Bright Data scraper created: {cid}")
        except Exception:
            pass

    asyncio.create_task(background_work())
    logs.append(f"Ingestion + Bright Data scraper creation running in background")
    logs.append("Refresh dashboard in 30-60s to see new entities")

    return {
        "status": "ok",
        "topic": topic,
        "items_scraped": len(unique),
        "sources": source_counts,
        "queries_used": search_queries,
        "steps": logs,
    }
