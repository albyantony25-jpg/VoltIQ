import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

try:
    # Get a fresh token
    res = supabase.auth.sign_in_with_password({'email': 'demo@energyiq.app', 'password': 'Demo@1234'})
    token = res.session.access_token

    # Verify token
    user_data = supabase.auth.get_user(token)
    print("User ID:", user_data.user.id)
    print("Success")
except Exception as e:
    print(f"Error: {e}")
