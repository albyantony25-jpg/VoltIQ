"""
insights.py
Routes:
  POST /api/v1/insights/generate          → run full AI pipeline
  GET  /api/v1/insights/{home_id}         → return cached bundle
  GET  /api/v1/insights/{home_id}/anomalies
  GET  /api/v1/insights/{home_id}/recommendations
"""

import json
import uuid
from datetime import datetime
from typing import Any

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

from core.dependencies import get_db_pool, get_current_user
from services.ai_service import generate_monthly_insights, InsightBundle

router = APIRouter(prefix="/insights", tags=["AI Insights"], redirect_slashes=False)


class GenerateRequest(BaseModel):
    home_id: str
    target_month: str   # format: YYYY-MM


# -----------------------------------------------------------------------
# POST /insights/generate
# -----------------------------------------------------------------------
@router.post("/generate", response_model=InsightBundle)
@limiter.limit("5/hour")
async def generate_insights(
    request: Request,
    body: GenerateRequest,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user),
) -> InsightBundle:
    """Trigger the full multi-agent AI pipeline and return the InsightBundle."""
    async with db.acquire() as conn:
        # Verify ownership
        home = await conn.fetchrow("SELECT id FROM homes WHERE id = $1 AND user_id = $2", uuid.UUID(body.home_id), user_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home not found or unauthorized")
            
    return await generate_monthly_insights(body.home_id, body.target_month, db)


# -----------------------------------------------------------------------
# GET /insights/{home_id}  — return latest cached bundle (if not expired)
# -----------------------------------------------------------------------
@router.get("/{home_id}", response_model=InsightBundle | None)
async def get_cached_insights(
    home_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user),
) -> InsightBundle | None:
    """Return the most recent non-expired insight bundle from cache."""
    async with db.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT ai.content FROM ai_insights ai
            JOIN homes h ON ai.home_id = h.id
            WHERE ai.home_id = $1 AND h.user_id = $2
              AND ai.insight_type = 'forecast'
              AND (ai.expires_at IS NULL OR ai.expires_at > NOW())
            ORDER BY ai.created_at DESC
            LIMIT 1
            """,
            home_id, user_id
        )
    if not row:
        return None
    try:
        data = json.loads(row["content"])
        return InsightBundle(**data)
    except Exception:
        return None


# -----------------------------------------------------------------------
# GET /insights/{home_id}/anomalies
# -----------------------------------------------------------------------
@router.get("/{home_id}/anomalies")
async def get_anomalies(
    home_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user),
) -> dict[str, Any]:
    bundle = await get_cached_insights(home_id, db, user_id)
    if bundle is None:
        return {"anomalies": []}
    return {"anomalies": [a.model_dump() for a in bundle.anomalies]}


# -----------------------------------------------------------------------
# GET /insights/{home_id}/recommendations
# -----------------------------------------------------------------------
@router.get("/{home_id}/recommendations")
async def get_recommendations(
    home_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user),
) -> dict[str, Any]:
    bundle = await get_cached_insights(home_id, db, user_id)
    if bundle is None:
        return {"recommendations": []}
    return {"recommendations": [r.model_dump() for r in bundle.recommendations]}
