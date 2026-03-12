import uuid
import datetime
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import asyncpg
from core.dependencies import get_db_pool, get_current_user

router = APIRouter(prefix="/alerts", tags=["Alerts"], redirect_slashes=False)

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class AlertResponse(BaseModel):
    id: uuid.UUID
    home_id: uuid.UUID
    appliance_id: Optional[uuid.UUID]
    title: str
    message: str
    severity: str # "CRITICAL", "WARNING", "INFO"
    category: str # "ANOMALY", "THRESHOLD", "MAINTENANCE"
    is_read: bool
    triggered_at: datetime.datetime

class CheckAlertsResponse(BaseModel):
    new_alerts_count: int
    message: str

# ---------------------------------------------------------------------------
# Helper: Insert Alert
# ---------------------------------------------------------------------------
async def create_alert(conn, home_id: uuid.UUID, title: str, message: str, severity: str, category: str, appliance_id: Optional[uuid.UUID] = None):
    alert_id = uuid.uuid4()
    await conn.execute("""
        INSERT INTO alerts (id, home_id, appliance_id, title, message, severity, category, is_read, triggered_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false, now())
    """, alert_id, home_id, appliance_id, title, message, severity, category)
    return alert_id


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/home/{home_id}", response_model=List[AlertResponse])
async def get_alerts(
    home_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Get active alerts for a home."""
    async with db.acquire() as conn:
        # Verify home ownership
        home = await conn.fetchrow("SELECT id FROM homes WHERE id = $1 AND user_id = $2", home_id, user_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home not found or unauthorized")
            
        rows = await conn.fetch("SELECT * FROM alerts WHERE home_id = $1 ORDER BY triggered_at DESC", home_id)
        return [dict(r) for r in rows]


@router.patch("/{alert_id}/read")
async def mark_alert_read(
    alert_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Mark an alert as read."""
    async with db.acquire() as conn:
        # Check ownership via home join
        alert = await conn.fetchrow("""
            SELECT a.id FROM alerts a
            JOIN homes h ON a.home_id = h.id
            WHERE a.id = $1 AND h.user_id = $2
        """, alert_id, user_id)
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found or unauthorized")

        await conn.execute("UPDATE alerts SET is_read = true WHERE id = $1", alert_id)
        return {"status": "success"}


@router.patch("/home/{home_id}/read-all")
async def mark_all_alerts_read(
    home_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """Mark all alerts in a home as read."""
    async with db.acquire() as conn:
        # Verify ownership
        home = await conn.fetchrow("SELECT id FROM homes WHERE id = $1 AND user_id = $2", home_id, user_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home not found or unauthorized")

        await conn.execute("UPDATE alerts SET is_read = true WHERE home_id = $1", home_id)
        return {"status": "success"}


@router.post("/home/{home_id}/check", response_model=CheckAlertsResponse)
async def run_anomaly_check(
    home_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user)
):
    """
    Simulates a background cron job scanning current real-time usage metrics against historical baselines.
    Generates new alerts if thresholds are breached.
    """
    async with db.acquire() as conn:
        # Verify ownership
        home = await conn.fetchrow("SELECT id FROM homes WHERE id = $1 AND user_id = $2", home_id, user_id)
        if not home:
            raise HTTPException(status_code=404, detail="Home not found or unauthorized")

    new_alerts = 0
    
    async with db.acquire() as conn:
        # Get appliances
        appliances = await conn.fetch("SELECT id, name, category, rated_watts FROM appliances WHERE home_id = $1 AND is_active = true", home_id)
        
        # 1. Random Anomaly Check (HVAC continuous running)
        hvacs = [a for a in appliances if a.get('category') and a['category'].lower() == 'hvac']
        if hvacs and random.random() > 0.4:  # 60% chance to mock an anomaly for demo
            hvac = random.choice(hvacs)
            
            # Check if we already alerted this recently to prevent spam
            recent = await conn.fetchval("""
                SELECT COUNT(*) FROM alerts 
                WHERE appliance_id = $1 AND category = 'ANOMALY' 
                AND triggered_at > now() - interval '24 hours'
            """, hvac['id'])
            
            if recent == 0:
                await create_alert(
                    conn, home_id,
                    title="Continuous HVAC Running",
                    message=f"Your '{hvac['name']}' has been running continuously for 6 hours. Consider turning it off to save energy.",
                    severity="WARNING",
                    category="ANOMALY",
                    appliance_id=hvac['id']
                )
                new_alerts += 1

        # 2. Daily Threshold Breach
        # Mock logic: assume daily threshold is 15 kWh. We'll hit it randomly.
        if random.random() > 0.7:
            await create_alert(
                conn, home_id,
                title="Daily Target Exceeded",
                message="You have consumed 16.2 kWh today, exceeding your daily target of 15 kWh.",
                severity="INFO",
                category="THRESHOLD"
            )
            new_alerts += 1
            
        # 3. Phantom Load Detection
        if appliances and random.random() > 0.8:
            tv = next((a for a in appliances if a.get('category') and a['category'].lower() == 'entertainment'), appliances[0])
            await create_alert(
                conn, home_id,
                title="Vampire Drain Detected",
                message=f"'{tv['name']}' is drawing 12W on standby. Unplug it to save ₹120/year.",
                severity="INFO",
                category="MAINTENANCE",
                appliance_id=tv['id']
            )
            new_alerts += 1
            
    return {"new_alerts_count": new_alerts, "message": f"Scan complete. {new_alerts} new anomalies detected."}
