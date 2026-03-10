"""
analytics.py
Route: GET /api/v1/analytics/{home_id}/patterns
Returns aggregated energy patterns for the visualizations.
"""

import uuid
import random
import math
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from typing import Any
import asyncpg

from core.dependencies import get_db_pool, get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _generate_heatmap_data(rows: list[dict]) -> list[dict]:
    """
    Returns last 90 days of daily heatmap entries.
    Uses real DB data where available, fills the rest with seeded mock values.
    """
    today = date.today()
    db_by_date = {r["log_date"].isoformat(): r for r in rows} if rows else {}

    APPLIANCE_NAMES = [
        "AC (1.5 Ton)", "Refrigerator", "Washing Machine",
        "Geyser", "TV", "Water Pump", "Ceiling Fans"
    ]

    result = []
    for i in range(89, -1, -1):
        d = today - timedelta(days=i)
        iso = d.isoformat()
        if iso in db_by_date:
            r = db_by_date[iso]
            result.append({
                "date": iso,
                "total_kwh": float(r.get("computed_kwh") or 8.0),
                "top_appliance": APPLIANCE_NAMES[0],
            })
        else:
            # Deterministic seed for this date so numbers don't change on refresh
            seed = sum(ord(c) for c in iso)
            rng = random.Random(seed)
            # Weekend bump
            is_weekend = d.weekday() >= 5
            base = rng.uniform(6.0, 9.5) if not is_weekend else rng.uniform(9.0, 14.0)
            result.append({
                "date": iso,
                "total_kwh": round(base, 2),
                "top_appliance": rng.choice(APPLIANCE_NAMES),
            })
    return result


def _generate_hourly_profile(heatmap: list[dict]) -> list[dict]:
    """
    Build a typical hourly profile. The DB stores daily totals not hourly,
    so we distribute each day's kWh over hours using a realistic shape.
    """
    # Usage shape weights (0-23h) — typical Indian household
    SHAPE = [
        0.01, 0.01, 0.01, 0.01, 0.02, 0.03,   # 0-5
        0.04, 0.06, 0.07, 0.05, 0.04, 0.04,   # 6-11
        0.05, 0.05, 0.04, 0.04, 0.05, 0.07,   # 12-17
        0.09, 0.09, 0.08, 0.06, 0.04, 0.02,   # 18-23
    ]
    total_weight = sum(SHAPE)
    shape_norm = [w / total_weight for w in SHAPE]

    avg_daily_kwh = sum(d["total_kwh"] for d in heatmap) / len(heatmap) if heatmap else 10.0

    return [
        {"hour": h, "avg_kwh": round(avg_daily_kwh * shape_norm[h], 3)}
        for h in range(24)
    ]


def _split_weekday_weekend(heatmap: list[dict]) -> tuple[float, float]:
    weekday_totals, weekend_totals = [], []
    for entry in heatmap:
        d = date.fromisoformat(entry["date"])
        if d.weekday() < 5:
            weekday_totals.append(entry["total_kwh"])
        else:
            weekend_totals.append(entry["total_kwh"])
    avg_weekday = round(sum(weekday_totals) / len(weekday_totals), 2) if weekday_totals else 8.5
    avg_weekend = round(sum(weekend_totals) / len(weekend_totals), 2) if weekend_totals else 11.2
    return avg_weekday, avg_weekend


def _build_monthly_daily_series(heatmap: list[dict]) -> list[dict]:
    """Cumulative kWh per day-of-month for the last 3 calendar months."""
    from collections import defaultdict
    monthly: dict[str, dict[int, float]] = defaultdict(dict)

    for entry in heatmap:
        d = date.fromisoformat(entry["date"])
        month_key = d.strftime("%Y-%m")
        day_of_month = d.day
        monthly[month_key][day_of_month] = entry["total_kwh"]

    result = []
    for month_key in sorted(monthly.keys())[-3:]:
        daily = monthly[month_key]
        sorted_days = sorted(daily.keys())
        cumulative = 0.0
        day_series = []
        for day in sorted_days:
            cumulative += daily[day]
            day_series.append({"day": day, "cumulative_kwh": round(cumulative, 2)})
        result.append({"month": month_key, "day_series": day_series})
    return result


@router.get("/{home_id}/patterns")
async def get_energy_patterns(
    home_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool),
    user_id: uuid.UUID = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Returns energy pattern data for all chart visualizations.
    Uses real usage_logs data where available and fills gaps with realistic mock data.
    """
    # Fetch last 90 days of usage logs for this home
    cutoff = date.today() - timedelta(days=90)
    try:
        async with db.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT ul.log_date, ul.computed_kwh, a.name as appliance_name
                FROM usage_logs ul
                JOIN appliances a ON ul.appliance_id = a.id
                JOIN homes h ON a.home_id = h.id
                WHERE h.id = $1 AND ul.log_date >= $2
                ORDER BY ul.log_date
                """,
                home_id, cutoff
            )
            db_rows = [dict(r) for r in rows]
    except Exception:
        db_rows = []

    heatmap = _generate_heatmap_data(db_rows)
    hourly_profile = _generate_hourly_profile(heatmap)
    weekday_avg, weekend_avg = _split_weekday_weekend(heatmap)
    monthly_series = _build_monthly_daily_series(heatmap)

    return {
        "daily_heatmap": heatmap,
        "hourly_profile": hourly_profile,
        "weekday_avg_kwh": weekday_avg,
        "weekend_avg_kwh": weekend_avg,
        "monthly_daily_series": monthly_series,
    }

@router.get("/{home_id}/overview")
async def get_overview_dashboard(
    home_id: uuid.UUID,
    db: asyncpg.Pool = Depends(get_db_pool)
) -> dict[str, Any]:
    """
    Returns aggregated data for the Overview Dashboard KPIs, Charts, and Widgets.
    In a real app, this combines usage logs, bills, alerts, and appliance data.
    """
    import random
    from datetime import date, timedelta
    
    # 1. KPIs
    current_month_kwh = 412.5
    estimated_bill = 2668.40
    efficiency_score = 82
    co2_kg = current_month_kwh * 0.82
    
    kpis = {
        "monthly_kwh": {"value": current_month_kwh, "change_pct": -5.2, "direction": "down"},
        "estimated_bill": {"value": estimated_bill, "change_pct": -4.1, "direction": "down"},
        "efficiency_score": {
            "value": efficiency_score, 
            "change_pct": 2.1, 
            "direction": "up",
            "subscores": {"efficiency": 85, "savings": 78, "sustainability": 83}
        },
        "co2_kg": {"value": co2_kg, "change_pct": -5.2, "direction": "down"}
    }
    
    # 2. Consumption History (last 30 days)
    today = date.today()
    consumption_history = []
    base_avg = 13.5
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        val = max(5.0, base_avg + random.uniform(-4, 5))
        # Simulated 7-day rolling avg
        rolling = val * random.uniform(0.9, 1.1)
        consumption_history.append({
            "date": d.isoformat(),
            "kwh": round(val, 1),
            "avg_7d": round(rolling, 1)
        })
        
    # 3. Category Breakdown
    categories = [
        {"name": "HVAC", "kwh": 180, "pct": 43.6, "color": "#3b82f6"},
        {"name": "Kitchen", "kwh": 95, "pct": 23.0, "color": "#f59e0b"},
        {"name": "Entertainment", "kwh": 45, "pct": 10.9, "color": "#8b5cf6"},
        {"name": "Lighting", "kwh": 35, "pct": 8.5, "color": "#10b981"},
        {"name": "Laundry", "kwh": 30, "pct": 7.3, "color": "#ec4899"},
        {"name": "Other", "kwh": 27.5, "pct": 6.7, "color": "#64748b"}
    ]
    
    # 4. Top Consumers
    top_consumers = [
        {"rank": 1, "name": "Samsung 1.5T AC (Master)", "kwh": 145.2, "cost": 850.50},
        {"rank": 2, "name": "LG Double Door Fridge", "kwh": 95.5, "cost": 510.30},
        {"rank": 3, "name": "V-Guard Water Heater", "kwh": 80.0, "cost": 450.20},
        {"rank": 4, "name": "Sony 55' OLED TV", "kwh": 45.0, "cost": 250.80},
        {"rank": 5, "name": "Washing Machine", "kwh": 30.0, "cost": 180.10}
    ]
    
    # 5. Recent Alerts
    try:
        async with db.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM alerts WHERE home_id = $1 ORDER BY triggered_at DESC LIMIT 5", home_id)
            alerts = [dict(row) for row in rows]
    except Exception:
        alerts = []
        
    if not alerts:
        alerts = [
            {"id": str(uuid.uuid4()), "severity": "warning", "message": "AC usage in Master Bedroom is 20% higher than usual today.", "triggered_at": (today - timedelta(days=1)).isoformat()},
            {"id": str(uuid.uuid4()), "severity": "info", "message": "Tariff changed to Off-Peak rates successfully.", "triggered_at": (today - timedelta(days=2)).isoformat()}
        ]

    return {
        "kpis": kpis,
        "consumption_history": consumption_history,
        "categories": categories,
        "top_consumers": top_consumers,
        "alerts": alerts
    }
