from fastapi import Depends, HTTPException, status
import asyncpg
import uuid
from core.database import db
from core.security import verify_token

import logging

logger = logging.getLogger(__name__)

async def get_db_pool():
    """Dependency to get the database connection pool. May return None if DB fails."""
    if db.pool is None or getattr(db.pool, '_closed', True):
        logger.warning("Database pool missing or closed. Attempting lazy reconnect...")
        await db.connect()
        if db.pool is not None and not getattr(db.pool, '_closed', True):
            logger.info("Successfully recovered database connection via lazy reconnect.")
        else:
            logger.error("Lazy reconnect failed. Still running in degraded mode.")

    if db.pool is None or getattr(db.pool, '_closed', True):
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable")
    return db.pool

async def get_current_user(user_id: uuid.UUID = Depends(verify_token), pool: asyncpg.Pool = Depends(get_db_pool)) -> uuid.UUID:
    """Dependency to get the current authenticated user's ID."""
    if pool:
        async with pool.acquire() as conn:
            # Ensure user exists in our local users table to satisfy foreign keys
            await conn.execute(
                "INSERT INTO users (id, created_at) VALUES ($1, now()) ON CONFLICT (id) DO NOTHING",
                user_id
            )
    return user_id
