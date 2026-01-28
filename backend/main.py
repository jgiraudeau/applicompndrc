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
from backend.app.routers import stripe_routes # Added this line
from backend.app.routers import google_integration # New Google Integration
from backend.app.routers import setup # Temporary admin setup endpoint
from backend.app.database import engine, Base
import backend.app.models as models
import os

# Lifespan event to load knowledge base on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    print("📦 Initializing database...")
    try:
        # Create tables if they don't exist
        models.Base.metadata.create_all(bind=engine)
        print("✅ Database tables checked/created.")
        
        # Robust Migration using Inspector to avoid transaction errors
        from sqlalchemy import inspect, text
        
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if "users" in existing_tables:
            columns = [col["name"] for col in inspector.get_columns("users")]
            
            with engine.connect() as conn:
                # helper to add column safely
                def add_column_if_missing(col_name, col_type_sql):
                    if col_name not in columns:
                        print(f"⚠️ Column '{col_name}' missing. Adding it...")
                        try:
                            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type_sql}"))
                            conn.commit()
                        except Exception as e:
                            print(f"Failed to add {col_name}: {e}")
                            conn.rollback()

                add_column_if_missing("is_active", "BOOLEAN DEFAULT true")
                add_column_if_missing("last_login", "TIMESTAMP")
                add_column_if_missing("status", "VARCHAR DEFAULT 'pending'")
                add_column_if_missing("plan_selection", "VARCHAR DEFAULT 'trial'")
                add_column_if_missing("stripe_customer_id", "VARCHAR")
                add_column_if_missing("generation_count", "INTEGER DEFAULT 0")
                add_column_if_missing("chat_message_count", "INTEGER DEFAULT 0")
                add_column_if_missing("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                
                # Fix Uppercase values (Data cleanup)
                try:
                    conn.execute(text("UPDATE users SET status='pending' WHERE status='PENDING'"))
                    conn.execute(text("UPDATE users SET status='active' WHERE status='ACTIVE'"))
                    conn.execute(text("UPDATE users SET status='rejected' WHERE status='REJECTED'"))
                    conn.execute(text("UPDATE users SET role='admin' WHERE role='ADMIN'"))
                    conn.execute(text("UPDATE users SET role='teacher' WHERE role='TEACHER'"))
                    conn.execute(text("UPDATE users SET role='student' WHERE role='STUDENT'"))
                    conn.commit()
                except Exception:
                    conn.rollback()

        if "activity_logs" in existing_tables:
            alog_columns = [col["name"] for col in inspector.get_columns("activity_logs")]
            with engine.connect() as conn:
                if "user_id" not in alog_columns:
                     print("⚠️ Column 'user_id' missing in activity_logs. Adding it...")
                     try:
                        conn.execute(text("ALTER TABLE activity_logs ADD COLUMN user_id VARCHAR"))
                        conn.commit()
                     except:
                        conn.rollback()
                
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
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    os.getenv("FRONTEND_URL", "https://applicompndrc.vercel.app"),
    "https://applicompndrc.vercel.app",
    "https://applicompndrc-git-main-giraudeaus-projects.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # TEMPORARY RESTORE: Fix Failed to Fetch
    allow_credentials=True,
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
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
# app.include_router(admin.router, prefix="/api/admin", tags=["admin"]) # Removed duplicate
app.include_router(users.router, prefix="/api/users", tags=["users"]) # Added this line
app.include_router(stripe_routes.router, prefix="/api/stripe", tags=["stripe"])
app.include_router(google_integration.router, prefix="/api/google", tags=["google"])
app.include_router(classroom.router, prefix="/api/classroom", tags=["classroom"])
app.include_router(setup.router, prefix="/api/setup", tags=["setup"])  # ⚠️ TEMPORARY - Disable after first admin creation

@app.get("/")
def read_root():
    return {"status": "online", "message": "Bienvenue sur l'API du Professeur Virtuel"}
