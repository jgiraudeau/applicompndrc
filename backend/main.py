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
from backend.app.database import engine, Base
import backend.app.models as models

# Lifespan event to load knowledge base on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    print("📦 Initializing database...")
    try:
        # Use run_sync for table creation if using async (but here we use sync engine)
        # models.Base.metadata.create_all(bind=engine)
        print("⏭️ Skipping DB init to debug startup hang")
    except Exception as e:
        print(f"⚠️ Database initialization failed (Non-fatal, continuing startup): {e}")

    # Startup: Knowledge base scan is now MANUAL to avoid Railway startup timeouts
    # Use POST /api/admin/scan to trigger the scan after deployment
    print("🚀 Application starting up... (Version 0.2.1)")
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
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(classroom.router, prefix="/api/classroom", tags=["classroom"])

@app.get("/")
def read_root():
    return {"status": "online", "message": "Bienvenue sur l'API du Professeur Virtuel"}
