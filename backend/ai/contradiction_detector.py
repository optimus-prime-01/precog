"""
Contradiction Detector — catches conflicting facts from different sources.
Provides temporal analysis and downstream causal impact assessment.
"""

from graph.connection import neo4j_driver
from graph.models import Entity, Event, Contradiction, gen_id
from ai.claude_client import ask_claude_json


SYSTEM_PROMPT = """You are a contradiction detection engine. Given a NEW fact/event and EXISTING facts
about the same entity, determine if any contradiction exists.

A contradiction means two sources say opposite or incompatible things about the same topic.

If a contradiction is found, provide:
- fact_a: the existing fact
- fact_b: the new fact
- analysis: temporal analysis (which is newer?), likelihood assessment, and downstream causal impact
- severity: low, medium, high

Return JSON:
{
  "contradictions": [
    {
      "existing_event_id": "",
      "fact_a": "",
      "fact_b": "",
      "analysis": "",
      "severity": ""
    }
  ]
}

If no contradictions, return: {"contradictions": []}"""


async def detect_contradictions(session, new_event: Event, entities: list[Entity]):
    """Check if new event contradicts existing facts about the same entities."""

    entity_names = [e.name for e in entities]
    if not entity_names:
        return

    # Find recent events about the same entities
    result = await session.run(
        """
        MATCH (ent:Entity)-[:PARTICIPATES_IN]->(evt:Event)
        WHERE ent.name IN $names AND evt.id <> $new_id
        AND evt.ingestion_time > datetime() - duration('P7D')
        RETURN evt.id AS id, evt.title AS title, evt.description AS desc,
               evt.source_scraper AS source, evt.event_time AS time,
               collect(ent.name) AS entities
        ORDER BY evt.event_time DESC
        LIMIT 15
        """,
        names=entity_names,
        new_id=new_event.id,
    )
    existing = [record.data() async for record in result]

    if not existing:
        return

    try:
        user_prompt = f"""NEW EVENT:
- Title: {new_event.title}
- Description: {new_event.description}
- Source: {new_event.source_scraper}
- Time: {new_event.event_time.isoformat()}
- Entities: {entity_names}

EXISTING EVENTS about the same entities:
{existing}

Are there any contradictions between the new event and existing events?"""

        response = await ask_claude_json(SYSTEM_PROMPT, user_prompt)

        for contra in response.get("contradictions", []):
            # Store contradiction in graph
            contra_id = gen_id("ctr_")
            await session.run(
                """
                CREATE (c:Contradiction {
                    id: $id,
                    entity: $entity,
                    fact_a: $fact_a,
                    source_a: $source_a,
                    fact_b: $fact_b,
                    source_b: $source_b,
                    analysis: $analysis,
                    severity: $severity,
                    status: 'active',
                    created_at: datetime()
                })
                """,
                id=contra_id,
                entity=", ".join(entity_names),
                fact_a=contra["fact_a"],
                source_a=contra.get("existing_event_id", "unknown"),
                fact_b=contra["fact_b"],
                source_b=new_event.source_scraper,
                analysis=contra["analysis"],
                severity=contra["severity"],
            )
            print(f"    ⚠ Contradiction detected: {contra['fact_a'][:50]}... vs {contra['fact_b'][:50]}...")

    except Exception as e:
        print(f"    Contradiction detection error: {e}")
