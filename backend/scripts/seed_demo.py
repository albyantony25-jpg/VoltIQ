import asyncio
import os
import sys
import uuid
import random
import json
import argparse
from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta
import httpx
import asyncpg
from dotenv import load_dotenv

# Provide a fallback mock generator class
class MockDB:
    def __init__(self):
        self.data = {
            "homes": [],
            "appliances": [],
            "usage_logs": [],
            "bills": [],
            "ai_insights": [],
            "alerts": []
        }
    
    async def execute(self, query, *args):
        # We don't execute SQL in mock mode, we manually append to self.data later
        pass
    
    async def fetchrow(self, query, *args):
        return None
    
    async def close(self):
        # Dump to JSON
        path = os.path.join(os.path.dirname(__file__), "..", "data", "demo_mock_data.json")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        # Convert UUIDs and dates to strings
        def default_serializer(obj):
            if isinstance(obj, (uuid.UUID, date, datetime)):
                return str(obj)
            raise TypeError(f"Type {type(obj)} not serializable")
            
        with open(path, "w") as f:
            json.dump(self.data, f, default=default_serializer, indent=2)
        print(f"📁 Database offline. Automatically generated mock data file at: {path}")

# Run from backend directory to pick up .env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = os.environ.get("DATABASE_URL")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://localhost:8000")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "dummy")

TARIFF_ID = str(uuid.uuid5(uuid.NAMESPACE_DNS, "KSEB-01")) # Mock tariff ID for Kerala

def compute_kwh(watts, load_factor, hours, age):
    age_penalty = 1.0 + (age * 0.02)
    return (watts * load_factor * hours * age_penalty) / 1000.0

def calculate_kseb_bill(total_units):
    charge = 0
    if total_units <= 30:
        charge = 0
    elif total_units <= 100:
        charge = total_units * 3.40
    elif total_units <= 200:
        charge = (100 * 3.40) + ((total_units - 100) * 5.75)
    else:
        charge = (100 * 3.40) + (100 * 5.75) + ((total_units - 200) * 7.40)
    
    fixed = 75.0
    fuel = charge * 0.08
    duty = (charge + fuel) * 0.05
    return charge, fixed, fuel, duty, (charge + fixed + fuel + duty)

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Drop and recreate demo data")
    args = parser.parse_args()

    print("🌱 Starting VoltIQ Demo Seeder...")

    # STEP 1: Create demo user
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }

    user_id = None
    try:
        async with httpx.AsyncClient() as client:
            # Note: the admin auth endpoints are /auth/v1/admin/users on Supabase
            # If using self-hosted, adjust as needed. 
            auth_url = f"{SUPABASE_URL}/auth/v1/admin/users"
            if "placeholder" in SUPABASE_URL:
                print("⚠️ Using mock user_id because Supabase URL is a placeholder.")
                user_id = str(uuid.UUID("11111111-1111-1111-1111-111111111111"))
            else:
                res = await client.get(auth_url, headers=headers)
                if res.status_code == 200:
                    users = res.json().get("users", [])
                    demo_user = next((u for u in users if u.get("email") == "demo@voltiq.app"), None)
                    if demo_user:
                        user_id = demo_user["id"]
                        if args.reset:
                            await client.delete(f"{auth_url}/{user_id}", headers=headers)
                            demo_user = None
                    
                    if not demo_user:
                        res = await client.post(
                            auth_url, 
                            headers=headers,
                            json={
                                "email": "demo@voltiq.app", 
                                "password": "Demo@1234", 
                                "email_confirm": True,
                                "user_metadata": {"full_name": "Alby A Jose"}
                            }
                        )
                        if res.status_code >= 400:
                            print(f"❌ Error creating user: {res.text}")
                            sys.exit(1)
                        user_id = res.json()["id"]
                else:
                    print(f"⚠️ Could not connect to Supabase Auth API: {res.text}. Proceeding with mock ID.")
                    user_id = str(uuid.UUID("11111111-1111-1111-1111-111111111111"))
    except Exception as e:
        print(f"⚠️ Auth creation failed ({e}). Using mock user_id.")
        user_id = str(uuid.UUID("11111111-1111-1111-1111-111111111111"))

    # Force UUID
    user_id_uuid = uuid.UUID(user_id)

    # Establish direct DB connection
    print(f"🔌 Connecting to DB: {DATABASE_URL.split('@')[-1]}")
    is_mock = False
    try:
        conn = await asyncpg.connect(DATABASE_URL)
    except Exception as e:
        print(f"❌ Could not connect to PostgreSQL. Generating offline JSON mock data instead...")
        conn = MockDB()
        is_mock = True
    
    try:
        home_id = uuid.uuid5(uuid.NAMESPACE_DNS, "demo_home_voltiq")
        if args.reset and not is_mock:
            await conn.execute("DELETE FROM homes WHERE id = $1", home_id)
            
        if not is_mock:
            # Ensure the user exists in auth.users and public.users to satisfy foreign keys
            await conn.execute("INSERT INTO auth.users (id) VALUES ($1) ON CONFLICT DO NOTHING", user_id_uuid)
            await conn.execute("INSERT INTO public.users (id, full_name, plan_tier) VALUES ($1, 'Alby A Jose', 'pro') ON CONFLICT DO NOTHING", user_id_uuid)

        # STEP 2: Create home

        if is_mock:
            conn.data["homes"].append({
                "id": home_id, "user_id": user_id_uuid, "name": "Family Home", 
                "home_type": "apartment", "bedrooms": 3, "occupants": 4, 
                "city": "Trivandrum", "area_sqft": 1200, "tariff_id": TARIFF_ID
            })
        else:
            await conn.execute("""
                INSERT INTO homes (id, user_id, name, home_type, bedrooms, occupants, city, area_sqft, tariff_id)
                VALUES ($1, $2, 'Family Home', 'apartment', 3, 4, 'Trivandrum', 1200, $3)
                ON CONFLICT (id) DO NOTHING
            """, home_id, user_id_uuid, TARIFF_ID)

        # STEP 3: Insert Appliances
        appliance_data = [
            ("LG 1.5T Split AC 5-Star", "hvac", 1500, "A++", 8, 2, 0.65),
            ("Samsung 265L Double Door Fridge", "kitchen", 180, "A+", 24, 3, 0.90),
            ("Bajaj 6kg Washing Machine", "laundry", 500, "B", 1.5, 4, 0.85),
            ("Sony 55\" LED TV", "entertainment", 120, "A", 5, 2, 0.70),
            ("Havells Ceiling Fan x3", "hvac", 75, "A", 12, 5, 0.65),
            ("LG Microwave 800W", "kitchen", 800, "A", 0.5, 1, 0.90),
            ("Prestige Induction Cooktop", "kitchen", 1800, "A", 1, 2, 0.90),
            ("Dell Laptop", "entertainment", 65, "A+", 8, 1, 0.70),
            ("TP-Link WiFi Router", "entertainment", 12, "A", 24, 3, 0.70),
            ("Syska LED Bulbs x8", "lighting", 9, "A+++", 6, 1, 1.0)
        ]

        inserted_appliances = []
        for a in appliance_data:
            app_id = uuid.uuid5(uuid.NAMESPACE_DNS, "app_" + a[0])
            if is_mock:
                conn.data["appliances"].append({
                    "id": app_id, "home_id": home_id, "name": a[0], "category": a[1], 
                    "rated_watts": a[2], "efficiency_class": a[3], "usage_hours": a[4], 
                    "age_years": a[5], "is_active": True
                })
            else:
                await conn.execute("""
                    INSERT INTO appliances (id, home_id, name, category, rated_watts, efficiency_class, usage_hours, age_years, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
                    ON CONFLICT (id) DO NOTHING
                """, app_id, home_id, a[0], a[1], a[2], a[3], a[4], a[5])
            inserted_appliances.append((app_id, *a))

        # STEP 4: Generate 6 months of usage logs
        today = date.today()
        start_date = today - timedelta(days=180)
        logs_count = 0
        
        current_date = start_date
        monthly_totals = {}

        while current_date <= today:
            month_key = current_date.strftime("%Y-%m")
            current_month_idx = current_date.month
            
            if month_key not in monthly_totals:
                monthly_totals[month_key] = 0.0

            for app in inserted_appliances:
                app_id, name, category, watts, eff, base_hrs, age, load_factor = app
                
                # noise
                daily_hrs = base_hrs * random.uniform(0.85, 1.15)
                
                # seasonal modifier
                if category == "hvac":
                    if current_month_idx in [4, 5, 6]:
                        daily_hrs *= 1.4
                    elif current_month_idx in [12, 1, 2]:
                        daily_hrs *= 1.6
                
                # Anomaly injection (April, AC 18 hours for 5 days)
                if current_month_idx == 4 and "AC" in name:
                    if 10 <= current_date.day <= 14:
                        daily_hrs = 18.0

                daily_hrs = min(24.0, daily_hrs)
                kwh = compute_kwh(watts, load_factor, daily_hrs, age)
                
                log_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"log_{app_id}_{current_date}")
                if is_mock:
                    conn.data["usage_logs"].append({
                        "id": log_id, "home_id": home_id, "appliance_id": app_id, 
                        "log_date": current_date, "usage_hours": round(daily_hrs, 2), 
                        "computed_kwh": round(kwh, 2)
                    })
                else:
                    await conn.execute("""
                        INSERT INTO usage_logs (id, home_id, appliance_id, log_date, usage_hours, computed_kwh)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (id) DO NOTHING
                    """, log_id, home_id, app_id, current_date, round(daily_hrs, 2), round(kwh, 2))
                
                monthly_totals[month_key] += kwh
                logs_count += 1
                
            current_date += timedelta(days=1)

        # STEP 5: Generate 6 monthly bills
        total_spend = 0.0
        for month_key, kwh in monthly_totals.items():
            if month_key == today.strftime("%Y-%m"):
                continue # Skip partial current month for official bills
                
            energy, fixed, fuel, duty, total = calculate_kseb_bill(kwh)
            total_spend += total
            bill_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"bill_{home_id}_{month_key}")
            
            if is_mock:
                conn.data["bills"].append({
                    "id": bill_id, "home_id": home_id, "billing_month": month_key, 
                    "units_consumed": round(kwh, 2), "total_amount_inr": round(total, 2)
                })
            else:
                await conn.execute("""
                    INSERT INTO bills (id, home_id, billing_month, units_consumed, energy_charge_inr, fixed_charge_inr, fuel_surcharge_inr, electricity_duty_inr, total_amount_inr)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (id) DO NOTHING
                """, bill_id, home_id, month_key, round(kwh, 2), round(energy, 2), round(fixed, 2), round(fuel, 2), round(duty, 2), round(total, 2))

        # STEP 6: Pre-cache 3 AI Insights
        insight_1 = {
            "type": "anomaly", "title": "Unusual AC Spike Detected in April",
            "content": {
                "month": f"{today.year}-04", "expected_kwh": 180, "actual_kwh": 294, "deviation_pct": 63.3,
                "likely_cause": "AC ran 18hrs/day for 5 days — possible thermostat fault or doors left open",
                "severity": "high"
            }, "confidence_score": 0.91
        }
        
        insight_2 = {
            "type": "recommendation", "title": "Set AC to 24°C to Save ₹847/Year",
            "content": {
                "appliance": "LG 1.5T Split AC", "action": "Increase thermostat from 18°C to 24°C",
                "effort": "easy", "annual_saving_inr": 847, "monthly_saving_inr": 70,
                "reasoning": "Every 1°C increase in AC setpoint reduces consumption by ~6%. At current usage, moving from 18°C to 24°C saves ~420 kWh/year."
            }, "confidence_score": 0.87
        }

        insight_3 = {
            "type": "forecast", "title": "Next Month Bill Forecast: ₹2,340",
            "content": {
                "next_month_kwh": 287, "next_month_bill_inr": 2340, "confidence": 0.83,
                "range_low": 2153, "range_high": 2527,
                "key_factors": [
                    "Monsoon season reduces AC load by ~18%",
                    "Consistent kitchen usage trending slightly up",
                    "Washing machine usage increased 2 days/week vs last month"
                ],
                "reasoning": "Based on 6-month rolling average adjusted for seasonal monsoon modifier. AC load expected to drop, partially offset by increased kitchen usage."
            }, "confidence_score": 0.83
        }

        for idx, ins in enumerate([insight_1, insight_2, insight_3]):
            ins_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"insight_{home_id}_{idx}")
            exp = datetime.utcnow() + timedelta(days=30)
            if is_mock:
                conn.data["ai_insights"].append({
                    "id": ins_id, "home_id": home_id, "insight_type": ins["type"], 
                    "title": ins["title"], "content": ins["content"]
                })
            else:
                await conn.execute("""
                    INSERT INTO ai_insights (id, home_id, insight_type, title, content, confidence_score, target_month, expires_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (id) DO NOTHING
                """, ins_id, home_id, ins["type"], ins["title"], json.dumps(ins["content"]), ins["confidence_score"], today.strftime("%Y-%m"), exp)

        # STEP 7: Generate 2 alerts
        alert_1_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"alert_{home_id}_1")
        if is_mock:
            conn.data["alerts"].append({"id": alert_1_id, "message": "Your AC consumed 54 kWh..."})
        else:
            await conn.execute("""
                INSERT INTO alerts (id, home_id, alert_type, severity, message, triggered_at, is_read)
                VALUES ($1, $2, 'anomaly', 'high', 'Your AC consumed 54 kWh on April 14 — 4.2x above your daily average of 12.8 kWh. Possible thermostat malfunction or extended usage.', $3, false)
                ON CONFLICT (id) DO NOTHING
            """, alert_1_id, home_id, datetime.utcnow() - relativedelta(months=1))

        alert_2_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"alert_{home_id}_2")
        await conn.execute("""
            INSERT INTO alerts (id, home_id, alert_type, severity, message, triggered_at, is_read)
            VALUES ($1, $2, 'efficiency', 'medium', 'Your washing machine (rated B efficiency) is 6 years old. Upgrading to a 5-star model could save ₹1,200/year.', $3, false)
            ON CONFLICT (id) DO NOTHING
        """, alert_2_id, home_id, datetime.utcnow())

        print("\n" + "="*50)
        print("✅ Demo user created: demo@voltiq.app / Demo@1234")
        print("✅ Home created: Family Home")
        print(f"✅ Appliances inserted: {len(appliance_data)}")
        print(f"✅ Usage logs generated: {logs_count} records across 6 months")
        print(f"✅ Bills generated: {len(monthly_totals)-1} months (₹{total_spend:,.0f} total spend simulated)")
        print("✅ AI insights cached: 3")
        print("✅ Alerts created: 2")
        print("🚀 Login at http://localhost:3000 with demo@voltiq.app / Demo@1234")
        print("="*50 + "\n")

    except Exception as e:
        print(f"❌ Database error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
