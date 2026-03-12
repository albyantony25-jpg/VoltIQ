import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

async def test_auth():
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY')
    
    # Get a token using REST API to simulate login
    auth_resp = httpx.post(
        f"{url}/auth/v1/token?grant_type=password",
        headers={"apikey": key, "Content-Type": "application/json"},
        json={"email": "demo@energyiq.app", "password": "Demo@1234"}
    )
    token = auth_resp.json().get("access_token")
    print("Got token length:", len(token))

    # Verify the token via REST API
    async with httpx.AsyncClient() as client:
        ver_resp = await client.get(
            f"{url}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": key}
        )
        print("Verify Status:", ver_resp.status_code)
        print("User:", ver_resp.json().get("id"))

asyncio.run(test_auth())
