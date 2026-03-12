import os
import json
import base64
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

try:
    res = supabase.auth.sign_in_with_password({'email': 'demo@energyiq.app', 'password': 'Demo@1234'})
    token = res.session.access_token

    # Extract the header and payload directly without pyjwt verification checks
    parts = token.split('.')
    header = json.loads(base64.urlsafe_b64decode(parts[0] + '==').decode('utf-8'))
    payload = json.loads(base64.urlsafe_b64decode(parts[1] + '==').decode('utf-8'))
    
    print("----- JWT HEADER -----")
    print(json.dumps(header, indent=2))
    print("----- JWT PAYLOAD -----")
    print(json.dumps(payload, indent=2))
except Exception as e:
    print(f"Error: {e}")
