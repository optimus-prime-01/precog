"""
API Routes — serves graph data, predictions, contradictions, and NL queries to the dashboard.
"""

from fastapi import APIRouter, Request

from graph.connection import neo4j_driver
from ai.claude_client import ask_claude
from config.scraper_registry import registry

router = APIRouter()


@router.get("/graph")
async def get_graph():
    """Return all entities, events, and edges for the graph explorer."""
    async with neo4j_driver.session() as session:
        # Entities
        ent_result = await session.run(
            "MATCH (e:Entity) RETURN e.id AS id, e.name AS name, e.type AS type LIMIT 200"
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


@router.post("/query")
async def natural_language_query(request: Request):
    """Answer a natural language question by querying the graph."""
    body = await request.json()
    question = body.get("question", "")

    if not question:
        return {"error": "No question provided"}

    # Get graph data — targeted queries for better context
    async with neo4j_driver.session() as session:
        # Top connected entities
        ent_result = await session.run(
            """MATCH (e:Entity)-[r]-()
               RETURN e.name AS name, e.type AS type, count(r) AS connections
               ORDER BY connections DESC LIMIT 30"""
        )
        entities = [record.data() async for record in ent_result]

        # Recent events with entity context
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

        # Full causal chains (multi-hop)
        chain_result = await session.run(
            """MATCH path = (a:Event)-[:CAUSES*1..3]->(b:Event)
               RETURN [n IN nodes(path) | n.title] AS chain,
                      [r IN relationships(path) | r.confidence] AS confidences
               LIMIT 10"""
        )
        chains = [record.data() async for record in chain_result]

        # Contradictions with full analysis
        contra_result = await session.run(
            """MATCH (c:Contradiction) WHERE c.status = 'active'
               RETURN c.entity AS entity, c.fact_a AS fact_a, c.fact_b AS fact_b,
                      c.analysis AS analysis, c.severity AS severity
               LIMIT 10"""
        )
        contradictions = [record.data() async for record in contra_result]

        # Entity relationships
        rel_result = await session.run(
            """MATCH (a:Entity)-[r]->(b:Entity)
               RETURN a.name AS source_name, type(r) AS relationship, b.name AS target_name
               LIMIT 30"""
        )
        relationships = [record.data() async for record in rel_result]

    system = """You are PRECOG, a causal web intelligence engine. You answer questions by reasoning over a live knowledge graph built from scraped web data.

Your reasoning process:
1. DIRECT ANSWER: Answer the question directly in 1-2 sentences.
2. GRAPH EVIDENCE: Cite specific events, causal chains, and entity relationships from the data. Include source and confidence.
3. CONTRADICTIONS: If any active contradictions are relevant, mention them — they show uncertainty.
4. CAUSAL REASONING: Trace cause-effect chains. If A caused B, and B involves entity X, then a change to A affects X.
5. SECOND-ORDER EFFECTS: What downstream consequences follow? Think 2 steps ahead using entity relationships.

Rules:
- No markdown. Plain text only. No ** or ## or *.
- Use line breaks between sections for readability.
- Cite sources like: (Source: scraper_name, confidence: 0.8)
- Be specific. Name entities, events, and relationships.
- If you find contradictions relevant to the question, highlight them as "ACTIVE CONTRADICTION:" on its own line."""

    user = f"""Question: {question}

GRAPH DATA:

Top entities (by connections): {entities}

Entity relationships: {relationships}

Recent events (with involved entities): {events[:15]}

Causal chains (proven): {chains}

Active contradictions: {contradictions}

Reason over this data to answer the question. Trace causal chains and entity relationships."""

    answer = await ask_claude(system, user)
    return {"question": question, "answer": answer}


@router.post("/clear-graph")
async def clear_graph():
    """Clear all nodes and relationships from the graph."""
    async with neo4j_driver.session() as session:
        await session.run("MATCH (n) DETACH DELETE n")
    return {"status": "ok", "message": "Graph cleared"}


@router.post("/add-topic")
async def add_topic(request: Request):
    """
    Add a new topic: scrape fast sources first (HN, GitHub), return immediately,
    then Bright Data scrapers + LLM ingestion run in background.
    """
    import asyncio
    import httpx
    from config.scraper_registry import ScraperEntry
    from graph.ingestion import ingest_scraped_data
    from scrapers.brightdata import brightdata
    from config.settings import settings

    body = await request.json()
    topic = body.get("topic", "").strip()
    if not topic:
        return {"error": "No topic provided"}

    steps_log = []
    all_stories = []

    # Generate search queries from topic (simple split, no LLM needed)
    words = topic.split()
    search_queries = [
        topic,
        f"{topic} 2026",
        " ".join(words[:2]) if len(words) > 1 else f"{topic} news",
        f"{words[0]} startup" if words else topic,
        f"{topic} funding",
    ]

    # ─── Step 1: Fast scrape — HN + GitHub (instant, no blocking) ───
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        for q in search_queries[:4]:
            try:
                resp = await client.get(
                    "https://hn.algolia.com/api/v1/search",
                    params={"query": q, "tags": "story", "hitsPerPage": 5},
                )
                for h in resp.json().get("hits", []):
                    if h.get("title"):
                        all_stories.append({
                            "title": h["title"],
                            "url": h.get("url", ""),
                            "points": h.get("points", 0),
                            "source": "HackerNews",
                        })
            except Exception:
                pass

        for q in search_queries[:2]:
            try:
                resp = await client.get(
                    "https://api.github.com/search/repositories",
                    params={"q": q, "sort": "stars", "per_page": 3},
                )
                for r in resp.json().get("items", []):
                    all_stories.append({
                        "title": f'{r["full_name"]} - {(r.get("description") or "")[:100]}',
                        "url": r["html_url"],
                        "stars": r["stargazers_count"],
                        "source": "GitHub",
                    })
            except Exception:
                pass

    steps_log.append(f"HN + GitHub: {len(all_stories)} items scraped")

    # Deduplicate
    seen = set()
    unique = []
    for s in all_stories:
        t = s.get("title", "")
        if t and t not in seen:
            seen.add(t)
            unique.append(s)

    if not unique:
        return {"status": "error", "message": "No data found for this topic", "steps": steps_log}

    # Count sources before background work
    source_counts = {}
    for s in unique:
        src = s.get("source", "unknown")
        source_counts[src] = source_counts.get(src, 0) + 1

    # ─── Step 2: ALL ingestion + Bright Data in background (return immediately) ───
    async def background_work():
        scraper_entry = ScraperEntry(
            collector_id=f"c_topic_{topic[:20].replace(' ', '_')}",
            name=f"topic_{topic[:20].replace(' ', '_')}",
            url="https://multiple-sources",
            description=f"Data about: {topic}",
            source_type="news",
        )
        try:
            await ingest_scraped_data(unique[:10], scraper_entry)
            print(f"  [BG] Ingested {min(len(unique), 10)} items for topic: {topic}")
        except Exception as e:
            print(f"  [BG] Ingestion error: {str(e)[:80]}")

        # Bright Data scrapers
        bd_api_key = settings.brightdata_api_key
        if bd_api_key and bd_api_key != "your_bright_data_api_key_here":
            existing = registry.active()
            for entry in existing[:2]:
                try:
                    results = await brightdata.run_scraper(entry.collector_id, [entry.url])
                    if results:
                        bd_stories = [{"title": item.get("title", ""), "url": item.get("url", ""), "source": f"BrightData_{entry.name}"} for item in results[:8] if item.get("title")]
                        if bd_stories:
                            await ingest_scraped_data(bd_stories, entry)
                            print(f"  [BG] Bright Data '{entry.name}': {len(bd_stories)} items")
                except Exception as e:
                    print(f"  [BG] Bright Data error: {str(e)[:80]}")

            try:
                cid = await brightdata.create_scraper(
                    f"https://news.google.com/search?q={topic.replace(' ', '+')}",
                    f"extract news titles, dates about {topic[:50]}",
                )
                if cid:
                    registry.register(ScraperEntry(collector_id=cid, name=f"bd_{topic[:15].replace(' ', '_')}", url=f"https://news.google.com/search?q={topic.replace(' ', '+')}", description=f"Scraper for {topic}", source_type="news"))
                    print(f"  [BG] New Bright Data scraper: {cid}")
            except Exception:
                pass

    asyncio.create_task(background_work())
    steps_log.append(f"Scraped {len(unique)} items. Ingestion + Bright Data running in background.")
    steps_log.append("Graph will update in ~30-60 seconds. Refresh dashboard to see new entities.")

    return {
        "status": "ok",
        "topic": topic,
        "items_scraped": len(unique),
        "sources": source_counts,
        "queries_used": search_queries,
        "steps": steps_log,
    }
