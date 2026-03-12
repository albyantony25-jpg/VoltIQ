import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath('backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join('backend', '.env'))

from core.database import db

async def migrate():
    print("Connecting to database...")
    await db.connect()
    
    async with db.pool.acquire() as conn:
        print("Migrating homes.tariff_id and bills.tariff_id to TEXT...")
        try:
            # Drop FK if exists (it wasn't in the initial schema for homes, but was for bills)
            await conn.execute("ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_tariff_id_fkey")
            
            # Change types
            await conn.execute("ALTER TABLE homes ALTER COLUMN tariff_id TYPE TEXT USING tariff_id::text")
            await conn.execute("ALTER TABLE bills ALTER COLUMN tariff_id TYPE TEXT USING tariff_id::text")
            
            print("Migration successful!")
        except Exception as e:
            print(f"Migration failed: {e}")
            
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(migrate())
