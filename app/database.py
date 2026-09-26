import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger("uvicorn.error")

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_instance = Database()

async def connect_to_mongo():
    """Establish async MongoDB connection and ensure indexes."""
    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
        db_instance.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000
        )
        # Verify connection
        await db_instance.client.admin.command('ping')
        db_instance.db = db_instance.client[settings.MONGODB_DB_NAME]
        logger.info(f"Successfully connected to MongoDB database: '{settings.MONGODB_DB_NAME}'")
        
        # Ensure indexes for fast search and filtering
        await init_db_indexes()
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        logger.warning("Ensure MongoDB is running locally on port 27017 (e.g. net start MongoDB or mongod)")

async def close_mongo_connection():
    """Close MongoDB connection gracefully."""
    if db_instance.client:
        db_instance.client.close()
        logger.info("Closed MongoDB connection.")

def get_db() -> AsyncIOMotorDatabase:
    """Dependency / helper to get active database instance."""
    if db_instance.db is None and settings.MONGODB_URI:
        try:
            db_instance.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=4000
            )
            db_instance.db = db_instance.client[settings.MONGODB_DB_NAME]
        except Exception as e:
            logger.warning(f"Lazy DB connection warning: {e}")
    return db_instance.db

async def init_db_indexes():
    """Create essential MongoDB indexes for high-speed ticket filtering and priority queue querying."""
    if db_instance.db is None:
        return
    try:
        tickets = db_instance.db.tickets
        # Unique ticket ID
        await tickets.create_index("ticket_id", unique=True)
        # Compound index for priority queues
        await tickets.create_index([("priority", 1), ("priority_score", -1)])
        # Status & Category filters
        await tickets.create_index("status")
        await tickets.create_index("category")
        await tickets.create_index("sla.due_at")
        # Text search index for title and description
        await tickets.create_index([("title", "text"), ("description", "text")])
        logger.info("Database indexes successfully initialized.")
    except Exception as e:
        logger.warning(f"Index initialization notice: {e}")
