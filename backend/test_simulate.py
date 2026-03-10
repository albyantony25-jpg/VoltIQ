import httpx
import asyncio

async def main():
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post("http://localhost:8000/api/v1/billing/simulate", json={"total_units": 450, "tariff_id": "GUJ-01"})
            print("Status GUJ-01:", r.status_code)
            print("Response:", r.text[:300])
        except Exception as e:
            print("Error GUJ-01:", e)

asyncio.run(main())
