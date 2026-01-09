from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.models import ActivityLog, PublishedQuiz
from datetime import datetime, timedelta

router = APIRouter(tags=["dashboard"])

@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """
    Returns statistics for the dashboard.
    """
    total_docs = db.query(ActivityLog).count()
    
    # Stats by document type
    type_stats = db.query(
        ActivityLog.document_type, 
        func.count(ActivityLog.id).label("count")
    ).group_by(ActivityLog.document_type).all()
    
    # Stats by target block
    block_stats = db.query(
        ActivityLog.target_block, 
        func.count(ActivityLog.id).label("count")
    ).group_by(ActivityLog.target_block).all()
    
    # Recent activity (last 10)
    recent_activity = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(10).all()
    
    # Published Quizzes
    published = db.query(PublishedQuiz).order_by(PublishedQuiz.created_at.desc()).all()

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
        ]
    }
