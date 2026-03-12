import sys
import os
import uuid
import requests

# Mock user_id (needs to be valid UUID)
USER_ID = "00000000-0000-0000-0000-000000000000"
API_URL = "http://localhost:8000/api/v1/homes"

payload = {
    "name": "Test Home",
    "home_type": "apartment",
    "city": "Test City",
    "bedrooms": 2,
    "occupants": 3,
    "area_sqft": 1200,
    "tariff_id": "MAH-01"
}

print(f"Testing POST {API_URL} with payload: {payload}")
try:
    # Note: Backend fallback to dummy user if auth is missing
    response = requests.post(API_URL, json=payload, headers={"X-Debug-User": USER_ID})
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
