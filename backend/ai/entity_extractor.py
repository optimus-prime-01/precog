"""
Entity & Event Extractor — uses Claude API to extract structured data from scraped content.
"""

from dataclasses import dataclass
from datetime import datetime

from ai.claude_client import ask_claude_json
from graph.models import Entity, Event
from config.scraper_registry import ScraperEntry


@dataclass
class ExtractionResult:
    entities: list[Entity]
    events: list[Event]


SYSTEM_PROMPT = """You are an entity and event extraction engine for a causal context graph.
Given raw scraped data from a web source, extract:

1. ENTITIES: Companies, people, technologies, products, locations mentioned.
2. EVENTS: What happened? What was announced? What changed?

For each entity, provide:
- name (canonical form, e.g., "NVIDIA" not "Nvidia Corp")
- type (company, person, technology, product, location)
- aliases (other names this entity goes by)

For each event, provide:
- title (concise, factual)
- description (1-2 sentences)
- event_time (ISO format, best estimate from the content)
- confidence (0.0-1.0, how confident you are this is accurate)
- entities_involved (list of entity names involved)

Return JSON with this exact structure:
{
  "entities": [{"name": "", "type": "", "aliases": []}],
  "events": [{"title": "", "description": "", "event_time": "", "confidence": 0.0, "entities_involved": []}]
}"""


async def extract_entities_and_events(
    scraped_item: dict, scraper: ScraperEntry
) -> ExtractionResult | None:
    """Extract entities and events from a single scraped item."""
    try:
        user_prompt = f"""Source: {scraper.name} ({scraper.source_type})
URL: {scraper.url}
Scraped data:
{scraped_item}

Extract all entities and events from this data."""

        result = await ask_claude_json(SYSTEM_PROMPT, user_prompt)

        entities = [
            Entity(
                name=e["name"],
                type=e.get("type", "unknown"),
                aliases=e.get("aliases", []),
            )
            for e in result.get("entities", [])
        ]

        events = [
            Event(
                title=ev["title"],
                description=ev.get("description", ""),
                event_time=datetime.fromisoformat(ev["event_time"]) if ev.get("event_time") else datetime.utcnow(),
                confidence=ev.get("confidence", 0.5),
                source_scraper=scraper.name,
                source_url=scraper.url,
                entities_involved=[e["name"] for e in result.get("entities", [])],
            )
            for ev in result.get("events", [])
        ]

        return ExtractionResult(entities=entities, events=events)

    except Exception as e:
        print(f"    Extraction error: {e}")
        return None
