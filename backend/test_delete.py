import os
import asyncio
import httpx
import jwt
from dotenv import load_dotenv

load_dotenv()

# create dummy JWT
payload = {"sub": "00000000-0000-0000-0000-000000000000", "aud": "authenticated"}
token = jwt.encode(payload, os.getenv("JWT_SECRET"), algorithm="HS256")

async def main():
    home_id = "4d4c87d5-9b37-5087-9a0e-d71fb3d8b920"
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient() as client:
        res = await client.get(f"http://localhost:8000/api/v1/appliances/?home_id={home_id}", headers=headers)
        if res.status_code != 200:
            print(f"GET failed: {res.status_code} {res.text}")
            return
            
        appliances = res.json()
        print(f"Found {len(appliances)} appliances.")
        
        if not appliances:
            print("No appliances to delete.")
            return
            
        app_id = appliances[0]["id"]
        print(f"Attempting delete of {app_id}...")
        
        del_res = await client.delete(f"http://localhost:8000/api/v1/appliances/{app_id}", headers=headers)
        print(f"DELETE Response Status: {del_res.status_code}")
        print(f"DELETE Response Body: {del_res.text}")

asyncio.run(main())
