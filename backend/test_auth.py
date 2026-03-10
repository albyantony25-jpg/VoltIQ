import os
import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.get("http://localhost:8000/api/v1/homes/")
        print("Status Code:", r.status_code)
        if r.status_code == 200:
            print("Response:", r.json())
        else:
            print("Response text:", r.text)

asyncio.run(main())
