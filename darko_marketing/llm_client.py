"""
DARKO LLM CLIENT — SHARED MODULE
==================================
Single source of truth for all LLM API calls.
Supports: Google Gemini, Anthropic Claude, OpenAI GPT-4o.
All modules import from here.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class LLMClient:
    """Unified wrapper for Google Gemini, Anthropic, and OpenAI."""

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "google").lower()

        if self.provider == "google":
            self.model = os.getenv("GOOGLE_MODEL", "gemini-2.5-flash")
            self.api_key = os.getenv("GOOGLE_API_KEY", "")
            if not self.api_key:
                raise ValueError("GOOGLE_API_KEY not set in .env")
        elif self.provider == "anthropic":
            import anthropic
            self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
            self.model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
        elif self.provider == "openai":
            import openai
            self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            self.model = os.getenv("OPENAI_MODEL", "gpt-4o")
        else:
            raise ValueError(f"Unknown LLM_PROVIDER: {self.provider}")

    def complete(
        self,
        user_prompt: str,
        system_prompt: str,
        max_tokens: int = 2000,
    ) -> tuple[str, int]:
        """Return (content, tokens_used)."""

        if self.provider == "google":
            return self._google_complete(user_prompt, system_prompt, max_tokens)
        elif self.provider == "anthropic":
            return self._anthropic_complete(user_prompt, system_prompt, max_tokens)
        elif self.provider == "openai":
            return self._openai_complete(user_prompt, system_prompt, max_tokens)

    def _google_complete(self, user_prompt, system_prompt, max_tokens) -> tuple[str, int]:
        """Call Google Gemini via REST API (no SDK dependency)."""
        import httpx

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent?key={self.api_key}"
        )

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": 0.7,
            },
        }

        resp = httpx.post(url, json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()

        text = data["candidates"][0]["content"]["parts"][0]["text"]
        usage = data.get("usageMetadata", {})
        tokens = usage.get("promptTokenCount", 0) + usage.get("candidatesTokenCount", 0)

        return text, tokens

    def _anthropic_complete(self, user_prompt, system_prompt, max_tokens) -> tuple[str, int]:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return (
            response.content[0].text,
            response.usage.input_tokens + response.usage.output_tokens,
        )

    def _openai_complete(self, user_prompt, system_prompt, max_tokens) -> tuple[str, int]:
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        usage = response.usage
        return response.choices[0].message.content, usage.total_tokens
