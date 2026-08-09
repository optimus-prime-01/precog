"""
Add a new topic to PRECOG graph.
Usage: python3 scripts/add_topic.py "Indian startup ecosystem"
"""

import sys
import asyncio
import httpx

# Fix imports from parent
sys.path.insert(0, ".")

from config.scraper_registry import ScraperEntry
from graph.ingestion import ingest_scraped_data
from graph.connection import init_schema
from ai.claude_client import ask_claude_json


async def search_hn(query: str, limit: int = 8) -> list[dict]:
    """Search HackerNews via Algolia API."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"https://hn.algolia.com/api/v1/search",
            params={"query": query, "tags": "story", "hitsPerPage": limit},
        )
        return [
            {"title": h["title"], "url": h.get("url", ""), "points": h.get("points", 0), "source": "HackerNews"}
            for h in resp.json().get("hits", [])
            if h.get("title")
        ]


async def search_hn_recent(query: str, limit: int = 8) -> list[dict]:
    """Search HackerNews by date (most recent)."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"https://hn.algolia.com/api/v1/search_by_date",
            params={"query": query, "tags": "story", "hitsPerPage": limit},
        )
        return [
            {"title": h["title"], "url": h.get("url", ""), "points": h.get("points", 0), "source": "HackerNews_recent"}
            for h in resp.json().get("hits", [])
            if h.get("title")
        ]


async def search_github(query: str, limit: int = 5) -> list[dict]:
    """Search GitHub trending repos."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"https://api.github.com/search/repositories",
            params={"q": query, "sort": "stars", "per_page": limit},
        )
        return [
            {
                "title": f'{r["full_name"]} - {(r.get("description") or "")[:120]}',
                "url": r["html_url"],
                "stars": r["stargazers_count"],
                "source": "GitHub",
            }
            for r in resp.json().get("items", [])
        ]


async def generate_search_queries(topic: str) -> list[str]:
    """Use LLM to generate relevant search queries for the topic."""
    result = await ask_claude_json(
        "You generate search queries for web research. Return a JSON array of 6-8 short search queries (2-4 words each) that would find relevant news, discussions, and data about the given topic. Cover different angles: companies, people, technology, trends, controversies.",
        f"Topic: {topic}",
    )
    if isinstance(result, list):
        return result
    return result.get("queries", [topic])


async def add_topic(topic: str):
    """Main function: scrape multiple sources for a topic and ingest into graph."""
    print(f"\n{'='*60}")
    print(f"  PRECOG — Adding topic: {topic}")
    print(f"{'='*60}\n")

    await init_schema()

    # Step 1: Generate search queries
    print("[1/4] Generating search queries...")
    queries = await generate_search_queries(topic)
    print(f"  Generated {len(queries)} queries: {queries}\n")

    # Step 2: Scrape from multiple sources
    all_stories = []

    print("[2/4] Scraping sources...")

    # HackerNews — popular
    for q in queries[:4]:
        stories = await search_hn(q, limit=4)
        all_stories.extend(stories)
        for s in stories:
            print(f"  HN: {s['title'][:60]}")

    # HackerNews — recent
    for q in queries[4:6]:
        stories = await search_hn_recent(q, limit=4)
        all_stories.extend(stories)
        for s in stories:
            print(f"  HN(new): {s['title'][:60]}")

    # GitHub
    for q in queries[:2]:
        repos = await search_github(q, limit=3)
        all_stories.extend(repos)
        for s in repos:
            print(f"  GH: {s['title'][:60]}")

    # Deduplicate by title
    seen = set()
    unique = []
    for s in all_stories:
        if s["title"] not in seen:
            seen.add(s["title"])
            unique.append(s)
    all_stories = unique

    print(f"\n  Total unique items: {len(all_stories)}\n")

    # Step 3: Ingest into graph
    print("[3/4] Ingesting into graph...")
    scraper = ScraperEntry(
        collector_id=f"c_topic_{topic[:20].replace(' ', '_')}",
        name=f"topic_{topic[:20].replace(' ', '_')}",
        url="https://multiple-sources",
        description=f"Data about: {topic}",
        source_type="news",
    )

    await ingest_scraped_data(all_stories, scraper)

    # Step 4: Show stats
    print("\n[4/4] Graph stats:")
    from graph.connection import neo4j_driver

    async with neo4j_driver.session() as session:
        for label in ["Entity", "Event", "Episode", "Contradiction"]:
            r = await session.run(f"MATCH (n:{label}) RETURN count(n) AS c")
            print(f"  {label}: {(await r.single())['c']}")
        r = await session.run("MATCH ()-[r:CAUSES]->() RETURN count(r) AS c")
        print(f"  Causal Edges: {(await r.single())['c']}")

    print(f"\n{'='*60}")
    print(f"  Done! Refresh http://localhost:3001 to see the graph.")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/add_topic.py \"your topic here\"")
        print()
        print("Examples:")
        print('  python3 scripts/add_topic.py "Indian startup ecosystem"')
        print('  python3 scripts/add_topic.py "AI regulation Europe"')
        print('  python3 scripts/add_topic.py "SpaceX Starship 2026"')
        print('  python3 scripts/add_topic.py "cryptocurrency regulation"')
        print('  python3 scripts/add_topic.py "autonomous vehicles Tesla Waymo"')
        sys.exit(1)

    topic = " ".join(sys.argv[1:])
    asyncio.run(add_topic(topic))
