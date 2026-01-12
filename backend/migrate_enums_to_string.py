"""
Migration script to convert Enum columns to VARCHAR in production PostgreSQL database.
Run this ONCE on the production database to fix the Admin Console issue.
"""
import os
from sqlalchemy import create_engine, text

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment")
    exit(1)

engine = create_engine(DATABASE_URL)

print("🔧 Migrating Enum columns to VARCHAR...")

with engine.connect() as conn:
    try:
        # Step 1: Create temporary columns
        print("1. Creating temporary VARCHAR columns...")
        conn.execute(text("ALTER TABLE users ADD COLUMN role_temp VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN status_temp VARCHAR"))
        conn.commit()
        
        # Step 2: Copy data
        print("2. Copying data to temp columns...")
        conn.execute(text("UPDATE users SET role_temp = role::text"))
        conn.execute(text("UPDATE users SET status_temp = status::text"))
        conn.commit()
        
        # Step 3: Drop old Enum columns
        print("3. Dropping old Enum columns...")
        conn.execute(text("ALTER TABLE users DROP COLUMN role"))
        conn.execute(text("ALTER TABLE users DROP COLUMN status"))
        conn.commit()
        
        # Step 4: Rename temp columns
        print("4. Renaming temp columns...")
        conn.execute(text("ALTER TABLE users RENAME COLUMN role_temp TO role"))
        conn.execute(text("ALTER TABLE users RENAME COLUMN status_temp TO status"))
        conn.commit()
        
        # Step 5: Set defaults
        print("5. Setting default values...")
        conn.execute(text("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'teacher'"))
        conn.execute(text("ALTER TABLE users ALTER COLUMN status SET DEFAULT 'pending'"))
        conn.commit()
        
        print("✅ Migration complete!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
