import sys
import os
import json

# Add backend to path
sys.path.append(os.path.abspath('backend'))

try:
    from services.billing_engine import load_tariffs
    tariffs = load_tariffs()
    print(f"Loaded {len(tariffs)} tariffs")
    if len(tariffs) > 0:
        print("First tariff state:", tariffs[0].state)
    else:
        print("No tariffs loaded!")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
