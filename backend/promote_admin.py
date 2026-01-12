from app.database import SessionLocal, engine
from app import models, auth
import sys

def promote_to_admin(email: str):
    # 1. Create Tables
    models.Base.metadata.create_all(bind=engine)
    print("✅ Database tables created.")

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print(f"User {email} not found. Creating as ADMIN...")
            # Create new admin user
            new_org = models.Organization(name="Admin Org", plan=models.PlanType.ENTERPRISE)
            db.add(new_org)
            db.flush()
            
            new_user = models.User(
                email=email,
                hashed_password=auth.get_password_hash("admin123"), # Temporary pwd
                full_name="Admin User",
                role=models.UserRole.ADMIN,
                organization_id=new_org.id,
                is_active=True
            )
            db.add(new_user)
            db.commit()
            print(f"✅ User {email} created as ADMIN.")
        else:
            print(f"Found user: {user.full_name} ({user.role})")
            user.role = models.UserRole.ADMIN
            user.is_active = True
            db.commit()
            print(f"✅ User {email} promoted to ADMIN.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    email = "jacques.giraudeau@gmail.com"
    promote_to_admin(email)
