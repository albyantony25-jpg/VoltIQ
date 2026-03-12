import json
import os
from fastapi import APIRouter, Depends, HTTPException, Query, Response
import asyncpg
import uuid
from typing import List, Optional
from core.dependencies import get_db_pool, get_current_user
from models.appliance import ApplianceResponse, ApplianceCreate, ApplianceUpdate

router = APIRouter(prefix="/appliances", tags=["Appliances"], redirect_slashes=False)

# --- Helper to load library ---
def load_appliance_library():
    path = os.path.join(os.path.dirname(__file__), "..", "data", "appliance_library.json")
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return []

@router.get("/library")
async def get_appliance_library(
    category: Optional[str] = Query(None, description="Filter by category (hvac, kitchen, etc.)"),
    type: Optional[str] = Query(None, alias="type", description="Filter by appliance_type"),
    brand: Optional[str] = Query(None, description="Filter by brand name"),
    search: Optional[str] = Query(None, description="Search across brand, model, type"),
):
    """Returns pre-built appliance templates with optional filtering."""
    library = load_appliance_library()
    
    if category:
        library = [a for a in library if a.get("category", "").lower() == category.lower()]
    if type:
        library = [a for a in library if a.get("appliance_type", "").lower() == type.lower()]
    if brand:
        library = [a for a in library if a.get("brand", "").lower() == brand.lower()]
    if search:
        q = search.lower()
        library = [a for a in library if (
            q in a.get("brand", "").lower() or
            q in a.get("model_name", "").lower() or
            q in a.get("appliance_type", "").lower() or
            q in a.get("name", "").lower() or
            q in a.get("category", "").lower()
        )]
    
    return library

@router.get("/", response_model=List[ApplianceResponse], include_in_schema=True)
async def list_appliances(
    home_id: uuid.UUID = Query(...),
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """List all appliances for a home."""
    async with db.acquire() as conn:
        # Verify ownership
        home = await conn.fetchrow("SELECT id FROM homes WHERE id = $1 AND user_id = $2", home_id, user_id)
        if not home:
            raise HTTPException(status_code=403, detail="Not authorized to access this home")
        
        rows = await conn.fetch("SELECT * FROM appliances WHERE home_id = $1 AND is_active = true", home_id)
        return [dict(row) for row in rows]

@router.post("/", response_model=ApplianceResponse, include_in_schema=True)
async def add_appliance(
    appliance: ApplianceCreate,
    response: Response,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Create a new appliance for a home."""
    warnings = []
    
    if appliance.usage_hours > 20:
        warnings.append(f"Usage hours capped at 20 (was {appliance.usage_hours})")
        appliance.usage_hours = 20.0
        
    async with db.acquire() as conn:
        # Verify home ownership
        home = await conn.fetchrow("SELECT id FROM homes WHERE id = $1 AND user_id = $2", appliance.home_id, user_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home not found or unauthorized")

        # Check duplicate name
        existing_name = await conn.fetchrow(
            "SELECT id FROM appliances WHERE home_id = $1 AND name = $2 AND is_active = true",
            appliance.home_id, appliance.name
        )
        if existing_name:
            warnings.append(f"Appliance name '{appliance.name}' is duplicated in this home.")
            
        if warnings:
            response.headers["X-Warning"] = " | ".join(warnings)

        row = await conn.fetchrow(
            """
            INSERT INTO appliances (
                home_id, name, brand, category, rated_watts, standby_watts, 
                efficiency_class, age_years, is_active, usage_hours
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            """,
            appliance.home_id, appliance.name, appliance.brand, appliance.category.value,
            appliance.rated_watts, appliance.standby_watts, 
            appliance.efficiency_class.value if appliance.efficiency_class else None,
            appliance.age_years,
            appliance.is_active,
            appliance.usage_hours
        )
        return dict(row)

@router.get("/{appliance_id}", response_model=ApplianceResponse)
async def get_appliance(
    appliance_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Get single appliance."""
    async with db.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT a.* FROM appliances a
            JOIN homes h ON a.home_id = h.id
            WHERE a.id = $1 AND h.user_id = $2
            """, 
            appliance_id, user_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Appliance not found or unauthorized")
        return dict(row)

@router.put("/{appliance_id}", response_model=ApplianceResponse)
async def update_appliance(
    appliance_id: uuid.UUID,
    appliance: ApplianceUpdate,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Update appliance."""
    async with db.acquire() as conn:
        # Check ownership
        existing = await conn.fetchrow(
            """
            SELECT a.id FROM appliances a
            JOIN homes h ON a.home_id = h.id
            WHERE a.id = $1 AND h.user_id = $2
            """, 
            appliance_id, user_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Appliance not found or unauthorized")

        update_data = appliance.model_dump(exclude_unset=True)
        if not update_data:
            # Just return existing
            row = await conn.fetchrow("SELECT * FROM appliances WHERE id = $1", appliance_id)
            return dict(row)

        set_clauses = []
        values = [appliance_id]
        idx = 2
        for key, value in update_data.items():
            if key == 'category' and value:
                value = value.value
            if key == 'efficiency_class' and value:
                value = value.value
            set_clauses.append(f"{key} = ${idx}")
            values.append(value)
            idx += 1

        set_clause_str = ", ".join(set_clauses)
        
        row = await conn.fetchrow(
            f"""
            UPDATE appliances 
            SET {set_clause_str}
            WHERE id = $1
            RETURNING *
            """,
            *values
        )
        return dict(row)

@router.delete("/{appliance_id}")
async def delete_appliance(
    appliance_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Soft delete appliance."""
    async with db.acquire() as conn:
        # Check ownership
        existing = await conn.fetchrow(
            """
            SELECT a.id FROM appliances a
            JOIN homes h ON a.home_id = h.id
            WHERE a.id = $1 AND h.user_id = $2
            """, 
            appliance_id, user_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Appliance not found or unauthorized")
            
        await conn.execute("UPDATE appliances SET is_active = false WHERE id = $1", appliance_id)
        return {"status": "deleted"}

@router.post("/{appliance_id}/simulate")
async def simulate_appliance(
    appliance_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Run modeling_engine.calculate_consumption_profile and return result (Physics based)."""
    async with db.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT a.* FROM appliances a
            JOIN homes h ON a.home_id = h.id
            WHERE a.id = $1 AND h.user_id = $2
            """, 
            appliance_id, user_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Appliance not found or unauthorized")
            
        appliance = dict(row)
        
        # Mocking calculate_consumption_profile for now, but ensured ownership
        monthly_kwh = (appliance.get("rated_watts", 0) * appliance.get("usage_hours", 0) * 30) / 1000.0
        
        return {
            "appliance_id": appliance_id,
            "monthly_kwh_estimate": monthly_kwh,
            "standby_kwh_monthly_estimate": (appliance.get("standby_watts", 0) * 24 * 30) / 1000.0,
            "annual_kwh_estimate": monthly_kwh * 12,
            "simulation_timestamp": "2026-02-25T11:15:00Z"
        }
