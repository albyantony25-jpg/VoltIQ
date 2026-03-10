import asyncio
import asyncpg
import uuid

async def seed():
    conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/postgres')
    
    dummy_id = '00000000-0000-0000-0000-000000000000'
    
    # 1. auth.users
    await conn.execute("INSERT INTO auth.users (id) VALUES ($1) ON CONFLICT DO NOTHING", dummy_id)
    
    # 2. users
    await conn.execute("INSERT INTO users (id, full_name, plan_tier) VALUES ($1, 'Demo User', 'pro') ON CONFLICT DO NOTHING", dummy_id)
    
    # 3. homes
    home_id = str(uuid.uuid4())
    # check if home already exists for user
    existing_home = await conn.fetchrow("SELECT id FROM homes WHERE user_id = $1", dummy_id)
    if not existing_home:
        await conn.execute("""
            INSERT INTO homes (id, user_id, name, bedrooms, occupants, city, home_type, area_sqft)
            VALUES ($1, $2, 'Demo Home', 3, 4, 'Mumbai', 'apartment', 1200)
        """, home_id, dummy_id)
    else:
        home_id = str(existing_home['id'])

    # 4. tariffs (if none exist)
    tariffs = await conn.fetch("SELECT id FROM tariffs")
    if not tariffs:
         await conn.execute("""
            INSERT INTO tariffs (name, type, slab_config, fixed_charge_inr, fuel_surcharge_pct, electricity_duty_pct, is_default, state)
            VALUES ('Demo Tariff', 'flat', '[]', 100, 0, 0, true, 'MH')
         """)
         tariffs = await conn.fetch("SELECT id FROM tariffs")
    
    tariff_id = tariffs[0]['id']

    # 5. appliances
    appliances = await conn.fetch("SELECT id FROM appliances WHERE home_id = $1", home_id)
    if not appliances:
         await conn.execute("""
            INSERT INTO appliances (home_id, name, category, rated_watts) VALUES
            ($1, 'Living Room AC', 'hvac', 1500),
            ($1, 'Refrigerator', 'kitchen', 400),
            ($1, 'Washing Machine', 'laundry', 800)
         """, home_id)
         
    # 6. bills
    bills = await conn.fetch("SELECT id FROM bills WHERE home_id = $1", home_id)
    if not bills:
         await conn.execute("""
            INSERT INTO bills (home_id, tariff_id, billing_month, units_consumed, total_amount_inr) VALUES
            ($1, $2, '2023-10', 450, 3500),
            ($1, $2, '2023-11', 420, 3200),
            ($1, $2, '2023-12', 480, 3800)
         """, home_id, tariff_id)
         
    print("Seed complete.")
    await conn.close()

if __name__ == '__main__':
    asyncio.run(seed())
