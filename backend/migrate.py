from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Migrating...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'pending'"))
            print("✅ Added 'status' column")
        except Exception as e:
            print(f"ℹ️ Status column might exist: {e}")

        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN plan_selection VARCHAR DEFAULT 'trial'"))
            print("✅ Added 'plan_selection' column")
        except Exception as e:
            print(f"ℹ️ Plan column might exist: {e}")
            
        conn.commit()
    print("Done.")

if __name__ == "__main__":
    migrate()
