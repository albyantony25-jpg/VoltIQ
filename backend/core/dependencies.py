from fastapi import Depends
import asyncpg
import uuid
from core.database import db
from core.security import verify_token

async def get_db_pool():
    """Dependency to get the database connection pool. May return None if DB fails."""
    return db.pool

async def get_current_user(user_id: uuid.UUID = Depends(verify_token)) -> uuid.UUID:
    """Dependency to get the current authenticated user's ID."""
    return user_id
