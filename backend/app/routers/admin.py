from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from .. import models, auth
from ..database import get_db

router = APIRouter()

class UserAdminView(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    organization_name: Optional[str] = None
    last_login: Optional[datetime] = None
    is_active: bool
    created_at: Optional[datetime] = None

@router.get("/users", response_model=List[UserAdminView])
def get_all_users(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    users = db.query(models.User).all()
    # Simple serialization loop
    return [
        UserAdminView(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role.value if u.role else "teacher",
            organization_name=u.organization.name if u.organization else None,
            last_login=u.last_login,
            is_active=u.is_active if u.is_active is not None else True
        )
        for u in users
    ]

class StatusUpdate(BaseModel):
    is_active: bool

@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    status_update: StatusUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.ADMIN:
         raise HTTPException(status_code=403, detail="Admin privileges required")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    user.is_active = status_update.is_active
    db.commit()
    return {"message": "User status updated", "is_active": user.is_active}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != models.UserRole.ADMIN:
         raise HTTPException(status_code=403, detail="Admin privileges required")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Admin cannot delete themselves")

    # Manually delete dependencies if cascading is not set up perfectly or for safety
    # In models.py we have usage of relationship but let's trust cascading or delete user directly if configured
    # For now, deleting the user.
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}
