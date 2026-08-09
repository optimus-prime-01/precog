"""
Causal Classifier — determines if a new event was caused by an existing event.
Creates [:CAUSES] edges in the graph with confidence scores and decision traces.
"""

from graph.connection import neo4j_driver
from graph.models import Event, CausalEdge, DecisionTrace, gen_id
from ai.claude_client import ask_claude_json


SYSTEM_PROMPT = """You are a causal reasoning engine. Given a NEW event and a list of EXISTING recent events
involving the same entities, determine if any existing event CAUSED the new event.

Causal means: the earlier event directly or indirectly led to the new event happening.

For each causal link found, provide:
- cause_event_id: ID of the causing event
- confidence: 0.0-1.0
- reasoning: 1-2 sentences explaining the causal mechanism

Return JSON:
{
  "causal_links": [
    {"cause_event_id": "", "confidence": 0.0, "reasoning": ""}
  ]
}

If no causal links exist, return: {"causal_links": []}"""


async def classify_causal_link(session, new_event: Event):
    """Check if any recent events caused this new event."""

    # Find recent events involving the same entities
    result = await session.run(
        """
        MATCH (evt:Event)<-[:PARTICIPATES_IN]-(ent:Entity)-[:PARTICIPATES_IN]->(other:Event)
        WHERE evt.id = $new_id AND other.id <> $new_id
        AND other.event_time > datetime() - duration('P30D')
        RETURN DISTINCT other.id AS id, other.title AS title,
               other.description AS desc, other.event_time AS time
        ORDER BY other.event_time DESC
        LIMIT 10
        """,
        new_id=new_event.id,
    )
    candidates = [record.data() async for record in result]

    if not candidates:
        return

    # Ask Claude to classify causal relationships
    try:
        user_prompt = f"""NEW EVENT:
- ID: {new_event.id}
- Title: {new_event.title}
- Description: {new_event.description}
- Time: {new_event.event_time.isoformat()}

EXISTING RECENT EVENTS (potential causes):
{candidates}

Which existing events, if any, CAUSED the new event?"""

        response = await ask_claude_json(SYSTEM_PROMPT, user_prompt)

        for link in response.get("causal_links", []):
            if link["confidence"] >= 0.5:
                trace_id = gen_id("dt_")

                # Create causal edge
                await session.run(
                    """
                    MATCH (cause:Event {id: $cause_id})
                    MATCH (effect:Event {id: $effect_id})
                    CREATE (cause)-[:CAUSES {
                        confidence: $confidence,
                        reasoning: $reasoning,
                        trace_id: $trace_id
                    }]->(effect)
                    """,
                    cause_id=link["cause_event_id"],
                    effect_id=new_event.id,
                    confidence=link["confidence"],
                    reasoning=link["reasoning"],
                    trace_id=trace_id,
                )

                # Log decision trace
                await session.run(
                    """
                    CREATE (t:DecisionTrace {
                        id: $id,
                        action: 'ADD_CAUSAL_EDGE',
                        target: $target,
                        reasoning: $reasoning,
                        confidence: $confidence,
                        created_at: datetime()
                    })
                    """,
                    id=trace_id,
                    target=f"{link['cause_event_id']} -> {new_event.id}",
                    reasoning=link["reasoning"],
                    confidence=link["confidence"],
                )

    except Exception as e:
        print(f"    Causal classification error: {e}")
