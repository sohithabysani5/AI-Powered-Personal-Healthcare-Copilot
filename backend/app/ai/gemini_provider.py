"""Google Gemini Provider adapter."""

import httpx
from app.ai.provider_base import BaseAIProvider, ProviderResponse


class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash", base_url: str = "https://generativelanguage.googleapis.com/v1beta"):
        super().__init__("gemini", api_key, model_name, base_url)

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    async def generate_text(self, system_prompt: str, user_prompt: str, timeout_seconds: int = 25) -> ProviderResponse:
        # Candidate model names to handle temporary Google 503 load spikes
        fallback_models = [self.model_name, "gemini-3-flash-preview", "gemini-3.5-flash", "gemini-3.8-flash"]
        # Deduplicate preserving order
        candidate_models = list(dict.fromkeys(fallback_models))

        headers = {
            "Content-Type": "application/json"
        }
        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "parts": [{"text": user_prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2
            }
        }

        last_error = None
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            for model in candidate_models:
                url = f"{self.base_url.rstrip('/')}/models/{model}:generateContent?key={self.api_key}"
                try:
                    resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            content = candidates[0]["content"]["parts"][0]["text"]
                            return ProviderResponse(
                                content=content,
                                model_name=model,
                                provider_name="gemini"
                            )
                    resp.raise_for_status()
                except Exception as e:
                    last_error = e
                    continue

        if last_error:
            raise last_error
        raise ValueError("Gemini provider failed across all candidate models")
