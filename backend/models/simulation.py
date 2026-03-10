import uuid
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import date

class ConsumptionProfile(BaseModel):
    daily_kwh: float
    weekly_kwh: float
    monthly_kwh: float
    annual_kwh: float
    cost_attribution_pct: float
    efficiency_score: int

class AnomalyResult(BaseModel):
    is_anomaly: bool
    deviation_pct: float
    expected_kwh: float
    actual_kwh: float
    severity: str

class SavingOpportunity(BaseModel):
    appliance_id: uuid.UUID
    appliance_name: str
    action_type: str
    annual_saving_kwh: float
    annual_saving_inr: float

class TopConsumer(BaseModel):
    appliance_name: str
    kwh: float
    pct_of_total: float

class HomeConsumptionSummary(BaseModel):
    total_daily_kwh: float
    total_monthly_kwh: float
    by_category: Dict[str, float]
    top_consumers: List[TopConsumer]
    anomalies: List[AnomalyResult]
    saving_opportunities: List[SavingOpportunity]

class UsageLog(BaseModel):
    id: uuid.UUID
    appliance_id: uuid.UUID
    log_date: date
    usage_hours: float
    computed_kwh: float
