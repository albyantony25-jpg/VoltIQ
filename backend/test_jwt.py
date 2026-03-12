import os
import jwt
from dotenv import load_dotenv

load_dotenv()

# Simulate a token structure or catch decode errors locally
secret = os.getenv('JWT_SECRET')
print(f"Loaded JWT_SECRET: {secret[:5]}...{secret[-5:]} (Len: {len(secret)})")

# We will try decoding a bogus token just to see if the secret format itself throws an error
try:
    jwt.decode("eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ", secret, algorithms=["HS256"], audience="authenticated")
except Exception as e:
    print(f"Decode Error: {e}")
