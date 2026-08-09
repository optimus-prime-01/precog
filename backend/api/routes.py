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

    # Get graph summary for context
    async with neo4j_driver.session() as session:
        # Get recent entities
        ent_result = await session.run(
            "MATCH (e:Entity) RETURN e.name AS name, e.type AS type LIMIT 50"
        )
        entities = [record.data() async for record in ent_result]

        # Get recent events
        evt_result = await session.run(
            """MATCH (e:Event) RETURN e.title AS title, e.source_scraper AS source,
               toString(e.event_time) AS time, e.confidence AS confidence
               ORDER BY e.event_time DESC LIMIT 30"""
        )
        events = [record.data() async for record in evt_result]

        # Get causal chains
        chain_result = await session.run(
            """MATCH (a:Event)-[r:CAUSES]->(b:Event)
               RETURN a.title AS cause, b.title AS effect, r.confidence AS confidence
               LIMIT 20"""
        )
        chains = [record.data() async for record in chain_result]

        # Get active contradictions
        contra_result = await session.run(
            """MATCH (c:Contradiction) WHERE c.status = 'active'
               RETURN c.entity AS entity, c.fact_a AS fact_a, c.fact_b AS fact_b
               LIMIT 10"""
        )
        contradictions = [record.data() async for record in contra_result]

    system = """You are PRECOG's query interface. Answer questions using the graph data provided.
Always cite your sources (which scraper, which event). Include confidence scores.
If the graph doesn't have enough data, say so clearly.
Format your answer with clear structure."""

    user = f"""Question: {question}

Graph data:
ENTITIES: {entities}
RECENT EVENTS: {events}
CAUSAL CHAINS: {chains}
ACTIVE CONTRADICTIONS: {contradictions}

Answer the question using ONLY the graph data above. Cite sources and confidence."""

    answer = await ask_claude(system, user)
    return {"question": question, "answer": answer}
