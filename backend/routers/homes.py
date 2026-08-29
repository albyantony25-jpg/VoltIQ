from fastapi import APIRouter, Depends, HTTPException
import asyncpg
import uuid
from typing import List, Optional
from core.dependencies import get_db_pool, get_current_user
from models.home import HomeResponse, HomeCreate, HomeUpdate
from services.modeling_engine import ModelingEngine

# Explicit allowlist of columns that callers are permitted to update.
# Field names are injected directly into SQL as identifiers (not as values),
# so this must be maintained manually — never derived from model_dump() alone.
ALLOWED_HOME_UPDATE_FIELDS: frozenset[str] = frozenset({
    "name",
    "bedrooms",
    "occupants",
    "city",
    "home_type",
    "area_sqft",
    "tariff_id",
})

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

@router.patch("/{home_id}", response_model=HomeResponse, include_in_schema=True)
async def update_home(
    home_id: uuid.UUID,
    update_data: HomeUpdate,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Update home profile details."""
    async with db.acquire() as conn:
        # Check ownership
        home = await conn.fetchrow("SELECT * FROM homes WHERE id = $1 AND user_id = $2", home_id, user_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home not found")
        
        updates = []
        values = []
        for key, value in update_data.model_dump(exclude_unset=True).items():
            if key not in ALLOWED_HOME_UPDATE_FIELDS:
                raise HTTPException(
                    status_code=422,
                    detail=f"Field '{key}' is not updatable.",
                )
            updates.append(f"{key} = ${len(values) + 1}")
            values.append(value)
            
        if not updates:
            return dict(home)
            
        values.append(home_id)
        values.append(user_id)
        query = f"UPDATE homes SET {', '.join(updates)} WHERE id = ${len(values)-1} AND user_id = ${len(values)} RETURNING *"
        
        row = await conn.fetchrow(query, *values)
        return dict(row)

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
            # Verify ownership
            home = await conn.fetchrow(
                "SELECT id, tariff_id FROM homes WHERE id = $1 AND user_id = $2",
                home_id, current_user
            )
            if not home:
                raise HTTPException(status_code=404, detail="Home not found or unauthorized")

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
            
            total_kwh = 0
            by_category = {}
            top_consumers = []
            
            for a in appliances:
                monthly_kwh = ModelingEngine.calculate_appliance_monthly_kwh(dict(a))
                total_kwh += monthly_kwh
                
                cat = a["category"]
                by_category[cat] = by_category.get(cat, 0) + monthly_kwh
                
                top_consumers.append({
                    "name": a["name"],
                    "brand": a.get("brand", ""),
                    "monthly_kwh": round(monthly_kwh, 2),
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
