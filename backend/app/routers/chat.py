from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
import logging

# Relative imports to fix "No module named backend.app" errors
from ..services.gemini_service import gemini_service
from ..database import get_db
from ..auth import get_current_user
from ..models import User
from ..services.usage_service import check_and_increment_usage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    file_id: Optional[str] = None
    history: List[dict] = []
    category: Optional[str] = None

class ChatResponse(BaseModel):
    response: str

@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Endpoint for chat interaction with optional file context and history.
    """
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Check Quota
    check_and_increment_usage(db, current_user, 'chat_message')

    # Lazy import knowledge base with relative path safety
    try:
        from ..services.knowledge_service import knowledge_base
    except ImportError as e:
        logger.error(f"Knowledge base import failed: {e}")
        # Fallback if import fails (should not happen with relative logic)
        raise HTTPException(status_code=500, detail="Internal Error: Knowledge Base Service Unavailable")
    
    # Get knowledge files for the requested category
    target_category = request.category if request.category else 'NDRC'
    kb_files = knowledge_base.get_file_ids_by_category(target_category)
    
    # Normalize track for regulatory grounding
    normalized_track = "NDRC"
    if target_category and target_category.upper() in ["NDRC", "MCO", "GPME", "CEJM"]:
        normalized_track = target_category.upper()
    elif target_category and "ndrc" in target_category.lower():
        normalized_track = "NDRC"

    # Call Gemini Service
    try:
        answer = gemini_service.chat_with_history(
            request.message, 
            history=request.history, 
            file_uri=request.file_id,
            knowledge_files=kb_files,
            context_label=target_category,
            track=normalized_track
        )
        return ChatResponse(response=str(answer))
    except Exception as e:
        logger.error(f"Gemini Chat Error: {e}")
        raise HTTPException(status_code=500, detail=f"IA Error: {str(e)}")
