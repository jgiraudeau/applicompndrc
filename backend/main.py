from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.app.routers import chat
from backend.app.routers import documents
from backend.app.routers import generate
from backend.app.routers import export
from backend.app.routers import dashboard
from backend.app.routers import student
from backend.app.routers import admin
from backend.app.routers import auth
from backend.app.routers import classroom
from backend.app.routers import users # Added this line
from backend.app.database import engine, Base
import backend.app.models as models

# Lifespan event to load knowledge base on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    print("📦 Initializing database...")
    try:
        # Create tables if they don't exist
        models.Base.metadata.create_all(bind=engine)
        print("✅ Database tables checked/created.")
        
        # Simple Migration: Add missing columns if they don't exist (SQLite/Postgres compatible-ish)
        from sqlalchemy import text
        with engine.connect() as conn:
            try:
                # Check if is_active exists
                conn.execute(text("SELECT is_active FROM users LIMIT 1"))
            except Exception:
                print("⚠️ Column 'is_active' missing. Adding it...")
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                conn.commit()

            try:
                # Check if last_login exists
                conn.execute(text("SELECT last_login FROM users LIMIT 1"))
            except Exception:
                print("⚠️ Column 'last_login' missing. Adding it...")
                conn.execute(text("ALTER TABLE users ADD COLUMN last_login DATETIME"))
                conn.commit()

            try:
                # Check if status exists
                conn.execute(text("SELECT status FROM users LIMIT 1"))
            except Exception:
                print("⚠️ Column 'status' missing. Adding it...")
                conn.execute(text("ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'pending'"))
                conn.commit()
            
            # Fix uppercase Statuses (should be lowercase)
            try:
                conn.execute(text("UPDATE users SET status='pending' WHERE status='PENDING'"))
                conn.execute(text("UPDATE users SET status='active' WHERE status='ACTIVE'"))
                conn.execute(text("UPDATE users SET status='rejected' WHERE status='REJECTED'"))
                conn.commit()
            except Exception:
                pass
                
            # Fix uppercase Roles (should be lowercase)
            try:
                conn.execute(text("UPDATE users SET role='admin' WHERE role='ADMIN'"))
                conn.execute(text("UPDATE users SET role='teacher' WHERE role='TEACHER'"))
                conn.execute(text("UPDATE users SET role='student' WHERE role='STUDENT'"))
                conn.execute(text("UPDATE users SET role='school_admin' WHERE role='SCHOOL_ADMIN'"))
                conn.commit()
            except Exception:
                pass

            try:
                # Check if plan_selection exists
                conn.execute(text("SELECT plan_selection FROM users LIMIT 1"))
            except Exception:
                print("⚠️ Column 'plan_selection' missing. Adding it...")
                conn.execute(text("ALTER TABLE users ADD COLUMN plan_selection VARCHAR DEFAULT 'trial'"))
                conn.commit()
                
        print("✅ Schema migration checks complete.")
        
    except Exception as e:
        print(f"⚠️ Database initialization failed (Non-fatal): {e}")

    # Startup: Knowledge base scan is now MANUAL to avoid Railway startup timeouts
    # Use POST /api/admin/scan to trigger the scan after deployment
    print("🚀 Application starting up... (Version 0.2.2)")
    print("ℹ️ Knowledge base scan is DISABLED at startup. Use POST /api/admin/scan to load files.")
    yield
    # Shutdown
    print("👋 Application shutting down...")

app = FastAPI(title="Professeur Virtuel API", version="0.2.0", lifespan=lifespan)

# Configure CORS (allow frontend to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Set to False to allow wildcard origins in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(generate.router, prefix="/api/generate", tags=["generate"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(student.router, prefix="/api/student", tags=["student"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
# app.include_router(admin.router, prefix="/api/admin", tags=["admin"]) # Removed duplicate
app.include_router(users.router, prefix="/api/users", tags=["users"]) # Added this line

@app.get("/")
def read_root():
    return {"status": "online", "message": "Bienvenue sur l'API du Professeur Virtuel"}
