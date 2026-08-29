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
                    # asyncpg can conflict if sslmode=require is in the URL and ssl kwarg is passed
                    dsn = settings.DATABASE_URL
                    if "?" in dsn:
                        base, query = dsn.split("?", 1)
                        query_params = [p for p in query.split("&") if not p.startswith("sslmode=")]
                        dsn = f"{base}?{'&'.join(query_params)}" if query_params else base
                        
                    self.pool = await asyncpg.create_pool(
                        dsn=dsn,
                        min_size=2,
                        max_size=20,
                        command_timeout=30.0,
                        ssl="require"
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
