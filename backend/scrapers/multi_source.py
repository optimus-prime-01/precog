"""
Multi-source scraper — scrapes from multiple sources simultaneously.
Uses Bright Data DCA API + Scraper Studio + HN Algolia + GitHub API.
"""

import asyncio
import httpx
from config.settings import settings


API_KEY = settings.brightdata_api_key
BD_HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# Bright Data scraper collector IDs (created via bdata CLI)
BD_SCRAPERS = {
    "hackernews": "c_mslxoc89hn79n1fn1",
    # New ones will be added as they're created
}


async def scrape_brightdata_dca(collector_id: str, url: str, timeout: int = 90) -> list[dict]:
    """Scrape via Bright Data Scraper Studio DCA API (trigger + poll)."""
    if not API_KEY or API_KEY == "your_bright_data_api_key_here":
        return []

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                "https://api.brightdata.com/dca/trigger",
                headers=BD_HEADERS,
                params={"collector": collector_id, "queue_next": 1},
                json=[{"url": url}],
            )
            if resp.status_code != 200:
                print(f"  [BD] Trigger failed: {resp.status_code}")
                return []

            snapshot = resp.json().get("collection_id")
            if not snapshot:
                return []

            # Poll for results
            for _ in range(timeout // 5):
                await asyncio.sleep(5)
                poll = await client.get(
                    "https://api.brightdata.com/dca/dataset",
                    headers=BD_HEADERS,
                    params={"id": snapshot},
                )
                if poll.status_code == 200:
                    data = poll.json()
                    if isinstance(data, list) and len(data) > 0:
                        return data
            return []
    except Exception as e:
        print(f"  [BD] DCA error: {str(e)[:80]}")
        return []


async def scrape_hackernews(query: str, limit: int = 5) -> list[dict]:
    """Search HackerNews via Algolia API."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://hn.algolia.com/api/v1/search",
                params={"query": query, "tags": "story", "hitsPerPage": limit},
            )
            return [
                {"title": h["title"], "url": h.get("url", ""), "points": h.get("points", 0), "source": "HackerNews"}
                for h in resp.json().get("hits", []) if h.get("title")
            ]
    except Exception:
        return []


async def scrape_hackernews_recent(query: str, limit: int = 5) -> list[dict]:
    """Search HackerNews by date (most recent)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://hn.algolia.com/api/v1/search_by_date",
                params={"query": query, "tags": "story", "hitsPerPage": limit},
            )
            return [
                {"title": h["title"], "url": h.get("url", ""), "points": h.get("points", 0), "source": "HackerNews_recent"}
                for h in resp.json().get("hits", []) if h.get("title")
            ]
    except Exception:
        return []


async def scrape_github(query: str, limit: int = 3) -> list[dict]:
    """Search GitHub repos."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.github.com/search/repositories",
                params={"q": query, "sort": "stars", "per_page": limit},
            )
            return [
                {
                    "title": f'{r["full_name"]} - {(r.get("description") or "")[:100]}',
                    "url": r["html_url"],
                    "stars": r["stargazers_count"],
                    "source": "GitHub",
                }
                for r in resp.json().get("items", [])
            ]
    except Exception:
        return []


async def scrape_brightdata_hn(limit: int = 30) -> list[dict]:
    """Scrape HackerNews via Bright Data Scraper Studio."""
    collector = BD_SCRAPERS.get("hackernews")
    if not collector:
        return []

    print("  [BD] Scraping HackerNews via Bright Data Scraper Studio...")
    results = await scrape_brightdata_dca(collector, "https://news.ycombinator.com/", timeout=90)
    return [
        {
            "title": r.get("title", ""),
            "url": r.get("url", ""),
            "points": r.get("points", r.get("score", 0)),
            "source": "BrightData_HackerNews",
        }
        for r in results[:limit] if r.get("title")
    ]


async def scrape_all_sources(queries: list[str], use_brightdata: bool = True) -> tuple[list[dict], list[str]]:
    """
    Scrape from ALL available sources in parallel.
    Bright Data runs with a timeout so it doesn't block fast sources.
    Returns (stories, logs).
    """
    all_stories = []
    logs = []

    tasks = []

    # 1. Bright Data Scraper Studio (with 15s timeout — don't block)
    if use_brightdata:
        async def bd_with_timeout():
            try:
                return await asyncio.wait_for(scrape_brightdata_hn(30), timeout=15)
            except asyncio.TimeoutError:
                return []
        tasks.append(("BrightData_HN", bd_with_timeout()))

    # 2. HN Algolia — all queries, more results
    for q in queries[:6]:
        tasks.append((f"HN:{q}", scrape_hackernews(q, 8)))

    # 3. HN Recent — more queries
    for q in queries[:4]:
        tasks.append((f"HN_recent:{q}", scrape_hackernews_recent(q, 5)))

    # 4. GitHub
    for q in queries[:3]:
        tasks.append((f"GitHub:{q}", scrape_github(q, 4)))

    # Run all in parallel
    results = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)

    for (name, _), result in zip(tasks, results):
        if isinstance(result, Exception):
            logs.append(f"{name}: error — {str(result)[:60]}")
        elif result:
            all_stories.extend(result)
            logs.append(f"{name}: {len(result)} items")
        else:
            logs.append(f"{name}: 0 items")

    # Deduplicate by title
    seen = set()
    unique = []
    for s in all_stories:
        t = s.get("title", "")
        if t and t not in seen:
            seen.add(t)
            unique.append(s)

    logs.append(f"Total unique: {len(unique)} items from {len(tasks)} sources")
    return unique, logs
