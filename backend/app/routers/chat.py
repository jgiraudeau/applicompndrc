from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.services.gemini_service import gemini_service

router = APIRouter()

from typing import Optional, List

class ChatRequest(BaseModel):
    message: str
    file_id: Optional[str] = None
    history: List[dict] = []
    category: Optional[str] = "bts_ndrc"

class ChatResponse(BaseModel):
    response: str

@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint for chat interaction with optional file context and history.
    """
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Lazy import knowledge base
    from backend.app.services.knowledge_service import knowledge_base
    
    # Get knowledge files for the requested category
    target_category = request.category if request.category else 'bts_ndrc'
    kb_files = knowledge_base.get_file_ids_by_category(target_category)
    
    # We pass the category to help grounding instructions
    answer = gemini_service.chat_with_history(
        request.message, 
        history=request.history, 
        file_uri=request.file_id,
        knowledge_files=kb_files,
        context_label=target_category
    )
    return ChatResponse(response=answer)
