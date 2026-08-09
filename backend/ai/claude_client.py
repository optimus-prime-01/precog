"""
AI client — supports Groq (free), Google Gemini (free), and Anthropic Claude.
Switches based on AI_PROVIDER env var. All expose the same interface.
"""

import json
from config.settings import settings


# ─── Provider Setup ───

_provider = "groq"  # default

if settings.ai_provider == "anthropic" and settings.anthropic_api_key and settings.anthropic_api_key != "your_anthropic_api_key_here":
    import anthropic
    _anthropic_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    _provider = "anthropic"
    print("[AI] Using Anthropic Claude")

elif settings.ai_provider == "gemini" and settings.gemini_api_key and settings.gemini_api_key != "your_gemini_api_key_here":
    from google import genai
    _gemini_client = genai.Client(api_key=settings.gemini_api_key)
    _provider = "gemini"
    print("[AI] Using Google Gemini")

else:
    from groq import Groq, AsyncGroq
    _groq_key = settings.groq_api_key or settings.grok_api_key
    _groq_client = AsyncGroq(api_key=_groq_key)
    _provider = "groq"
    print("[AI] Using Groq (Llama 3)")


# ─── Unified Interface ───

async def ask_claude(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> str:
    """Send a prompt and return the text response. Works with all providers."""
    if _provider == "anthropic":
        response = await _anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return response.content[0].text

    elif _provider == "gemini":
        full_prompt = f"{system_prompt}\n\n---\n\n{user_prompt}"
        response = _gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=full_prompt,
        )
        return response.text

    else:  # groq
        response = await _groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content


async def ask_claude_json(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> dict:
    """Send a prompt and parse JSON response. Works with all providers."""
    response = await ask_claude(
        system_prompt + "\n\nRespond ONLY with valid JSON. No markdown, no explanation, no code fences.",
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
