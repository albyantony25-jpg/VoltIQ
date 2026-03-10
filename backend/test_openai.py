import os
import asyncio
from openai import AsyncOpenAI
from dotenv import load_dotenv
import traceback

load_dotenv()

async def test():
    try:
        client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        print("Testing OpenAI connection...")
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10
        )
        print("Success!")
        print(response.choices[0].message.content)
    except Exception as e:
        print("Error connecting to OpenAI:")
        print(traceback.format_exc())

asyncio.run(test())
