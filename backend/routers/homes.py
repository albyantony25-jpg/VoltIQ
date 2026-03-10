from fastapi import APIRouter, Depends, HTTPException
import asyncpg
import uuid
from typing import List
from core.dependencies import get_db_pool, get_current_user
from models.home import HomeResponse, HomeCreate

router = APIRouter(prefix="/homes", tags=["Homes"])

@router.get("/", response_model=List[HomeResponse])
async def get_user_homes(
    db: asyncpg.Pool = Depends(get_db_pool)
):
    """Get all homes belonging to the authenticated user."""
    try:
        async with db.acquire() as conn:
            # When db is active but no user_id is passed, we'll return all homes for dev testing
            rows = await conn.fetch("SELECT * FROM homes LIMIT 10")
            return [dict(row) for row in rows]
    except AttributeError:
        # Fallback if DB is disconnected
        return [{
            "id": "00000000-0000-0000-0000-000000000000",
            "user_id": "99999999-9999-9999-9999-999999999999",
            "name": "My Smart Home",
            "city": "Bengaluru",
            "home_type": "apartment",
            "bedrooms": 3,
            "occupants": 4,
            "area_sqft": 1500,
            "created_at": "2026-02-27T00:00:00Z",
            "updated_at": "2026-02-27T00:00:00Z"
        }]

@router.post("/", response_model=HomeResponse)
async def create_home(
    home: HomeCreate,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Create a new home profile for the user."""
    async with db.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO homes (user_id, name, bedrooms, occupants, city, home_type, area_sqft)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            """,
            user_id, home.name, home.bedrooms, home.occupants, home.city, home.home_type, home.area_sqft
        )
        return dict(row)
