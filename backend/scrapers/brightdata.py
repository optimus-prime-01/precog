"""
Bright Data Scraper Studio integration.
Handles scraper creation, execution, healing, and regeneration.
"""

import asyncio
import json
import subprocess

import httpx

from config.settings import settings


class BrightDataClient:
    BASE_URL = "https://api.brightdata.com"

    def __init__(self):
        self.api_key = settings.brightdata_api_key
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    # ─── Scraper Creation (via CLI) ───

    async def create_scraper(self, url: str, description: str) -> str | None:
        """
        Create a new scraper using `bdata scraper create`.
        Returns collector_id on success, None on failure.
        """
        cmd = ["npx", "-p", "@brightdata/cli", "bdata", "scraper", "create", url, description]
        try:
            result = await asyncio.to_thread(
                subprocess.run, cmd, capture_output=True, text=True, timeout=600
            )
            if result.returncode == 0:
                # Parse collector ID from output
                output = result.stdout.strip()
                for line in output.split("\n"):
                    if line.startswith("c_"):
                        return line.strip()
                return output.split()[-1] if output else None
            else:
                print(f"Scraper creation failed: {result.stderr}")
                return None
        except Exception as e:
            print(f"Error creating scraper: {e}")
            return None

    # ─── Scraper Execution (via API) ───

    async def trigger_scraper(self, collector_id: str, urls: list[str]) -> str | None:
        """Trigger a scraper run. Returns snapshot_id."""
        endpoint = f"{self.BASE_URL}/dca/trigger"
        params = {"collector": collector_id, "queue_next": 1}
        payload = [{"url": u} for u in urls]

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                endpoint, params=params, headers=self.headers, json=payload, timeout=30
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("collection_id")
            else:
                print(f"Trigger failed [{resp.status_code}]: {resp.text}")
                return None

    async def poll_results(self, snapshot_id: str, max_wait: int = 120) -> list[dict] | None:
        """Poll for scraper results until ready."""
        endpoint = f"{self.BASE_URL}/dca/dataset"
        params = {"id": snapshot_id}

        async with httpx.AsyncClient() as client:
            for _ in range(max_wait // 5):
                resp = await client.get(endpoint, params=params, headers=self.headers, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list):
                        return data  # Results ready
                    # Still building
                await asyncio.sleep(5)
        return None

    async def run_scraper(self, collector_id: str, urls: list[str]) -> list[dict] | None:
        """Trigger + poll in one call."""
        snapshot_id = await self.trigger_scraper(collector_id, urls)
        if not snapshot_id:
            return None
        return await self.poll_results(snapshot_id)

    # ─── Self-Healing ───

    async def heal_scraper(self, collector_id: str, prompt: str, url: str) -> bool:
        """Heal a broken scraper using `bdata scraper heal`."""
        cmd = [
            "npx", "-p", "@brightdata/cli", "bdata", "scraper", "heal",
            collector_id, prompt, "--url", url, "--auto-approve",
        ]
        try:
            result = await asyncio.to_thread(
                subprocess.run, cmd, capture_output=True, text=True, timeout=300
            )
            return result.returncode == 0
        except Exception as e:
            print(f"Heal failed: {e}")
            return False

    async def regenerate_scraper(self, url: str, description: str) -> str | None:
        """Delete broken scraper and create a new one."""
        return await self.create_scraper(url, description)


# Global client instance
brightdata = BrightDataClient()
