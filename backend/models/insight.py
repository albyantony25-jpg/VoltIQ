import uuid
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, Dict, Any

class InsightBase(BaseModel):
    insight_type: str
    title: str
    content: Dict[str, Any]
    confidence_score: float
    target_month: Optional[str] = None
    expires_at: Optional[datetime] = None

class InsightResponse(InsightBase):
    id: uuid.UUID
    home_id: uuid.UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
