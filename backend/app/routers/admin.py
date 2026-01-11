from fastapi import APIRouter, BackgroundTasks, HTTPException
import threading

router = APIRouter()

# Track scan status
scan_status = {"running": False, "files_loaded": 0, "message": "Not started"}

def _run_scan():
    """Background task to scan and load knowledge base."""
    global scan_status
    scan_status = {"running": True, "files_loaded": 0, "message": "Scanning..."}
    
    try:
        from backend.app.services.knowledge_service import knowledge_base
        loaded = knowledge_base.scan_and_load()
        scan_status = {
            "running": False, 
            "files_loaded": len(loaded) if loaded else 0,
            "message": "Scan completed successfully"
        }
    except Exception as e:
        scan_status = {"running": False, "files_loaded": 0, "message": f"Error: {e}"}

@router.post("/scan")
async def trigger_knowledge_scan():
    """
    Manually trigger the knowledge base scan.
    This uploads all files from /knowledge to Gemini.
    """
    global scan_status
    
    if scan_status["running"]:
        return {"status": "already_running", "message": "A scan is already in progress"}
    
    # Start scan in background thread
    thread = threading.Thread(target=_run_scan, daemon=True)
    thread.start()
    
    return {
        "status": "started",
        "message": "Knowledge base scan started in background. Check /api/admin/scan/status for progress."
    }

@router.get("/scan/status")
async def get_scan_status():
    """Get the current status of the knowledge base scan."""
    return scan_status

@router.get("/health")
async def health_check():
    """Deep health check endpoint."""
    status = {
        "status": "healthy",
        "env": {},
        "gemini": "unknown"
    }
    
    # 1. Check Env
    import os
    key = os.getenv("GOOGLE_API_KEY")
    status["env"]["GOOGLE_API_KEY_PRESENT"] = bool(key)
    if key:
        status["env"]["GOOGLE_API_KEY_LENGTH"] = len(key)
        
    # 2. Check Gemini
    try:
        from backend.app.services.gemini_service import gemini_service
        # Test Generation
        response = gemini_service.chat_with_history("Ping check")
        if "Error" in response or "Désolé" in response:
            status["gemini"] = f"Failed: {response}"
            status["status"] = "degraded"
        else:
            status["gemini"] = "operational"
            status["gemini_response_sample"] = response[:50]
    except Exception as e:
        status["gemini"] = f"Exception: {str(e)}"
        status["status"] = "unhealthy"
        
    return status
