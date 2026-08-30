import asyncpg
from core.config import settings
from typing import Optional
import asyncio
import logging
import ssl

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        sleep_times = [2, 5, 10]
        retries = len(sleep_times)
        for attempt in range(1, retries + 1):
            try:
                if not self.pool or getattr(self.pool, '_closed', True):
                    # asyncpg can conflict if sslmode=require is in the URL and ssl kwarg is passed
                    dsn = settings.DATABASE_URL
                    if "?" in dsn:
                        base, query = dsn.split("?", 1)
                        query_params = [p for p in query.split("&") if not p.startswith("sslmode=")]
                        dsn = f"{base}?{'&'.join(query_params)}" if query_params else base
                        
                    # Use a default SSL context which often resolves Render/Supabase TLS issues
                    ssl_context = ssl.create_default_context()
                    ssl_context.check_hostname = False
                    ssl_context.verify_mode = ssl.CERT_NONE

                    self.pool = await asyncpg.create_pool(
                        dsn=dsn,
                        min_size=2,
                        max_size=20,
                        command_timeout=30.0,
                        ssl=ssl_context
                    )
                return  # Success
            except Exception as e:
                logger.error(f"Warning: Could not connect to database (attempt {attempt}/{retries}). {e}")
                if attempt == retries:
                    self.pool = None
                else:
                    await asyncio.sleep(sleep_times[attempt - 1])

    async def disconnect(self):
        if self.pool:
            await self.pool.close()

db = Database()
