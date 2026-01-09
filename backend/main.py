from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.app.routers import chat
from backend.app.routers import documents
from backend.app.routers import generate
from backend.app.routers import export
from backend.app.routers import dashboard
from backend.app.routers import student
from backend.app.database import engine, Base
import backend.app.models as models

# Lifespan event to load knowledge base on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    print("📦 Initializing database...")
    try:
        models.Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"⚠️ Database initialization failed: {e}")

    # Startup: Load knowledge base (Non-blocking to avoid startup timeouts)
    print("🚀 Application starting up...")
    try:
        import threading
        from backend.app.services.knowledge_service import knowledge_base
        # Run scan in background thread
        threading.Thread(target=knowledge_base.scan_and_load, daemon=True).start()
    except Exception as e:
        print(f"⚠️ Knowledge base background start failed: {e}")
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

@app.get("/")
def read_root():
    return {"status": "online", "message": "Bienvenue sur l'API du Professeur Virtuel"}
