"""Configuration and settings module for AI-Powered Personal Health Copilot."""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "AI-Powered Personal Health Copilot"
    APP_ENV: str = "development"
    SECRET_KEY: str = "development-secret-key-health-copilot-32char-min-12345678"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    DATABASE_URL: str = "sqlite:///./health_copilot.db"
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB

    # AI Provider Settings
    XAI_API_KEY: str = ""
    XAI_MODEL: str = "grok-beta"
    XAI_BASE_URL: str = "https://api.x.ai/v1"

    MISTRAL_API_KEY: str = ""
    MISTRAL_MODEL: str = "mistral-small-latest"
    MISTRAL_BASE_URL: str = "https://api.mistral.ai/v1"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-flash-latest"
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"

    AI_PROVIDER_ORDER: str = "gemini,mistral,grok"
    AI_REQUEST_TIMEOUT_SECONDS: int = 25
    AI_MAX_RETRIES_PER_PROVIDER: int = 1
    AI_CIRCUIT_BREAKER_FAILURES: int = 3
    AI_CIRCUIT_BREAKER_COOLDOWN_SECONDS: int = 60

    # OCR Settings
    TESSERACT_CMD: str = ""
    TESSERACT_LANGUAGES: str = "eng,hin,tel,tam"

    class Config:
        env_file = (
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.env")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env")),
            ".env",
            "../.env"
        )
        extra = "ignore"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def provider_order(self) -> List[str]:
        return [p.strip().lower() for p in self.AI_PROVIDER_ORDER.split(",") if p.strip()]


settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
