import uuid
import datetime
from fastapi import APIRouter, Depends
import asyncpg
from core.dependencies import get_db_pool
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/{home_id}/{month}/data")
@limiter.limit("10/month")
async def get_report_data(
    request: Request,
    home_id: uuid.UUID,
    month: str,
    db: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Returns a complete, pre-calculated payload representing the full Home Energy Report
    ready for PDF generation on the client-side.
    """
    # Mocking a rich analytics response exactly matching the frontend PDF requirements.
    # In a full deployment, this aggregates data from the `bills`, `appliances`, and `analytics` schemas
    return {
        "meta": {
            "home_name": "VoltIQ Residence",
            "month": month,
            "generated_at": datetime.datetime.now().strftime("%B %d, %Y"),
            "plan_tier": "Premium Analytics"
        },
        "summary": {
            "total_kwh": 482.5,
            "total_bill_inr": 3415.00,
            "efficiency_grade": "A",
            "mom_change_pct": -4.2,
            "co2_kg": 395,
            "sustainability_score": 88
        },
        "appliance_breakdown": [
            {"name": "Master Bedroom AC", "category": "HVAC", "monthly_kwh": 180, "cost_inr": 1260, "pct_of_bill": 37, "efficiency_class": "B"},
            {"name": "Living Room AC", "category": "HVAC", "monthly_kwh": 135, "cost_inr": 945, "pct_of_bill": 28, "efficiency_class": "A"},
            {"name": "Refrigerator", "category": "Kitchen", "monthly_kwh": 70, "cost_inr": 490, "pct_of_bill": 14, "efficiency_class": "A+"},
            {"name": "Water Heater", "category": "HVAC", "monthly_kwh": 55, "cost_inr": 385, "pct_of_bill": 11, "efficiency_class": "B+"}
        ],
        "category_breakdown": [
            {"category": "HVAC", "kwh": 315, "cost_inr": 2205, "pct": 65},
            {"category": "Kitchen", "kwh": 95, "cost_inr": 665, "pct": 19},
            {"category": "Lighting", "kwh": 40, "cost_inr": 280, "pct": 8},
            {"category": "Other", "kwh": 32.5, "cost_inr": 265, "pct": 8}
        ],
        "bill_detail": {
            "energy_charge": 2750,
            "fixed_charge": 300,
            "fuel_surcharge": 165,
            "duty": 200,
            "total": 3415,
            "slab_breakdown": [
                {"range": "0-100", "units": 100, "rate": 3.5, "charge": 350},
                {"range": "100-300", "units": 200, "rate": 5.0, "charge": 1000},
                {"range": "300+", "units": 182.5, "rate": 7.6, "charge": 1400}
            ]
        },
        "bill_history": [
            {"month": "Jul", "kwh": 580, "amount": 4200},
            {"month": "Aug", "kwh": 560, "amount": 4050},
            {"month": "Sep", "kwh": 510, "amount": 3650},
            {"month": "Oct", "kwh": 490, "amount": 3480},
            {"month": "Nov", "kwh": 465, "amount": 3200},
            {"month": "Dec", "kwh": 482.5, "amount": 3415}
        ],
        "ai_insights": {
            "anomalies": [
                "Water heater runtime has increased 15% compared to the historical baseline for this temperature."
            ],
            "top_recommendations": [
                {"action": "Increase AC target temp by 1°C overnight", "effort": 1, "saving": 1250, "payback": "Immediate"},
                {"action": "Replace Master AC with 5-star inverter unit", "effort": 4, "saving": 4800, "payback": "2.2 years"},
                {"action": "Install weather stripping on back door", "effort": 2, "saving": 650, "payback": "4 months"}
            ],
            "forecast": "Expected usage next month is 450 kWh costing around ₹3,100.",
            "efficiency_score_breakdown": "HVAC: 82/100, Kitchen: 95/100, Lighting: 88/100"
        },
        "heatmap_data": [
            {"date": f"{month}-{i:02d}", "kwh": round(10.0 + (i % 7)*1.5, 1)} for i in range(1, 31)
        ],
        "peer_comparison": {
            "user_kwh": 482.5,
            "peer_avg_kwh": 550.0,
            "percentile": 82,
            "city": "your region"
        }
    }
