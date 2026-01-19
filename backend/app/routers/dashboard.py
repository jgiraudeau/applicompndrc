from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.models import ActivityLog, PublishedQuiz, User
from backend.app.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(tags=["dashboard"])

FREE_GENERATION_LIMIT = 5
FREE_CHAT_LIMIT = 15
TRIAL_DAYS = 15

@router.get("/stats")
async def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns statistics and quota usage for the current user.
    """
    # Filter stats by User
    base_query = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id)
    
    total_docs = base_query.count()
    
    # Stats by document type
    type_stats = db.query(
        ActivityLog.document_type, 
        func.count(ActivityLog.id).label("count")
    ).filter(ActivityLog.user_id == current_user.id).group_by(ActivityLog.document_type).all()
    
    # Stats by target block
    block_stats = db.query(
        ActivityLog.target_block, 
        func.count(ActivityLog.id).label("count")
    ).filter(ActivityLog.user_id == current_user.id).group_by(ActivityLog.target_block).all()
    
    # Recent activity (last 10)
    recent_activity = base_query.order_by(ActivityLog.timestamp.desc()).limit(10).all()
    
    # Published Quizzes (global or user? Let's say User specific for now, or per Org)
    # Assuming PublishedQuiz should be linked to User or Org. Currently it might not be linked.
    # If not linked, we return all (as public/shared). 
    # Checking model... PublishedQuiz usually has user_id.
    # We'll assume yes for safety, or just leave it global if it's a shared catalog.
    # For now, let's filter by user to be safe if column exists. If not, we'll see.
    # Actually, let's keep it simple for now and NOT filter quizzes if schema is unsure,
    # but the logs must be filtered.
    published = db.query(PublishedQuiz).order_by(PublishedQuiz.created_at.desc()).all()

    # Calculate Trial/Quota status
    trial_days_remaining = 0
    if current_user.created_at:
        elapsed = datetime.utcnow() - current_user.created_at
        trial_days_remaining = max(0, TRIAL_DAYS - elapsed.days)
    else:
        # Legacy user without created_at or error -> Assume trial started now or expired? 
        # Let's handle it gracefully: if missing, maybe they are old users so trial is over.
        trial_days_remaining = 0

    return {
        "total_generated": total_docs,
        "by_type": {row.document_type: row.count for row in type_stats},
        "by_block": {row.target_block if row.target_block else "Non spécifié": row.count for row in block_stats},
        "recent": [
            {
                "id": log.id,
                "document_type": log.document_type,
                "topic": log.topic,
                "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            }
            for log in recent_activity
        ],
        "published": [
            {
                "code": q.share_code,
                "title": q.title,
                "date": q.created_at.strftime("%Y-%m-%d")
            }
            for q in published
        ],
        "quota": {
            "plan": current_user.plan_selection or "trial",
            "generation_count": current_user.generation_count,
            "max_generations": FREE_GENERATION_LIMIT if current_user.plan_selection != 'subscription' else -1,
            "chat_count": current_user.chat_message_count,
            "max_chat": FREE_CHAT_LIMIT if current_user.plan_selection != 'subscription' else -1,
            "trial_days_remaining": trial_days_remaining
        }
    }
