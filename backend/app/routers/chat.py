from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.services.gemini_service import gemini_service

router = APIRouter()

from typing import Optional, List

class ChatRequest(BaseModel):
    message: str
    file_id: Optional[str] = None
    history: List[dict] = []
    category: Optional[str] = None

class ChatResponse(BaseModel):
    response: str

from fastapi import Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.auth import get_current_user
from backend.app.models import User
from backend.app.services.usage_service import check_and_increment_usage

# ...

@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Endpoint for chat interaction with optional file context and history.
    """
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Check Quota
    check_and_increment_usage(db, current_user, 'chat_message')

    # Lazy import knowledge base
    from backend.app.services.knowledge_service import knowledge_base
    
    # Get knowledge files for the requested category
    target_category = request.category if request.category else 'NDRC'
    kb_files = knowledge_base.get_file_ids_by_category(target_category)
    
    # Normalize track for regulatory grounding
    normalized_track = "NDRC"
    if target_category.upper() in ["NDRC", "MCO", "GPME", "CEJM"]:
        normalized_track = target_category.upper()
    elif "ndrc" in target_category.lower():
        normalized_track = "NDRC"

    # We pass the category to help grounding instructions
    answer = gemini_service.chat_with_history(
        request.message, 
        history=request.history, 
        file_uri=request.file_id,
        knowledge_files=kb_files,
        context_label=target_category,
        track=normalized_track
    )
    return ChatResponse(response=answer)
