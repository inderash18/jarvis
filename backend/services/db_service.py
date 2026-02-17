from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings
from core.logging import log

class DatabaseService:
    client: AsyncIOMotorClient = None
    db = None

    async def connect_to_database(self):
        log.info("Connecting to MongoDB...")
        self.client = AsyncIOMotorClient(settings.MONGODB_URL)
        self.db = self.client[settings.DATABASE_NAME]
        log.info("Connected to MongoDB!")

    async def close_database_connection(self):
        log.info("Closing MongoDB connection...")
        self.client.close()
        log.info("MongoDB connection closed!")

db_service = DatabaseService()

async def get_database():
    return db_service.db
