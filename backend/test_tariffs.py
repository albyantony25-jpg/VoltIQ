import os
import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.get("http://localhost:8000/api/v1/billing/tariffs")
        print("Status:", r.status_code)
        try:
            print("Response:", r.json())
        except Exception:
            print("Response text:", r.text)

asyncio.run(main())
