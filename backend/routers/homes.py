from fastapi import APIRouter, Depends, HTTPException
import asyncpg
import uuid
from typing import List
from core.dependencies import get_db_pool, get_current_user
from models.home import HomeResponse, HomeCreate

router = APIRouter(prefix="/homes", tags=["Homes"], redirect_slashes=False)

@router.get("/", response_model=List[HomeResponse], include_in_schema=True)
async def get_user_homes(
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Get all homes belonging to the authenticated user."""
    async with db.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM homes WHERE user_id = $1", user_id)
        return [dict(row) for row in rows]

@router.post("/", response_model=HomeResponse, include_in_schema=True)
async def create_home(
    home: HomeCreate,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Create a new home profile for the user."""
    async with db.acquire() as conn:
        # Resolve tariff_id: if it's not a valid UUID, look up by state name or id
        tariff_uuid = None
        if home.tariff_id:
            # Try to parse as UUID first
            try:
                tariff_uuid = uuid.UUID(str(home.tariff_id))
            except (ValueError, AttributeError):
                # Not a UUID — look up tariff by matching state code or name
                tariff_row = await conn.fetchrow(
                    """
                    SELECT id FROM tariffs 
                    WHERE state ILIKE $1 
                       OR name ILIKE $2
                    LIMIT 1
                    """,
                    str(home.tariff_id),
                    f"%{home.tariff_id}%"
                )
                if tariff_row:
                    tariff_uuid = tariff_row["id"]

        row = await conn.fetchrow(
            """
            INSERT INTO homes (user_id, name, bedrooms, occupants, city, home_type, area_sqft, tariff_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            """,
            user_id, home.name, home.bedrooms, home.occupants,
            home.city, home.home_type, home.area_sqft, tariff_uuid
        )
        return dict(row)

@router.get("/{home_id}/dashboard")
async def get_home_dashboard(
    home_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    current_user = Depends(get_current_user)
):
    try:
        async with db.acquire() as conn:
            # Get appliances for this home
            appliances = await conn.fetch(
                "SELECT * FROM appliances WHERE home_id = $1 AND is_active = true",
                home_id
            )
            
            if not appliances:
                return {
                    "has_appliances": False,
                    "total_monthly_kwh": 0,
                    "total_bill_inr": 0,
                    "efficiency_score": 0,
                    "co2_kg": 0,
                    "sustainability_score": 0,
                    "by_category": {},
                    "top_consumers": [],
                    "appliance_count": 0,
                    "summary": {
                        "total_monthly_kwh": 0,
                        "by_category": {},
                        "top_consumers": []
                    },
                    "projected_bill": 0,
                    "home_score": 0
                }
            
            # Calculate per appliance
            load_factors = {
                "hvac": 0.65, "kitchen": 0.90,
                "entertainment": 0.70, "lighting": 1.0,
                "laundry": 0.85, "ev": 0.90, "other": 0.85
            }
            
            total_kwh = 0
            by_category = {}
            top_consumers = []
            
            for a in appliances:
                lf = load_factors.get(a["category"], 0.85)
                age = a.get("age_years", 0) or 0
                age_penalty = 1 + (age * 0.02)
                hours = a.get("usage_hours_per_day", 
                              a.get("typical_usage_hours", 4)) or 4
                
                daily_kwh = (a["rated_watts"] * lf * 
                            hours * age_penalty) / 1000
                monthly_kwh = daily_kwh * 30
                total_kwh += monthly_kwh
                
                cat = a["category"]
                by_category[cat] = by_category.get(cat, 0) + monthly_kwh
                
                top_consumers.append({
                    "name": a["name"],
                    "brand": a.get("brand", ""),
                    "monthly_kwh": monthly_kwh,
                    "cost_inr": 0,
                    "pct": 0
                })
            
            # Calculate bill (simple slab)
            bill = 0
            units = total_kwh
            if units > 200:
                bill += (units - 200) * 7.40
                units = 200
            if units > 100:
                bill += (units - 100) * 5.75
                units = 100
            if units > 30:
                bill += (units - 30) * 3.40
                units = 30
            bill += 75  # fixed charge
            bill *= 1.13  # surcharge + duty
            
            # Calculate pct for top consumers
            for c in top_consumers:
                c["pct"] = (c["monthly_kwh"] / total_kwh * 100 
                           if total_kwh > 0 else 0)
                c["cost_inr"] = (c["monthly_kwh"] / total_kwh * bill 
                                if total_kwh > 0 else 0)
            
            top_consumers.sort(
                key=lambda x: x["monthly_kwh"], reverse=True
            )
            
            # Efficiency score
            eff_map = {
                "A+++": 100, "A++": 90, "A+": 80,
                "A": 70, "B": 55, "C": 40, "D": 25, "F": 10
            }
            scores = [eff_map.get(
                a.get("efficiency_class", "A"), 70
            ) for a in appliances]
            home_score = int(sum(scores) / len(scores)) if scores else 0
            
            return {
                "has_appliances": True,
                "appliance_count": len(appliances),
                "total_monthly_kwh": round(total_kwh, 2),
                "total_bill_inr": round(bill, 2),
                "efficiency_score": home_score,
                "co2_kg": round(total_kwh * 0.82, 2),
                "sustainability_score": min(100, home_score + 10),
                "by_category": {
                    k: round(v, 2) for k, v in by_category.items()
                },
                "top_consumers": top_consumers[:5],
                "summary": {
                    "total_monthly_kwh": round(total_kwh, 2),
                    "by_category": {
                        k: round(v, 2) 
                        for k, v in by_category.items()
                    },
                    "top_consumers": top_consumers[:5]
                },
                "projected_bill": round(bill, 2),
                "home_score": home_score
            }
    
    except Exception as e:
        print(f"Dashboard error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
