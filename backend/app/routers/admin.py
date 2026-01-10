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
    """Simple health check endpoint."""
    return {"status": "healthy"}
