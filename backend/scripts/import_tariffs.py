import os
import json
import httpx
from dotenv import load_dotenv
import asyncio

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

async def main():
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
        return

    json_path = os.path.join(os.path.dirname(__file__), "..", "data", "tariffs_seed.json")
    with open(json_path, 'r', encoding='utf-8') as f:
        tariffs = json.load(f)

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    inserted = 0
    print(f"🔌 Connecting to Remote Supabase: {SUPABASE_URL}")
    
    try:
        async with httpx.AsyncClient() as client:
            # Get existing tariffs to avoid duplicates
            res = await client.get(f"{SUPABASE_URL}/rest/v1/tariffs?select=state", headers=headers)
            res.raise_for_status()
            existing_states = [t.get('state') for t in res.json()]

            for t in tariffs:
                state = t.get('state')
                # Check if state already exists (like Maharashtra, Karnataka, Delhi)
                if state in existing_states:
                    continue

                name = f"{state} ({t.get('provider')}) Res"
                payload = {
                    "name": name,
                    "type": "slab",
                    "slab_config": t.get('slab_config', []),
                    "fixed_charge_inr": float(t.get('fixed_charge_inr', 0)),
                    "fuel_surcharge_pct": float(t.get('fuel_surcharge_pct', 0)),
                    "electricity_duty_pct": float(t.get('electricity_duty_pct', 0)),
                    "is_default": True,
                    "state": state
                }

                post_res = await client.post(f"{SUPABASE_URL}/rest/v1/tariffs", headers=headers, json=payload)
                if post_res.status_code >= 400:
                    print(f"❌ Failed to add {name}: {post_res.text}")
                else:
                    print(f"Added {name}")
                    inserted += 1

            print(f"✅ Successfully inserted {inserted} new tariffs into the remote schema.")
    except Exception as e:
        print(f"❌ Error communicating with Supabase API: {e}")

if __name__ == "__main__":
    asyncio.run(main())
