import uuid
import httpx
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.config import settings

security = HTTPBearer(auto_error=False)

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> uuid.UUID:
    """Verifies the JWT token from Supabase using their REST API directly and returns the user ID."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Missing authentication header"
        )
    
    token = credentials.credentials
    
    try:
        # Use HTTPX to call Supabase auth endpoint, avoiding all Python SDK dependency issues/compilation crashes
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.SUPABASE_SERVICE_KEY
                }
            )
            
        if response.status_code != 200:
            print(f"[SECURITY] Supabase get_user failed with status {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
            
        user_data = response.json()
        print(f"[SECURITY] Successfully verified user via REST API: {user_data['id']}")
        return uuid.UUID(user_data["id"])
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[SECURITY] FASTAPI JWT AUTH EXCEPTION: {repr(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
        )
