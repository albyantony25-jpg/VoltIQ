import uuid
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import List, Optional, Literal

class SlabResult(BaseModel):
    from_units: float = Field(alias="from")
    to_units: Optional[float] = Field(None, alias="to")
    units_consumed: float
    rate: float
    charge: float

class SlabBreakdown(BaseModel):
    slabs: List[SlabResult]
    total_energy_charge: float

class SlabConfig(BaseModel):
    from_units: float = Field(alias="from")
    to_units: Optional[float] = Field(None, alias="to")
    rate: float

class Tariff(BaseModel):
    id: str
    state: str
    provider: str
    fixed_charge_inr: float
    fuel_surcharge_pct: float
    electricity_duty_pct: float
    slab_config: List[SlabConfig]

class BillResult(BaseModel):
    energy_charge: SlabBreakdown
    fixed_charge_inr: float
    fuel_surcharge: float
    electricity_duty: float
    total_bill: float

class ApplianceCostAttribution(BaseModel):
    appliance_name: str
    monthly_kwh: float
    cost_inr: float
    pct_of_bill: float

class BillRecord(BaseModel):
    month: str
    amount: float

class BillTrend(BaseModel):
    month_over_month_change_pct: float
    three_month_average_inr: float
    six_month_average_inr: float
    highest_bill: Optional[BillRecord] = None
    lowest_bill: Optional[BillRecord] = None
    trend_direction: Literal['rising', 'falling', 'stable']

class BillPrediction(BaseModel):
    projected_units: float
    projected_amount: float
    confidence: float
    range_low: float
    range_high: float

class BillBase(BaseModel):
    billing_month: str
    units_consumed: float
    energy_charge_inr: float
    fixed_charge_inr: float
    fuel_surcharge_inr: float
    electricity_duty_inr: float
    total_amount_inr: float
    is_predicted: bool = False

class BillResponse(BillBase):
    id: uuid.UUID
    home_id: uuid.UUID
    tariff_id: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class SimulatePayload(BaseModel):
    total_units: float
    tariff_id: str
