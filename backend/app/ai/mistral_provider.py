"""Mistral AI Provider adapter."""

import httpx
from app.ai.provider_base import BaseAIProvider, ProviderResponse


class MistralProvider(BaseAIProvider):
    def __init__(self, api_key: str, model_name: str = "mistral-small-latest", base_url: str = "https://api.mistral.ai/v1"):
        super().__init__("mistral", api_key, model_name, base_url)

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    async def generate_text(self, system_prompt: str, user_prompt: str, timeout_seconds: int = 25) -> ProviderResponse:
        url = f"{self.base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.2
        }

        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return ProviderResponse(
                content=content,
                model_name=self.model_name,
                provider_name="mistral"
            )
