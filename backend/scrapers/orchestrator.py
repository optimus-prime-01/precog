"""
Scraper Orchestrator — manages the scraper swarm lifecycle.
Creates scrapers, schedules runs, handles self-healing.
"""

import asyncio
from datetime import datetime

from scrapers.brightdata import brightdata
from config.scraper_registry import registry, ScraperEntry, ScraperStatus
from graph.ingestion import ingest_scraped_data


# Default scrapers to create for "AI chip industry" domain
DEFAULT_SCRAPER_SPECS = [
    {
        "name": "reuters_tech",
        "url": "https://www.reuters.com/technology/",
        "description": "extract article title, publication date, summary, and mentioned company names from technology news articles",
        "source_type": "news",
        "refresh_minutes": 15,
    },
    {
        "name": "techcrunch_ai",
        "url": "https://techcrunch.com/category/artificial-intelligence/",
        "description": "extract article title, date, author, summary, and mentioned companies from AI news articles",
        "source_type": "news",
        "refresh_minutes": 15,
    },
    {
        "name": "nvidia_careers",
        "url": "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite",
        "description": "extract job title, department, location, and date posted for each job listing",
        "source_type": "company",
        "refresh_minutes": 60,
    },
    {
        "name": "tsmc_investor",
        "url": "https://investor.tsmc.com/english/news-events",
        "description": "extract announcement title, date, and category from investor news events",
        "source_type": "company",
        "refresh_minutes": 60,
    },
    {
        "name": "openai_blog",
        "url": "https://openai.com/blog",
        "description": "extract blog post title, date, summary, and topic tags",
        "source_type": "company",
        "refresh_minutes": 30,
    },
    {
        "name": "anthropic_news",
        "url": "https://www.anthropic.com/news",
        "description": "extract news title, date, summary from Anthropic news and announcements",
        "source_type": "company",
        "refresh_minutes": 30,
    },
    {
        "name": "hackernews_top",
        "url": "https://news.ycombinator.com/",
        "description": "extract story title, url, points, comment count from top stories on Hacker News",
        "source_type": "social",
        "refresh_minutes": 15,
    },
    {
        "name": "uspto_patents",
        "url": "https://patft.uspto.gov/netacgi/nph-Parser?Sect1=PTO2&Sect2=HITOFF&u=%2Fnetahtml%2FPTO%2Fsearch-adv.htm&r=0&p=1&f=S&l=50&Query=ttl%2Fsemiconductor&d=PTXT",
        "description": "extract patent title, inventor names, assignee company, filing date, and abstract from semiconductor patent listings",
        "source_type": "govt",
        "refresh_minutes": 360,
    },
]


class ScraperOrchestrator:

    async def initialize_scrapers(self, specs: list[dict] | None = None):
        """Create all scrapers via bdata CLI."""
        specs = specs or DEFAULT_SCRAPER_SPECS
        print(f"[Orchestrator] Creating {len(specs)} scrapers...")

        for spec in specs:
            print(f"  Creating: {spec['name']} ({spec['url']})")
            collector_id = await brightdata.create_scraper(spec["url"], spec["description"])

            if collector_id:
                entry = ScraperEntry(
                    collector_id=collector_id,
                    name=spec["name"],
                    url=spec["url"],
                    description=spec["description"],
                    source_type=spec["source_type"],
                    refresh_minutes=spec["refresh_minutes"],
                )
                registry.register(entry)
                print(f"  ✓ Created: {spec['name']} → {collector_id}")
            else:
                print(f"  ✗ Failed: {spec['name']}")

    async def run_scraper(self, entry: ScraperEntry):
        """Run a single scraper and ingest results."""
        try:
            results = await brightdata.run_scraper(entry.collector_id, [entry.url])

            if results and len(results) > 0:
                entry.last_run = datetime.utcnow()
                entry.failure_count = 0
                entry.status = ScraperStatus.ACTIVE

                # Ingest into graph
                await ingest_scraped_data(results, entry)
                print(f"  ✓ {entry.name}: {len(results)} results ingested")
            else:
                # Empty results — potential failure
                registry.mark_failed(entry.collector_id)
                print(f"  ⚠ {entry.name}: empty results (failures: {entry.failure_count})")

                # Self-healing: Level 2 — regenerate after 3 failures
                if entry.failure_count >= 3:
                    await self._regenerate_scraper(entry)

        except Exception as e:
            registry.mark_failed(entry.collector_id)
            print(f"  ✗ {entry.name} error: {e}")

    async def _regenerate_scraper(self, entry: ScraperEntry):
        """Level 2 self-healing: delete and recreate scraper."""
        print(f"  🔄 Regenerating {entry.name}...")
        entry.status = ScraperStatus.REGENERATING

        new_id = await brightdata.regenerate_scraper(entry.url, entry.description)
        if new_id:
            registry.remove(entry.collector_id)
            new_entry = ScraperEntry(
                collector_id=new_id,
                name=entry.name,
                url=entry.url,
                description=entry.description,
                source_type=entry.source_type,
                refresh_minutes=entry.refresh_minutes,
            )
            registry.register(new_entry)
            print(f"  ✓ Regenerated: {entry.name} → {new_id}")
        else:
            print(f"  ✗ Regeneration failed: {entry.name}")

    async def run_loop(self):
        """Main scraping loop — runs scrapers on their configured intervals."""
        # Initialize scrapers if registry is empty
        if not registry.all():
            await self.initialize_scrapers()

        while True:
            now = datetime.utcnow()
            active_scrapers = registry.active()

            for entry in active_scrapers:
                # Check if it's time to run
                if entry.last_run is None or (
                    (now - entry.last_run).total_seconds() >= entry.refresh_minutes * 60
                ):
                    await self.run_scraper(entry)

            # Sleep 60 seconds before next check
            await asyncio.sleep(60)
