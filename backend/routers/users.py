from fastapi import APIRouter, Depends, HTTPException
import asyncpg
import uuid
from pydantic import BaseModel
from typing import Optional
from core.dependencies import get_db_pool, get_current_user

router = APIRouter(prefix="/users", tags=["Users"], redirect_slashes=False)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None

@router.patch("/me", include_in_schema=True)
async def update_current_user(
    update_data: UserUpdate,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Update current user profile."""
    async with db.acquire() as conn:
        if update_data.full_name is not None:
            await conn.execute(
                "UPDATE users SET full_name = $1 WHERE id = $2",
                update_data.full_name, user_id
            )
        
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        return dict(row) if row else {"id": user_id, "full_name": update_data.full_name}

@router.get("/me", include_in_schema=True)
async def get_current_user_profile(
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Get current user profile."""
    async with db.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        if row:
            return dict(row)
        return {"id": user_id, "full_name": None}
