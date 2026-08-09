"""
Scraper Registry — stores collector IDs and metadata for all scrapers.
Populated dynamically when scrapers are created via `bdata scraper create`.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class ScraperStatus(str, Enum):
    CREATING = "creating"
    ACTIVE = "active"
    HEALING = "healing"
    FAILED = "failed"
    REGENERATING = "regenerating"


@dataclass
class ScraperEntry:
    collector_id: str
    name: str
    url: str
    description: str
    status: ScraperStatus = ScraperStatus.ACTIVE
    source_type: str = "news"  # news, company, govt, social, finance
    refresh_minutes: int = 15
    failure_count: int = 0
    last_run: datetime | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)


class ScraperRegistry:
    """In-memory registry. Persisted to Neo4j on changes."""

    def __init__(self):
        self._scrapers: dict[str, ScraperEntry] = {}

    def register(self, entry: ScraperEntry):
        self._scrapers[entry.collector_id] = entry

    def get(self, collector_id: str) -> ScraperEntry | None:
        return self._scrapers.get(collector_id)

    def all(self) -> list[ScraperEntry]:
        return list(self._scrapers.values())

    def active(self) -> list[ScraperEntry]:
        return [s for s in self._scrapers.values() if s.status == ScraperStatus.ACTIVE]

    def mark_failed(self, collector_id: str):
        entry = self._scrapers.get(collector_id)
        if entry:
            entry.failure_count += 1
            if entry.failure_count >= 3:
                entry.status = ScraperStatus.FAILED

    def mark_healed(self, collector_id: str):
        entry = self._scrapers.get(collector_id)
        if entry:
            entry.status = ScraperStatus.ACTIVE
            entry.failure_count = 0

    def remove(self, collector_id: str):
        self._scrapers.pop(collector_id, None)

    def to_dict(self) -> list[dict]:
        return [
            {
                "collector_id": s.collector_id,
                "name": s.name,
                "url": s.url,
                "description": s.description,
                "status": s.status.value,
                "source_type": s.source_type,
                "refresh_minutes": s.refresh_minutes,
                "failure_count": s.failure_count,
                "last_run": s.last_run.isoformat() if s.last_run else None,
            }
            for s in self._scrapers.values()
        ]


# Global registry instance
registry = ScraperRegistry()
