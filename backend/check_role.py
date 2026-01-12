from app.database import SessionLocal
from app import models
import sys

def check_user_role(email: str):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print(f"❌ User not found: {email}")
        else:
            print(f"✅ User found: {user.full_name} <{user.email}>")
            print(f"   Role: {user.role}")
            print(f"   Active: {user.is_active}")
            print(f"   ID: {user.id}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    email = "jacques.giraudeau@gmail.com"
    check_user_role(email)
