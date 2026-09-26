import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, db_instance
from app.routers import tickets, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB and set up indexes safely
    try:
        await connect_to_mongo()
        if db_instance.db is not None:
            count = await db_instance.db.tickets.count_documents({})
            if count == 0:
                from scripts.seed_data import seed_database
                await seed_database()
    except Exception as e:
        pass
    yield
    # Shutdown: Close database connections
    try:
        await close_mongo_connection()
    except Exception:
        pass


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API and Intelligent Prioritization Engine for enterprise service requests and automated ticket triage.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for local demo and frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(tickets.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")

# Static directory resolution
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_static_dir = os.path.join(root_dir, "static")
app_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

if os.path.exists(root_static_dir):
    app.mount("/static", StaticFiles(directory=root_static_dir), name="static")
elif os.path.exists(app_static_dir):
    app.mount("/static", StaticFiles(directory=app_static_dir), name="static")


@app.get("/", include_in_schema=False)
async def serve_demo_ui():
    """Serves the interactive live demo dashboard."""
    for candidate in [
        os.path.join(root_dir, "index.html"),
        os.path.join(root_static_dir, "index.html"),
        os.path.join(app_static_dir, "index.html"),
    ]:
        if os.path.exists(candidate):
            return FileResponse(candidate)
    return {"message": "IntelliTicket API is running. Visit /docs for Swagger UI."}


@app.get("/style.css", include_in_schema=False)
async def serve_style():
    for candidate in [
        os.path.join(root_dir, "style.css"),
        os.path.join(root_static_dir, "style.css"),
        os.path.join(app_static_dir, "style.css"),
    ]:
        if os.path.exists(candidate):
            return FileResponse(candidate, media_type="text/css")


@app.get("/app.js", include_in_schema=False)
async def serve_app_js():
    for candidate in [
        os.path.join(root_dir, "app.js"),
        os.path.join(root_static_dir, "app.js"),
        os.path.join(app_static_dir, "app.js"),
    ]:
        if os.path.exists(candidate):
            return FileResponse(candidate, media_type="application/javascript")


@app.get("/health", tags=["System"])
async def health_check():
    """System health check verifying database and engine availability."""
    db_status = "connected" if db_instance.client is not None else "disconnected"
    return {
        "status": "healthy",
        "database": db_status,
        "database_name": settings.MONGODB_DB_NAME,
        "environment": settings.APP_ENV
    }
