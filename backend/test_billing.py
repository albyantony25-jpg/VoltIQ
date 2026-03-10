import os
import asyncio
import httpx
import jwt
from dotenv import load_dotenv

load_dotenv()

token = jwt.encode({"sub": "00000000-0000-0000-0000-000000000000", "aud": "authenticated"}, os.getenv("JWT_SECRET"), algorithm="HS256")

async def main():
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient() as client:
        # Get active home first
        r0 = await client.get("http://localhost:8000/api/v1/homes/", headers=headers)
        if r0.status_code != 200:
            print(f"Failed to get homes: {r0.status_code} {r0.text}")
            return
            
        homes = r0.json()
        if not homes:
            print("No homes found for user!")
            return
            
        home_id = homes[0]["id"]
        print(f"Using home_id: {home_id}")
        
        urls = [
            f"http://localhost:8000/api/v1/billing/{home_id}/predict",
            f"http://localhost:8000/api/v1/billing/{home_id}/history",
            f"http://localhost:8000/api/v1/billing/simulate"
        ]
        
        for url in urls:
            try:
                if "simulate" in url:
                    r = await client.post(url, headers=headers, json={"total_units": 450, "tariff_id": "MAH-01"})
                else:
                    r = await client.get(url, headers=headers)
                print(f"URL: {url}")
                print(f"Status: {r.status_code}")
                print(f"Response: {r.text[:300]}")
            except Exception as e:
                print(f"URL {url} raised Exception: {e}")

asyncio.run(main())
