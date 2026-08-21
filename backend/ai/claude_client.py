"""
AI client with automatic key rotation.
When one Groq key hits rate limit, switches to the next.
Supports Groq, Gemini, and Anthropic.
"""

import json
from config.settings import settings


# ─── Key Rotation for Groq ───

class GroqRotator:
    def __init__(self):
        keys = []
        # Collect all keys
        if settings.groq_keys:
            keys = [k.strip() for k in settings.groq_keys.split(",") if k.strip()]
        if not keys:
            single = settings.groq_api_key or settings.grok_api_key
            if single:
                keys = [single]
        self.keys = keys
        self.current = 0
        self.clients = {}
        print(f"[AI] Groq: {len(self.keys)} keys loaded for rotation")

    def get_client(self):
        from groq import AsyncGroq
        key = self.keys[self.current]
        if key not in self.clients:
            self.clients[key] = AsyncGroq(api_key=key)
        return self.clients[key]

    def rotate(self):
        old = self.current
        self.current = (self.current + 1) % len(self.keys)
        print(f"[AI] Groq: rotated key {old+1} → {self.current+1}/{len(self.keys)}")
        return self.current != 0  # False if we've looped through all keys


# ─── Provider Setup ───

_provider = "groq"
_groq_rotator = None
_anthropic_client = None
_gemini_client = None

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
    _groq_rotator = GroqRotator()
    _provider = "groq"
    print("[AI] Using Groq with key rotation")


# ─── Unified Interface ───

async def ask_claude(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> str:
    """Send a prompt and return text. Auto-rotates Groq keys on 429."""
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

    else:  # groq with rotation
        last_error = None
        attempts = len(_groq_rotator.keys)
        for _ in range(attempts):
            try:
                client = _groq_rotator.get_client()
                response = await client.chat.completions.create(
                    model="qwen/qwen3.6-27b",
                    max_tokens=max_tokens,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                )
                text = response.choices[0].message.content or ""
                # Strip Qwen <think> tags
                import re
                text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
                return text
            except Exception as e:
                last_error = e
                error_str = str(e)
                if "429" in error_str or "rate_limit" in error_str or "401" in error_str or "invalid_api_key" in error_str or "404" in error_str or "model" in error_str.lower():
                    has_more = _groq_rotator.rotate()
                    if not has_more:
                        raise Exception(f"All {attempts} Groq keys exhausted: {error_str[:100]}")
                else:
                    raise
        raise last_error


async def ask_claude_json(system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> dict:
    """Send a prompt and parse JSON response. Auto-rotates keys."""
    response = await ask_claude(
        system_prompt + "\n\nRespond ONLY with valid JSON. No markdown, no explanation, no code fences.",
        user_prompt,
        max_tokens,
    )

    text = response.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    text = text.strip()

    return json.loads(text)
