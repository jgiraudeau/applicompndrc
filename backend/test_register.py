import requests

API_URL = "http://localhost:8000"

def test_register():
    payload = {
        "email": "new.school@test.com",
        "password": "securepassword123",
        "full_name": "Directeur Test",
        "organization_name": "École Test 123",
        "plan": "free"
    }
    
    print(f"Testing Registration with: {payload['email']}")
    
    try:
        res = requests.post(f"{API_URL}/auth/register", json=payload)
        
        if res.status_code == 200:
            print("✅ Registration Success!")
            print(f"Token: {res.json().get('access_token')[:20]}...")
        else:
            print(f"❌ Failed: {res.status_code}")
            print(res.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_register()
