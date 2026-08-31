import uvicorn
import logging
import uuid
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from core.config import settings
from core.database import db
from core.exceptions import EnergyPlatformError
from core.rate_limiter import limiter
from core.security import close_auth_client

from routers import (
    homes, appliances, simulation, billing, insights,
    chat, reports, alerts, analytics, demo, tariffs, users, admin
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logging.getLogger(__name__).info(f"CORS origins configured: {settings.cors_origins}")
    logging.getLogger(__name__).info("Initializing Database Pool...")
    await db.connect()
    if db.pool is None:
        logging.getLogger(__name__).error("CRITICAL: Database pool failed to initialize. Running in degraded mode.")
    yield
    # Shutdown
    logging.getLogger(__name__).info("Closing Database Pool...")
    await db.disconnect()
    await close_auth_client()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VoltIQ API",
    description="Backend services for AI Home Energy Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# Attach limiter to app state (required by SlowAPI)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# CORS added LAST so it executes FIRST (FastAPI middleware is LIFO).
# allow_origins reads from ALLOWED_ORIGINS env var via settings.cors_origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

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
            "timestamp": datetime.utcnow().isoformat(),
        },
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
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

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
app.include_router(users.router, prefix=api_prefix)

if settings.ADMIN_SECRET:
    app.include_router(admin.router, prefix=api_prefix)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
