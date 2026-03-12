from fastapi import APIRouter, Depends
import asyncpg
import uuid
from core.dependencies import get_db_pool, get_current_user
from services.modeling_engine import ModelingEngine
from pydantic import BaseModel
from typing import List, Optional
import datetime

class TwinApplianceChange(BaseModel):
    appliance_id: uuid.UUID
    new_usage_hours: Optional[float] = None
    new_efficiency_class: Optional[str] = None
    remove: bool = False

class TwinAddAppliance(BaseModel):
    name: str
    category: str
    rated_watts: float
    usage_hours: float
    standby_watts: float = 0.0
    age_years: float = 0.0
    efficiency_class: str = "A"

class TwinSimulationRequest(BaseModel):
    home_id: uuid.UUID
    scenario_name: str
    changes: List[TwinApplianceChange] = []
    add_appliances: List[TwinAddAppliance] = []
    add_solar_kwp: Optional[float] = None
    target_months: int = 1

router = APIRouter(prefix="/simulation", tags=["Simulation"], redirect_slashes=False)

@router.post("/home/{home_id}")
async def run_home_simulation(
    home_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Triggers the modeling engine to simulate full household usage, verifying ownership."""
    async with db.acquire() as conn:
        home = await conn.fetchrow("SELECT id FROM homes WHERE id = $1 AND user_id = $2", home_id, user_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home not found or unauthorized")
            
    engine = ModelingEngine(db)
    await engine.simulate_home_usage(home_id)
    return {"status": "Simulation triggered for home", "home_id": home_id}

@router.post("/twin")
async def simulate_digital_twin(
    req: TwinSimulationRequest,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """
    Evaluates 'What-If' scenarios by modifying home configurations on-the-fly and running the engine.
    """
    async with db.acquire() as conn:
        # Verify ownership
        home = await conn.fetchrow("SELECT id FROM homes WHERE id = $1 AND user_id = $2", req.home_id, user_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home not found or unauthorized")
        
        appliances_rows = await conn.fetch("SELECT * FROM appliances WHERE home_id = $1 AND is_active = true", req.home_id)
        
    baseline_kwh = 0.0
    simulated_kwh = 0.0

    # Simplified mock simulation engine for the twin logic calculation
    # In full production, this maps into ModelingEngine.simulate_home_total()
    for row in appliances_rows:
        base_kwh = (row['rated_watts'] * row['usage_hours'] * 30) / 1000.0
        baseline_kwh += base_kwh
        
        # Check if modified
        change = next((c for c in req.changes if c.appliance_id == row['id']), None)
        if change and change.remove:
            continue
            
        uh = change.new_usage_hours if change and change.new_usage_hours is not None else row['usage_hours']
        eff_mult = 0.7 if (change and change.new_efficiency_class and change.new_efficiency_class != row['efficiency_class']) else 1.0
        
        sim_kwh = (row['rated_watts'] * eff_mult * uh * 30) / 1000.0
        simulated_kwh += sim_kwh

    for new_app in req.add_appliances:
        simulated_kwh += (new_app.rated_watts * new_app.usage_hours * 30) / 1000.0

    # Solar overlay
    solar_kwh = 0.0
    if req.add_solar_kwp:
        solar_kwh = req.add_solar_kwp * 4.5 * 30
        simulated_kwh = max(0, simulated_kwh - solar_kwh)

    TARIFF = 7.5
    baseline_bill = baseline_kwh * TARIFF
    simulated_bill = simulated_kwh * TARIFF

    kwh_saved = baseline_kwh - simulated_kwh
    money_saved_inr = baseline_bill - simulated_bill
    
    # Calculate simple ROI if Investment is made (e.g., Solar)
    roi_months = None
    if req.add_solar_kwp and req.add_solar_kwp > 0 and money_saved_inr > 0:
        cost = req.add_solar_kwp * 60000  # Rs 60k per kWp
        roi_months = cost / money_saved_inr
        
    mbm = []
    base_month = datetime.datetime.now().month
    for i in range(req.target_months):
        m = (base_month + i) % 12 or 12
        mbm.append({
            "month": datetime.date(2026, m, 1).strftime("%b"),
            "baseline_kwh": round(baseline_kwh, 1),
            "simulated_kwh": round(simulated_kwh, 1),
            "saving_inr": round(money_saved_inr, 1)
        })

    return {
        "baseline": { "monthly_kwh": round(baseline_kwh, 1), "monthly_bill_inr": round(baseline_bill, 1), "efficiency_score": 65 },
        "simulated": { "monthly_kwh": round(simulated_kwh, 1), "monthly_bill_inr": round(simulated_bill, 1), "efficiency_score": min(98, 65 + int((kwh_saved/max(1, baseline_kwh))*50)) },
        "delta": { 
            "kwh_saved": round(kwh_saved, 1), 
            "money_saved_inr": round(money_saved_inr, 1), 
            "score_improvement": min(33, int((kwh_saved/max(1, baseline_kwh))*50)), 
            "co2_saved_kg": round((kwh_saved * 0.82), 1) 
        },
        "annual_projection": { 
            "total_saving_inr": round(money_saved_inr * 12, 1), 
            "roi_months_if_investment": round(roi_months, 1) if roi_months else None
        },
        "month_by_month": mbm,
        "recommendations": [
            f"Adding {req.add_solar_kwp}kWp solar will cover {(solar_kwh/max(1, baseline_kwh))*100:.0f}% of your energy needs" if req.add_solar_kwp else "Consider adding a 5kWp solar unit to wipe out this bill entirely.",
            f"Upgrading your oldest ACs could save another ₹15,000 yearly."
        ]
    }
