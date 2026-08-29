from fastapi import APIRouter
from typing import List
from models.billing import Tariff
from services.billing_engine import load_tariffs

router = APIRouter(prefix="/tariffs", tags=["Tariffs"], redirect_slashes=False)

@router.get("/")
async def list_tariffs():
    """List all available tariffs (public)."""
    tariffs = load_tariffs()
    print(f"Tariffs found: {len(tariffs)}")
    return tariffs
