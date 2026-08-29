import asyncpg
from core.config import settings
from typing import Optional
import asyncio
import logging

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        retries = 3
        for attempt in range(1, retries + 1):
            try:
                if not self.pool:
                    self.pool = await asyncpg.create_pool(
                        dsn=settings.DATABASE_URL,
                        min_size=2,
                        max_size=20,
                        command_timeout=30.0
                    )
                return  # Success
            except Exception as e:
                logger.error(f"Warning: Could not connect to database (attempt {attempt}/{retries}). {e}")
                if attempt == retries:
                    self.pool = None
                else:
                    await asyncio.sleep(2)

    async def disconnect(self):
        if self.pool:
            await self.pool.close()

db = Database()
