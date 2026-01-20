from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime
import enum
import uuid

# Enums
class PlanType(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class UserRole(str, enum.Enum):
    ADMIN = "admin" # SaaS Admin
    SCHOOL_ADMIN = "school_admin" # Principal / Manager
    TEACHER = "teacher"
    STUDENT = "student"

class UserStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"

# SaaS Core Models
class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True)
    plan = Column(Enum(PlanType), default=PlanType.FREE)
    stripe_customer_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="organization")
    # We will eventually link other resources here

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    # Using String for flexibility, validation handled by Pydantic/App logic
    role = Column(String, default="teacher") 
    status = Column(String, default="pending")
    plan_selection = Column(String, default="trial") # 'trial' or 'subscription'
    stripe_customer_id = Column(String, nullable=True) # Added for subscription tracking
    is_active = Column(Boolean, default=True) # Technical active state (can be banned even if approved)
    last_login = Column(DateTime, nullable=True)
    
    # Usage Tracking (Free Tier Limits)
    created_at = Column(DateTime, default=datetime.utcnow)
    generation_count = Column(Integer, default=0)
    chat_message_count = Column(Integer, default=0)
    
    organization_id = Column(String, ForeignKey("organizations.id"))
    organization = relationship("Organization", back_populates="users")
    
    chat_sessions = relationship("ChatSession", back_populates="user")
    saved_documents = relationship("SavedDocument", back_populates="user")

# Chat History Models
class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String, default="Nouvelle conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"))
    role = Column(String) # "user" or "model"
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")

# Legacy / Feature Models (Updated for SaaS support later)
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    document_type = Column(String)
    topic = Column(String)
    duration_hours = Column(Float, nullable=True)
    target_block = Column(String, nullable=True)
    is_published = Column(DateTime, nullable=True)
    share_code = Column(String, unique=True, index=True, nullable=True)
    user_id = Column(String, index=True, nullable=True) # Linked to User
    
    # Ideally, we should link this to User/Org too, but keeping it loose for now

class PublishedQuiz(Base):
    __tablename__ = "published_quizzes"

    id = Column(Integer, primary_key=True, index=True)
    share_code = Column(String, unique=True, index=True)
    title = Column(String)
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class SavedDocument(Base):
    __tablename__ = "saved_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), index=True)
    title = Column(String)
    content = Column(Text)
    document_type = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="saved_documents")
