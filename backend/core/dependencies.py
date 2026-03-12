from fastapi import Depends
import asyncpg
import uuid
from core.database import db
from core.security import verify_token

async def get_db_pool():
    """Dependency to get the database connection pool. May return None if DB fails."""
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
