import subprocess
import os
import sys
from fastapi import APIRouter, HTTPException
import logging

router = APIRouter(prefix="/demo", tags=["demo"])
logger = logging.getLogger(__name__)

@router.post("/reset")
async def reset_demo():
    """Reset the demo simulation data by executing the seed script."""
    script_path = os.path.join(os.getcwd(), "scripts", "seed_demo.py")
    if not os.path.exists(script_path):
        raise HTTPException(status_code=500, detail="Seed script not found")
        
    try:
        logger.info("Executing demo reset script...")
        result = subprocess.run(
            [sys.executable, "scripts/seed_demo.py", "--reset"],
            capture_output=True,
            text=True,
            cwd=os.getcwd()
        )
        if result.returncode != 0:
            logger.error(f"Seed script failed: {result.stderr}")
            raise Exception(f"Seed script failed. Check server logs.")
            
        logger.info("Demo data reset successfully.")
        return {"status": "success", "message": "Demo data reset successfully"}
    except Exception as e:
        logger.error(f"Demo reset error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
