from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.services.gemini_service import gemini_service

router = APIRouter()

from typing import Optional, List

class ChatRequest(BaseModel):
    message: str
    file_id: Optional[str] = None
    history: List[dict] = []

class ChatResponse(BaseModel):
    response: str

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Endpoint for chat interaction with optional file context and history.
    """
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    answer = gemini_service.chat_with_history(request.message, history=request.history, file_uri=request.file_id)
    return ChatResponse(response=answer)
