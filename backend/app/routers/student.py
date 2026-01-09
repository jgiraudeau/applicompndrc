from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import ActivityLog, PublishedQuiz
from pydantic import BaseModel
import uuid
from datetime import datetime

router = APIRouter(tags=["student"])

class PublishRequest(BaseModel):
    log_id: int
    content: str
    title: str

@router.post("/publish")
async def publish_quiz(request: PublishRequest, db: Session = Depends(get_db)):
    """
    Publishes a quiz for students and generates a unique code.
    """
    # Check if document exists
    log = db.query(ActivityLog).filter(ActivityLog.id == request.log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Generate unique share code
    share_code = str(uuid.uuid4())[:8].upper()
    
    # Check if already published
    existing = db.query(PublishedQuiz).filter(PublishedQuiz.share_code == share_code).first()
    while existing:
        share_code = str(uuid.uuid4())[:8].upper()
        existing = db.query(PublishedQuiz).filter(PublishedQuiz.share_code == share_code).first()

    # Create published entry
    new_quiz = PublishedQuiz(
        share_code=share_code,
        title=request.title,
        content=request.content
    )
    db.add(new_quiz)
    
    # Mark activity log as published
    log.is_published = datetime.utcnow()
    log.share_code = share_code
    
    db.commit()
    
    return {"share_code": share_code}

@router.get("/quiz/{code}")
async def get_student_quiz(code: str, db: Session = Depends(get_db)):
    """
    Retrieves a published quiz using its share code.
    """
    quiz = db.query(PublishedQuiz).filter(PublishedQuiz.share_code == code).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz introuvable ou code invalide")
    
    return {
        "title": quiz.title,
        "content": quiz.content
    }
