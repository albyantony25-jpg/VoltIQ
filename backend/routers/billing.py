import datetime
from fastapi import APIRouter, Depends, HTTPException
import asyncpg
import uuid
from typing import List, Dict, Any
from core.dependencies import get_db_pool, get_current_user
from models.billing import BillResponse, BillResult, Tariff, SimulatePayload, BillPrediction, BillTrend
from services.billing_engine import (
    calculate_full_bill, get_tariff_by_id, load_tariffs, predict_month_bill, compute_bill_trend
)

# Prefix is empty / partially empty, because app.include_router handles the `/api/v1`
router = APIRouter(prefix="/billing", tags=["Billing"])

@router.get("/tariffs", response_model=List[Tariff])
async def list_tariffs():
    """List all available tariffs (public)."""
    return load_tariffs()

@router.post("/simulate", response_model=BillResult)
async def simulate_bill(
    payload: SimulatePayload
):
    """Run billing simulation from payload (no DB write)."""
    try:
         tariff = get_tariff_by_id(payload.tariff_id)
    except ValueError:
         raise HTTPException(status_code=400, detail="Invalid tariff_id")
         
    return calculate_full_bill("simulation", "simulation", tariff, payload.total_units)

@router.get("/{home_id}/predict", response_model=BillPrediction)
async def predict_current_month_bill(
    home_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Predict current month's final bill."""
    async with db.acquire() as conn:
        home = await conn.fetchrow("SELECT tariff_id FROM homes WHERE id = $1", home_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home not found")
            
        # MOCK LOGIC: In a real system you'd calculate kwh_so_far from time-series logs
        days_elapsed = min(30, max(1, datetime.datetime.now().day)) 
        kwh_so_far = 150.0  
        
        t_id = home.get("tariff_id") or "MAH-01"
        try:
             tariff = get_tariff_by_id(t_id)
        except ValueError:
             tariff = get_tariff_by_id("MAH-01") # fallback
        
        return predict_month_bill(str(home_id), days_elapsed, kwh_so_far, tariff)

@router.get("/{home_id}/history")
async def get_home_bills_history(
    home_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Retrieve billing history and trends for a given home."""
    async with db.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM bills WHERE home_id = $1 ORDER BY billing_month DESC LIMIT 12", home_id)
        bills = [dict(row) for row in rows]
        trend = compute_bill_trend(bills)
        return {
            "history": bills,
            "trend": trend
        }

@router.get("/{home_id}/{month}", response_model=BillResult)
async def get_full_bill_breakdown(
    home_id: uuid.UUID,
    month: str,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Full bill breakdown for a month."""
    try:
        req_month = datetime.datetime.strptime(month, "%Y-%m").date()
        current_month = datetime.date.today().replace(day=1)
        if req_month.replace(day=1) > current_month:
            raise HTTPException(status_code=400, detail="Cannot generate bill for future month")
    except ValueError:
        pass  # ignore if format does not strictly match YYYY-MM
        
    async with db.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM bills WHERE home_id = $1 AND billing_month = $2", 
            home_id, month
        )
        if not row:
             raise HTTPException(status_code=404, detail="Bill record not found for this month")
             
        units = row["units_consumed"]
        
        # Determine tariff
        home = await conn.fetchrow("SELECT tariff_id FROM homes WHERE id = $1", home_id)
        t_id = home.get("tariff_id") or "MAH-01" if home else "MAH-01"
        try:
             tariff = get_tariff_by_id(t_id)
        except ValueError:
             tariff = get_tariff_by_id("MAH-01")
        
        return calculate_full_bill(str(home_id), month, tariff, units)
