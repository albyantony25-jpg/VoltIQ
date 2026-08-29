import logging
import uuid
import httpx
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

# Module-level HTTP client reused across requests (avoids creating a new TCP pool
# on every auth call, which degrades latency under concurrent load).
# Closed during app lifespan shutdown if needed, but httpx handles GC gracefully.
_auth_client: httpx.AsyncClient | None = None


def _get_auth_client() -> httpx.AsyncClient:
    """Return the shared AsyncClient, creating it lazily on first use."""
    global _auth_client
    if _auth_client is None or _auth_client.is_closed:
        _auth_client = httpx.AsyncClient(timeout=10.0)
    return _auth_client

async def close_auth_client():
    """Close the shared HTTP client."""
    global _auth_client
    if _auth_client and not _auth_client.is_closed:
        await _auth_client.aclose()
        _auth_client = None


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> uuid.UUID:
    """
    Verify the Supabase JWT via the /auth/v1/user REST endpoint.

    Uses SUPABASE_ANON_KEY (the public key) as the apikey header — NOT the
    service key — so a compromised auth call cannot bootstrap full DB access.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication header",
        )

    token = credentials.credentials

    # Resolve which Supabase API key to use for this call.
    # Prefer the anon key (safe for per-request use). Fall back to the service
    # key only if SUPABASE_ANON_KEY is not yet configured in env, and emit a
    # loud warning so operators know to set it.
    anon_key = settings.SUPABASE_ANON_KEY
    if anon_key:
        api_key = anon_key
    else:
        logger.warning(
            "SUPABASE_ANON_KEY is not set — falling back to SUPABASE_SERVICE_KEY "
            "for JWT verification. Set SUPABASE_ANON_KEY in your environment to fix this."
        )
        api_key = settings.SUPABASE_SERVICE_KEY

    try:
        client = _get_auth_client()
        response = await client.get(
            f"{settings.SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": api_key,
            },
        )

        if response.status_code != 200:
            # Log status for observability but do NOT return details to the caller.
            logger.warning(
                "[SECURITY] Supabase /auth/v1/user returned %s", response.status_code
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )

        user_data = response.json()
        user_id = uuid.UUID(user_data["id"])
        logger.debug("[SECURITY] Verified user %s", user_id)
        return user_id

    except HTTPException:
        raise
    except Exception as e:
        # Log the real exception internally; return a generic message to the client
        # so internal infrastructure details are never leaked.
        logger.error("[SECURITY] JWT verification exception: %r", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
