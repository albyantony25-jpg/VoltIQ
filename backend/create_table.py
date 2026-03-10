import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

async def main():
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    sql = """
    CREATE TABLE IF NOT EXISTS appliances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        home_id uuid REFERENCES homes(id) ON DELETE CASCADE,
        name text NOT NULL,
        brand text,
        category text CHECK (category IN ('hvac','kitchen','entertainment','lighting','ev','laundry','other')),
        rated_watts float CHECK (rated_watts BETWEEN 1 AND 15000),
        standby_watts float DEFAULT 0,
        efficiency_class text CHECK (efficiency_class IN ('A+++','A++','A+','A','B','C','D','E','F','G')),
        age_years int DEFAULT 0,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        usage_hours float DEFAULT 0
    );
    ALTER TABLE appliances ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can manage own appliances" ON appliances 
    FOR ALL USING (home_id IN (SELECT id FROM homes WHERE user_id = auth.uid()));
    """

    async with httpx.AsyncClient() as client:
        # Supabase doesn't expose a direct raw SQL execution endpoint via REST RESTfully
        # without calling an RPC. We must create the table using the SQL editor.
        print("Table must be created from SQL editor.")

asyncio.run(main())
