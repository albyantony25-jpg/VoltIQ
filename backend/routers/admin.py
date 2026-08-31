from fastapi import APIRouter, HTTPException, Request, Depends, status, Header
import asyncpg
from core.dependencies import get_db_pool
from core.config import settings
import json
import os

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/setup-db")
async def setup_db(
    x_admin_secret: str = Header(None),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    if not settings.ADMIN_SECRET:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    
    if x_admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    async with pool.acquire() as conn:
        # 1. Create tables
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                full_name TEXT,
                plan_tier TEXT DEFAULT 'free',
                locale TEXT DEFAULT 'en',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS homes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                name TEXT NOT NULL,
                home_type TEXT,
                city TEXT,
                bedrooms INT,
                occupants INT,
                area_sqft FLOAT,
                tariff_id TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS appliances (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                home_id UUID REFERENCES homes(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                brand TEXT,
                appliance_type TEXT,
                category TEXT,
                rated_watts FLOAT,
                standby_watts FLOAT DEFAULT 0,
                efficiency_class TEXT DEFAULT 'A',
                load_factor FLOAT DEFAULT 0.85,
                usage_hours FLOAT DEFAULT 4,
                usage_hours_per_day FLOAT DEFAULT 4,
                age_years INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS tariffs (
                id TEXT PRIMARY KEY,
                state TEXT,
                provider TEXT,
                fixed_charge_inr FLOAT DEFAULT 0,
                fuel_surcharge_pct FLOAT DEFAULT 0,
                electricity_duty_pct FLOAT DEFAULT 0,
                slab_config JSONB
            );
            CREATE TABLE IF NOT EXISTS alerts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                home_id UUID REFERENCES homes(id) ON DELETE CASCADE,
                user_id UUID,
                type TEXT,
                message TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                triggered_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID,
                home_id UUID,
                messages JSONB DEFAULT '[]',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)

        # 2. Seed tariffs
        inserted_tariffs = 0
        tariffs_path = os.path.join(os.path.dirname(__file__), "..", "data", "tariffs_seed.json")
        if os.path.exists(tariffs_path):
            with open(tariffs_path, "r") as f:
                data = json.load(f)
                for t in data:
                    await conn.execute("""
                        INSERT INTO tariffs (id, state, provider, fixed_charge_inr, fuel_surcharge_pct, electricity_duty_pct, slab_config)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (id) DO UPDATE SET
                            state = EXCLUDED.state,
                            provider = EXCLUDED.provider,
                            fixed_charge_inr = EXCLUDED.fixed_charge_inr,
                            fuel_surcharge_pct = EXCLUDED.fuel_surcharge_pct,
                            electricity_duty_pct = EXCLUDED.electricity_duty_pct,
                            slab_config = EXCLUDED.slab_config
                    """, t["id"], t["state"], t["provider"], t.get("fixed_charge_inr", 0), 
                         t.get("fuel_surcharge_pct", 0), t.get("electricity_duty_pct", 0), 
                         json.dumps(t["slab_config"]))
                    inserted_tariffs += 1

        return {
            "status": "success",
            "message": "Database setup and seeded successfully",
            "tables_created": ["users", "homes", "appliances", "tariffs", "alerts", "chat_sessions"],
            "seed_results": {
                "tariffs": inserted_tariffs
            }
        }
