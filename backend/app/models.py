from sqlalchemy import Column, Integer, String, DateTime, Float
from .database import Base
from datetime import datetime

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    document_type = Column(String)
    topic = Column(String)
    duration_hours = Column(Float, nullable=True)
    target_block = Column(String, nullable=True)
    is_published = Column(DateTime, nullable=True) # If not null, it's public
    share_code = Column(String, unique=True, index=True, nullable=True)

class PublishedQuiz(Base):
    __tablename__ = "published_quizzes"

    id = Column(Integer, primary_key=True, index=True)
    share_code = Column(String, unique=True, index=True)
    title = Column(String)
    content = Column(String) # The Markdown content
    created_at = Column(DateTime, default=datetime.utcnow)
