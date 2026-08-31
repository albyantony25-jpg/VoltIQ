import httpx
import logging
from core.config import settings

logger = logging.getLogger(__name__)

async def get_embedding(text: str) -> list[float]:
    """
    Generate an embedding using OpenAI API if key exists,
    otherwise fallback to a deterministic pure-python pseudo-embedding
    to avoid heavy local ML dependencies on the free tier.
    """
    if not settings.OPENAI_API_KEY:
        import hashlib
        # Deterministic pseudo-embedding for testing semantic caching/RAG without ML
        h = int(hashlib.md5(text.encode()).hexdigest(), 16)
        vec = [float((h >> i) & 1) for i in range(384)]
        norm = sum(x*x for x in vec) ** 0.5 or 1.0
        return [x/norm for x in vec]
        
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                json={"input": text, "model": "text-embedding-3-small", "dimensions": 384}
            )
            resp.raise_for_status()
            data = resp.json()
            return data["data"][0]["embedding"]
        except Exception as e:
            logger.error(f"Embedding failed: {e}")
            return [0.0] * 384
