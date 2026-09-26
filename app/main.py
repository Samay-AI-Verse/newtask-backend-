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
    # Startup: Connect to MongoDB and set up indexes
    await connect_to_mongo()
    yield
    # Shutdown: Close database connections
    await close_mongo_connection()


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

# Mount Static Files for Demo UI
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/", include_in_schema=False)
async def serve_demo_ui():
    """Serves the interactive live demo dashboard."""
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "IntelliTicket API is running. Visit /docs for Swagger UI."}


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
