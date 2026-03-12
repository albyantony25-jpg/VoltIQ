import uvicorn
import logging
import uuid
import time
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.config import settings
from core.database import db
from core.exceptions import EnergyPlatformError, ValidationError, AIServiceError, BillingError

from routers import homes, appliances, simulation, billing, insights, chat, reports, alerts, analytics, demo, tariffs

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Initializing Database Pool...")
    await db.connect()
    yield
    # Shutdown
    print("Closing Database Pool...")
    await db.disconnect()

limiter = Limiter(key_func=get_remote_address)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VoltIQ API",
    description="Backend services for AI Home Energy Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False
)

@app.get("/debug-env")
async def debug_env():
    import os
    db_val = os.getenv("DATABASE_URL", "NOT SET")
    try:
        host = db_val.split("@")[1].split(":")[0]
    except:
        host = "parse error"
    return {
        "host": host,
        "db_length": len(db_val),
    }

@app.post("/seed-db")
async def seed_database():
    async with db.pool.acquire() as conn:
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
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID,
                home_id UUID,
                messages JSONB DEFAULT '[]',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        return {"status": "tables created"}

@app.post("/seed-tariffs")
async def seed_tariffs():
    import json, os
    tariff_path = os.path.join(os.path.dirname(__file__), 'data/tariffs_seed.json')
    with open(tariff_path, 'r') as f:
        tariffs = json.load(f)
    async with db.pool.acquire() as conn:
        for t in tariffs:
            await conn.execute("""
                INSERT INTO tariffs (id, state, provider, fixed_charge_inr,
                    fuel_surcharge_pct, electricity_duty_pct, slab_config)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO NOTHING
            """, t['id'], t['state'], t['provider'],
                t['fixed_charge_inr'], t['fuel_surcharge_pct'],
                t['electricity_duty_pct'], json.dumps(t['slab_config']))
    return {"status": f"seeded {len(tariffs)} tariffs"}

@app.post("/migrate-db")
async def migrate_database():
    """Add missing columns to alerts table to match the router schema."""
    async with db.pool.acquire() as conn:
        await conn.execute("""
            ALTER TABLE alerts
                ADD COLUMN IF NOT EXISTS appliance_id UUID,
                ADD COLUMN IF NOT EXISTS title TEXT,
                ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'INFO',
                ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'ANOMALY',
                ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMPTZ DEFAULT NOW();
        """)
        # Backfill triggered_at from created_at for existing rows
        await conn.execute("""
            UPDATE alerts SET triggered_at = created_at WHERE triggered_at IS NULL;
        """)
        return {"status": "migration complete — alerts table updated"}

# CORS must be last middleware added (runs first due to LIFO order)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.middleware("http")
async def add_request_id_and_log(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Explicit OPTIONS handler to fix Railway proxy dropping CORS preflight headers
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str, request: Request):
    origin = request.headers.get("Origin", "")
    allowed = origin if origin in settings.cors_origins else (settings.cors_origins[0] if settings.cors_origins else "*")
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": allowed,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Request-ID",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

# CORS added LAST so it executes FIRST (FastAPI middleware is LIFO)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(EnergyPlatformError)
async def custom_exception_handler(request: Request, exc: EnergyPlatformError):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[{req_id}] Custom Exception: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "request_id": req_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    req_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[{req_id}] Unhandled Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred. Our team has been notified.",
            "request_id": req_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# CORS has been moved to the top of the middleware stack

# Root/Health
@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

# Include Routers
api_prefix = "/api/v1"
app.include_router(homes.router, prefix=api_prefix)
app.include_router(appliances.router, prefix=api_prefix)
app.include_router(simulation.router, prefix=api_prefix)
app.include_router(billing.router, prefix=api_prefix)
app.include_router(insights.router, prefix=api_prefix)
app.include_router(chat.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(analytics.router, prefix=api_prefix)
app.include_router(demo.router, prefix=api_prefix)
app.include_router(tariffs.router, prefix=api_prefix)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
"# force rebuild" 
