import uuid
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class HomeBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    bedrooms: int = Field(..., ge=1, le=20)
    occupants: int = Field(..., ge=1, le=30)
    city: Optional[str] = None
    home_type: Optional[str] = None
    area_sqft: Optional[float] = Field(None, ge=100)

class HomeCreate(HomeBase):
    pass

class HomeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    bedrooms: Optional[int] = Field(None, ge=1, le=20)
    occupants: Optional[int] = Field(None, ge=1, le=30)
    city: Optional[str] = None
    home_type: Optional[str] = None
    area_sqft: Optional[float] = Field(None, ge=100)

class HomeResponse(HomeBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
