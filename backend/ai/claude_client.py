"""
Claude API client — shared instance for all AI operations.
"""

import anthropic
from config.settings import settings

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

MODEL = "claude-sonnet-4-20250514"


async def ask_claude(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> str:
    """Send a prompt to Claude and return the text response."""
    response = await client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text


async def ask_claude_json(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> dict:
    """Send a prompt to Claude and parse JSON response."""
    import json

    response = await ask_claude(
        system_prompt + "\n\nRespond ONLY with valid JSON. No markdown, no explanation.",
        user_prompt,
        max_tokens,
    )

    # Strip markdown code fences if present
    text = response.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    text = text.strip()

    return json.loads(text)
