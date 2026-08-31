import asyncio
import os
import sys

# Add backend to path so we can import core
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.database import db
from core.embeddings import get_embedding

async def seed_embeddings():
    await db.connect()
    
    if not db.pool:
        print("Failed to connect to database.")
        return

    async with db.pool.acquire() as conn:
        print("Fetching appliances...")
        appliances = await conn.fetch("SELECT id, name, category, rated_watts FROM appliances")
        
        print(f"Found {len(appliances)} appliances to embed.")
        
        for app in appliances:
            # Check if embedding already exists
            existing = await conn.fetchrow("SELECT id FROM embeddings WHERE appliance_id = $1", app['id'])
            if existing:
                continue
                
            content = f"Appliance: {app['name']}, Category: {app['category']}, Power: {app['rated_watts']} Watts"
            print(f"Embedding: {content}")
            
            emb = await get_embedding(content)
            emb_str = f"[{','.join(map(str, emb))}]"
            
            await conn.execute(
                """
                INSERT INTO embeddings (appliance_id, content, embedding) 
                VALUES ($1, $2, $3::vector)
                """,
                app['id'], content, emb_str
            )
            
            # Small delay to avoid rate limits if using an external API
            await asyncio.sleep(0.1)

    print("Embeddings seeded successfully.")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(seed_embeddings())
