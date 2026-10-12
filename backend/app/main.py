"""FastAPI Main Application for AI-Powered Personal Health Copilot."""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.session import engine, Base
from app.models.all_models import *  # Ensure all tables are registered
from app.api.auth_routes import router as auth_router
from app.api.document_routes import router as doc_router
from app.api.health_routes import router as health_router
from app.api.demo_routes import router as demo_router
from app.api.assistant_routes import router as assistant_router

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Multilingual Platform for Intelligent Medical Record Analysis, Unified Health Profiles, and Journey Management.",
    version="1.0.0"
)

# CORS Middleware
cors_kwargs = {
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

if "*" in settings.cors_origins:
    cors_kwargs["allow_origins"] = ["*"]
    cors_kwargs["allow_credentials"] = False
else:
    cors_kwargs["allow_origins"] = settings.cors_origins
    cors_kwargs["allow_credentials"] = True
    cors_kwargs["allow_origin_regex"] = r"https://.*\.onrender\.com"

app.add_middleware(CORSMiddleware, **cors_kwargs)

# Mount Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(doc_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")
app.include_router(demo_router, prefix="/api/v1")
app.include_router(assistant_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


@app.get("/healthz")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.APP_ENV
    }
