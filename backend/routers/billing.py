import datetime
from fastapi import APIRouter, Depends, HTTPException
import asyncpg
import uuid
from typing import List, Dict, Any
from core.database import db
from core.dependencies import get_db_pool, get_current_user
from models.billing import BillResponse, BillResult, Tariff, SimulatePayload, BillPrediction, BillTrend
from services.billing_engine import (
    calculate_full_bill, get_tariff_by_id, load_tariffs, predict_month_bill, compute_bill_trend
)

router = APIRouter(prefix="/billing", tags=["billing"], redirect_slashes=False)

@router.get("/")
@router.get("")
async def list_all_tariffs_billing():
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
        # Verify ownership
        home = await conn.fetchrow("SELECT tariff_id FROM homes WHERE id = $1 AND user_id = $2", home_id, user_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home not found or unauthorized")
            
        # MOCK LOGIC: In a real system you'd calculate kwh_so_far from time-series logs
        days_elapsed = min(30, max(1, datetime.datetime.now().day)) 
        kwh_so_far = 0.0 # Default to 0 for fresh start
        
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
        # Verify ownership
        home = await conn.fetchrow("SELECT id FROM homes WHERE id = $1 AND user_id = $2", home_id, user_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home not found or unauthorized")

        rows = await conn.fetch("SELECT * FROM bills WHERE home_id = $1 ORDER BY billing_month DESC LIMIT 12", home_id)
        bills = [dict(row) for row in rows]
        trend = compute_bill_trend(bills)
        return {
            "history": bills,
            "trend": trend
        }

@router.get("/{home_id}/breakdown")
async def get_billing_breakdown(
    home_id: str,
    current_user = Depends(get_current_user)
):
    try:
        async with db.pool.acquire() as conn:
            # Get home and tariff
            home = await conn.fetchrow(
                "SELECT * FROM homes WHERE id = $1",
                home_id
            )
            if not home:
                raise HTTPException(status_code=404, 
                                   detail="Home not found")
            
            # Get appliances
            appliances = await conn.fetch(
                """SELECT * FROM appliances 
                   WHERE home_id = $1 AND is_active = true""",
                home_id
            )
            
            if not appliances:
                return {
                    "total_kwh": 0,
                    "total_bill_inr": 0,
                    "bill_components": {
                        "energy": 0, "fixed": 0,
                        "surcharge": 0, "duty": 0
                    },
                    "slab_breakdown": [],
                    "per_appliance": [],
                    "per_category": []
                }
            
            # Get tariff
            tariff = await conn.fetchrow(
                "SELECT * FROM tariffs WHERE id::text = $1",
                str(home['tariff_id'])
            )
            
            # Calculate per appliance
            load_factors = {
                "hvac": 0.65, "kitchen": 0.90,
                "entertainment": 0.70, "lighting": 1.0,
                "laundry": 0.85, "ev": 0.90, "other": 0.85
            }
            
            total_kwh = 0
            per_appliance = []
            per_category = {}
            
            for a in appliances:
                lf = load_factors.get(a["category"], 0.85)
                age = a.get("age_years", 0) or 0
                age_penalty = 1 + (age * 0.02)
                hours = a.get("usage_hours_per_day",
                              a.get("typical_usage_hours", 4)) or 4
                monthly_kwh = (
                    a["rated_watts"] * lf * hours * 
                    age_penalty * 30
                ) / 1000
                total_kwh += monthly_kwh
                
                cat = a["category"]
                per_category[cat] = (
                    per_category.get(cat, 0) + monthly_kwh
                )
                
                per_appliance.append({
                    "appliance_id": str(a["id"]),
                    "name": a["name"],
                    "brand": a.get("brand", ""),
                    "category": cat,
                    "monthly_kwh": round(monthly_kwh, 2),
                    "cost_inr": 0,
                    "pct_of_total": 0,
                    "efficiency_class": a.get(
                        "efficiency_class", "A"
                    )
                })
            
            # Calculate bill using slab rates
            # Use tariff slab_config if available
            # else use default Karnataka BESCOM rates
            units = total_kwh
            energy_charge = 0
            slab_breakdown = []
            
            if tariff and tariff.get('slab_config'):
                import json
                slabs = json.loads(tariff['slab_config']) if isinstance(tariff['slab_config'], str) else tariff['slab_config']
                remaining = units
                for slab in slabs:
                    from_u = slab.get('from', 0)
                    to_u = slab.get('to')
                    rate = slab.get('rate', 0)
                    if to_u is None:
                        slab_units = remaining
                    else:
                        slab_units = min(
                            remaining, 
                            (to_u - from_u)
                        )
                    if slab_units <= 0:
                        break
                    charge = slab_units * rate
                    energy_charge += charge
                    slab_breakdown.append({
                        "slab": f"{from_u}-{to_u or '∞'}",
                        "units": round(slab_units, 2),
                        "rate": rate,
                        "charge": round(charge, 2)
                    })
                    remaining -= slab_units
            else:
                # Default BESCOM rates
                remaining = units
                default_slabs = [
                    (0, 30, 0), (30, 100, 3.40),
                    (100, 200, 5.75), (200, None, 7.40)
                ]
                for from_u, to_u, rate in default_slabs:
                    if remaining <= 0:
                        break
                    slab_units = min(
                        remaining,
                        (to_u - from_u) if to_u else remaining
                    )
                    charge = slab_units * rate
                    energy_charge += charge
                    slab_breakdown.append({
                        "slab": f"{from_u}-{to_u or '∞'}",
                        "units": round(slab_units, 2),
                        "rate": rate,
                        "charge": round(charge, 2)
                    })
                    remaining -= slab_units
            
            fixed = float(
                tariff['fixed_charge_inr']
            ) if tariff else 75.0
            surcharge_pct = float(
                tariff['fuel_surcharge_pct']
            ) if tariff else 0.08
            duty_pct = float(
                tariff['electricity_duty_pct']
            ) if tariff else 0.05
            
            surcharge = energy_charge * surcharge_pct
            duty = (energy_charge + surcharge) * duty_pct
            total_bill = energy_charge + fixed + surcharge + duty
            
            # Assign cost to each appliance
            for a in per_appliance:
                a["cost_inr"] = round(
                    (a["monthly_kwh"] / total_kwh * total_bill)
                    if total_kwh > 0 else 0, 2
                )
                a["pct_of_total"] = round(
                    (a["monthly_kwh"] / total_kwh * 100)
                    if total_kwh > 0 else 0, 2
                )
            
            per_appliance.sort(
                key=lambda x: x["cost_inr"], reverse=True
            )
            
            per_cat_list = [
                {
                    "category": cat,
                    "kwh": round(kwh, 2),
                    "cost_inr": round(
                        kwh / total_kwh * total_bill
                        if total_kwh > 0 else 0, 2
                    ),
                    "pct": round(
                        kwh / total_kwh * 100
                        if total_kwh > 0 else 0, 2
                    )
                }
                for cat, kwh in per_category.items()
            ]
            
            return {
                "total_kwh": round(total_kwh, 2),
                "total_bill_inr": round(total_bill, 2),
                "bill_components": {
                    "energy": round(energy_charge, 2),
                    "fixed": round(fixed, 2),
                    "surcharge": round(surcharge, 2),
                    "duty": round(duty, 2)
                },
                "slab_breakdown": slab_breakdown,
                "per_appliance": per_appliance,
                "per_category": per_cat_list
            }
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=str(e)
        )


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
        # Verify ownership
        home = await conn.fetchrow("SELECT tariff_id FROM homes WHERE id = $1 AND user_id = $2", home_id, user_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home not found or unauthorized")

        row = await conn.fetchrow(
            "SELECT * FROM bills WHERE home_id = $1 AND billing_month = $2", 
            home_id, month
        )
        if not row:
             raise HTTPException(status_code=404, detail="Bill record not found for this month")
             
        units = row["units_consumed"]
        
        # Determine tariff
        t_id = home.get("tariff_id") or "MAH-01"
        try:
             tariff = get_tariff_by_id(t_id)
        except ValueError:
             tariff = get_tariff_by_id("MAH-01")
        
        return calculate_full_bill(str(home_id), month, tariff, units)
