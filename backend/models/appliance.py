import uuid
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional

class ApplianceCategory(str, Enum):
    hvac = "hvac"
    kitchen = "kitchen"
    entertainment = "entertainment"
    lighting = "lighting"
    ev = "ev"
    laundry = "laundry"
    other = "other"

class EfficiencyClass(str, Enum):
    A_PLUS_PLUS_PLUS = "A+++"
    A_PLUS_PLUS = "A++"
    A_PLUS = "A+"
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    F = "F"
    G = "G"

class ApplianceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    brand: Optional[str] = None
    category: ApplianceCategory
    rated_watts: float = Field(..., ge=1, le=15000)
    standby_watts: float = Field(0, ge=0)
    efficiency_class: Optional[EfficiencyClass] = None
    age_years: int = Field(0, ge=0, le=100)
    is_active: bool = True
    usage_hours: float = Field(0, ge=0, le=24)

class ApplianceCreate(ApplianceBase):
    home_id: uuid.UUID

class ApplianceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    brand: Optional[str] = None
    category: Optional[ApplianceCategory] = None
    rated_watts: Optional[float] = Field(None, ge=1, le=15000)
    standby_watts: Optional[float] = Field(None, ge=0)
    efficiency_class: Optional[EfficiencyClass] = None
    age_years: Optional[int] = Field(None, ge=0, le=100)
    is_active: Optional[bool] = None

class ApplianceResponse(ApplianceBase):
    id: uuid.UUID
    home_id: uuid.UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
