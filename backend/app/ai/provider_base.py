"""Abstract base class and contract for AI providers."""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel


class ProviderResponse(BaseModel):
    content: str
    model_name: str
    provider_name: str
    tokens_used: Optional[int] = None


class BaseAIProvider(ABC):
    """Abstract class for all AI LLM adapters (Grok, Mistral, Gemini)."""

    def __init__(self, name: str, api_key: str, model_name: str, base_url: str):
        self.name = name
        self.api_key = api_key
        self.model_name = model_name
        self.base_url = base_url
        self.consecutive_failures = 0
        self.is_circuit_open = False
        self.circuit_opened_at: Optional[float] = None

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if valid API credentials are provided."""
        pass

    @abstractmethod
    async def generate_text(self, system_prompt: str, user_prompt: str, timeout_seconds: int = 25) -> ProviderResponse:
        """Generate text from LLM with strict error normalization."""
        pass
