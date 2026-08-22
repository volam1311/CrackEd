import os

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

_client: AsyncIOMotorClient | None = None


def get_mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
        _client = AsyncIOMotorClient(url)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    client = get_mongo_client()
    db_name = os.getenv("MONGO_DB", "cracked")
    return client[db_name]


async def close_mongo_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
