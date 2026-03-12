import asyncio
from core.database import db

async def main():
    await db.connect()
    async with db.pool.acquire() as conn:
        await conn.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey")
        print("Dropped constraint")
    await db.disconnect()

asyncio.run(main())
