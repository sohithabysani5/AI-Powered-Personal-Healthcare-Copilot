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

from fastapi.responses import FileResponse

# Mount Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(doc_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")
app.include_router(demo_router, prefix="/api/v1")
app.include_router(assistant_router, prefix="/api/v1")


@app.get("/healthz")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.APP_ENV
    }


# Detect built frontend in local or docker environment
possible_dist_paths = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist")),
    "/app/frontend/dist"
]

frontend_dist_dir = next((p for p in possible_dist_paths if os.path.isdir(p)), None)

if frontend_dist_dir:
    assets_dir = os.path.join(frontend_dist_dir, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow access to direct files in dist (e.g., favicon.ico, manifest.json)
        target_file = os.path.join(frontend_dist_dir, full_path)
        if full_path and os.path.isfile(target_file):
            return FileResponse(target_file)
        # Default to index.html for React client-side routing
        return FileResponse(os.path.join(frontend_dist_dir, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "app": settings.APP_NAME,
            "status": "online",
            "version": "1.0.0",
            "docs_url": "/docs"
        }

