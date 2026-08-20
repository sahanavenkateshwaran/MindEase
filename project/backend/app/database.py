import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("uvicorn.error")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_helper = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB Atlas...")
    try:
        db_helper.client = AsyncIOMotorClient(settings.MONGODB_URI)
        db_helper.db = db_helper.client[settings.DATABASE_NAME]
        # Ping the server to ensure connection is valid
        await db_helper.client.admin.command('ping')
        logger.info("Successfully connected to MongoDB Atlas!")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        db_helper.client = None
        db_helper.db = None
        logger.warning("Continuing without MongoDB; API endpoints that require persistence will use fallback behavior.")

async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    if db_helper.client:
        db_helper.client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    return db_helper.db

# Collection accessor helpers
def get_collection(name: str):
    if db_helper.db is None:
        # Fallback or initialized lazy connection in case connect_to_mongo wasn't called yet (e.g. testing)
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        db_helper.client = client
        db_helper.db = client[settings.DATABASE_NAME]
    return db_helper.db[name]
