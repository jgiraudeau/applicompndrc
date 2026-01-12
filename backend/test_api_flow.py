import requests
from app import models
from app.database import SessionLocal

# Setup
API_URL = "http://localhost:8000"
EMAIL = "onboarding.test@ecole.fr"
PWD = "password" # Mock since we use Google usually, but backend handles test ? 
# Actually auth.py mocks Google login via /auth/google endpoint which expects a token.
# I will use the `login_for_access_token` if available OR simulate a Google Login.
# `auth.py` has `login_for_access_token` but it requires a password. User model has hashed_password?
# Users created via Google don't have passwords.
# So I should use the /auth/google endpoint with a MOCK token if I can, OR just manually create a user in DB and test the Plan Update API.

def test_api_flow():
    db = SessionLocal()
    
    # 1. Reset User
    print(f"1. Resetting user {EMAIL}...")
    existing = db.query(models.User).filter(models.User.email == EMAIL).first()
    if existing:
        db.delete(existing)
        db.commit()
    
    # 2. Create User Manually (Simulating 'after registration')
    # Status=PENDING, Active=TRUE (as per new logic)
    user = models.User(
        email=EMAIL, 
        full_name="Test Onboarding", 
        status=models.UserStatus.PENDING,
        is_active=True,
        role=models.UserRole.TEACHER
    )
    db.add(user)
    db.commit()
    
    # Generate Token manually (to bypass Google mock complexity)
    from app import auth
    token = auth.create_access_token(data={"sub": EMAIL})
    headers = {"Authorization": f"Bearer {token}"}
    print("   ✅ User reset and token generated.")

    # 3. Test Plan Update (User side)
    print("\n2. Calling PATCH /api/users/me/plan...")
    res = requests.patch(
        f"{API_URL}/api/users/me/plan", 
        json={"plan": "subscription"},
        headers=headers
    )
    if res.status_code == 200:
        print(f"   ✅ Success: {res.json()}")
    else:
        print(f"   ❌ Failed: {res.status_code} {res.text}")
        return

    # 4. Verify DB
    db.refresh(user)
    if user.plan_selection == "subscription":
         print(f"   ✅ DB updated correctly: {user.plan_selection}")
    else:
         print(f"   ❌ DB mismatch: {user.plan_selection}")

    # 5. Access Restricted Endpoint (mock check)
    # The restrictions are on Frontend Middleware, but let's check if backend has any blocks?
    # Backend doesn't block PENDING on general access anymore (we removed it).
    # So this test confirms API works. Middleware test requires Browser or Next.js context.
    
    db.close()

if __name__ == "__main__":
    test_api_flow()
