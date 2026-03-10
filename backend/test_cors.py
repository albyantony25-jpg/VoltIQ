import httpx
import asyncio

async def main():
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization, content-type"
    }
    async with httpx.AsyncClient() as client:
        try:
            r = await client.options("http://127.0.0.1:8000/api/v1/billing/simulate", headers=headers)
            print("Status 127.0.0.1:", r.status_code)
            print("Headers 127.0.0.1:", dict(r.headers))
        except Exception as e:
            print("Error 127.0.0.1:", e)
            
        try:
            r = await client.options("http://localhost:8000/api/v1/billing/simulate", headers=headers)
            print("Status localhost:", r.status_code)
            print("Headers localhost:", dict(r.headers))
        except Exception as e:
            print("Error localhost:", e)

asyncio.run(main())
