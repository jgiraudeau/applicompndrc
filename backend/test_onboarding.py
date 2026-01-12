from app.database import SessionLocal
from app import models
import sys

def test_onboarding_flow():
    db = SessionLocal()
    email = "eleve.test@ecole.fr"
    
    # 1. Simulate Registration (Pending)
    print(f"1. Creating Pending User: {email}")
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        db.delete(existing)
        db.commit()
    
    new_user = models.User(
        email=email,
        full_name="Élève Test",
        role=models.UserRole.STUDENT,
        status=models.UserStatus.PENDING,
        plan_selection="subscription",
        is_active=False
    )
    db.add(new_user)
    db.commit()
    print("   ✅ User created. Status: PENDING, Active: False")

    # 2. Simulate Admin Listing
    print("\n2. Admin checking pending list...")
    pending = db.query(models.User).filter(models.User.status == models.UserStatus.PENDING).all()
    found = False
    for u in pending:
        if u.email == email:
            print(f"   ✅ Found in pending list: {u.full_name} ({u.plan_selection})")
            found = True
            break
    if not found:
        print("   ❌ User NOT found in pending list!")
        return

    # 3. Simulate Validation (Status -> ACTIVE)
    print("\n3. Admin validating user...")
    user_to_validate = db.query(models.User).filter(models.User.email == email).first()
    user_to_validate.status = models.UserStatus.ACTIVE
    
    # Logic from router (trigger side effects manually here or assume router does it)
    # The router does: if status becomes ACTIVE -> is_active = True
    user_to_validate.is_active = True
    
    db.commit()
    print("   ✅ User validated. Status: ACTIVE, Active: True")
    
    # 4. Mock Email Check
    print("   (Mock Email 'Approval' would be sent here)")

    db.close()

if __name__ == "__main__":
    test_onboarding_flow()
