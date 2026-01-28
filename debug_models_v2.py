import os
from dotenv import load_dotenv
from google import genai

load_dotenv(dotenv_path="backend/.env")
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ NO KEY FOUND")
    exit()

print(f"🔑 Key found: {api_key[:5]}...")

try:
    client = genai.Client(api_key=api_key)
    print("✅ Client created. Listing models...")
    
    models = list(client.models.list())
    print(f"📦 Found {len(models)} models.")
    
    for m in models:
        # Check attributes
        # print(dir(m)) 
        print(f"   - {m.name}")

except Exception as e:
    print(f"❌ Error: {e}")
