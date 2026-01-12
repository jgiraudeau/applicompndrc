from app.database import SessionLocal, engine
from app import models
from sqlalchemy import text

def restore_admin():
    db = SessionLocal()
    email = "jacques.giraudeau@gmail.com"
    
    # 1. Check Schema (Force Migration if needed)
    print("Checking database schema...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'pending'"))
            print("✅ Added 'status' column")
        except Exception:
            pass

        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN plan_selection VARCHAR DEFAULT 'trial'"))
            print("✅ Added 'plan_selection' column")
        except Exception:
            pass
            
        try:
            # Fix lowercase 'pending' if any
            result = conn.execute(text("UPDATE users SET status='PENDING' WHERE status='pending'"))
            if result.rowcount > 0:
                 print(f"✅ Fixed {result.rowcount} users with lowercase status")
        except Exception as e:
            print(f"ℹ️ Fix status check: {e}")
            
        conn.commit()

    # 2. Get or Create Admin User
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        print(f"User {email} not found. Creating...")
        # Note: Password hash not set here, user should login with Google
        user = models.User(
            email=email,
            full_name="Jacques Giraudeau (Admin)",
            role=models.UserRole.ADMIN,
            status=models.UserStatus.ACTIVE,
            is_active=True,
            plan_selection="enterprise"
        )
        db.add(user)
    else:
        print(f"User found: {user.full_name}. Updating role...")
        user.role = models.UserRole.ADMIN
        user.status = models.UserStatus.ACTIVE
        user.is_active = True
        user.plan_selection = "enterprise"
    
    db.commit()
    print("✅ Admin privileges restored successfully.")
    print("   Role: ADMIN")
    print("   Status: ACTIVE")
    print("   Active: True")
    
    db.close()

if __name__ == "__main__":
    restore_admin()
