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
    status: Optional[str] = "pending"
    plan_selection: Optional[str] = "trial"

@router.get("/users", response_model=List[UserAdminView])
def get_all_users(
    skip: int = 0, 
    limit: int = 100, 
    status: Optional[str] = None, # Add status filter
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    query = db.query(models.User)
    if status:
        query = query.filter(models.User.status == status)
    users = query.offset(skip).limit(limit).all()
    
    return [
        UserAdminView(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            # Role and Status are now Strings in the DB model, so we access them directly.
            role=u.role if u.role else "teacher",
            organization_name=u.organization.name if u.organization else None,
            last_login=u.last_login,
            is_active=u.is_active if u.is_active is not None else True,
            status=u.status if u.status else "pending", # Just use the string
            plan_selection=u.plan_selection or "trial"
        )
        for u in users
    ]

class StatusUpdate(BaseModel):
    is_active: Optional[bool] = None
    status: Optional[str] = None

@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    status_update: StatusUpdate,
    current_user: models.User = Depends(auth.get_current_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.id == current_user.id:
        if status_update.is_active is not None and not status_update.is_active:
             raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        if status_update.status and status_update.status.upper() in ["PENDING", "REJECTED"]:
             raise HTTPException(status_code=400, detail="Cannot change your own account status to pending or rejected")

    # Handle Active/Inactive Toggle
    if status_update.is_active is not None:
        user.is_active = status_update.is_active
        
    # Handle Status Change (Validation)
    # Handle Status Change (Validation)
    if status_update.status:
        # Validate roughly
        new_status_str = status_update.status.lower() # Normalize to lowercase
        if new_status_str not in ["active", "pending", "rejected"]:
             raise HTTPException(status_code=400, detail=f"Invalid status: {status_update.status}")

        old_status = user.status
        user.status = new_status_str
        
        # If moving to ACTIVE (Validation), ensure is_active is True and send email
        if new_status_str == "active" and old_status != "active":
            user.is_active = True
            try:
                from backend.app.services.email_service import email_service
                email_service.send_approval_email(user)
            except Exception as e:
                print(f"Warning: Email sending failed: {e}")
            
        # If REJECTED
        if new_status_str == "rejected":
            user.is_active = False
            try:
                from backend.app.services.email_service import email_service
                email_service.send_rejection_email(user)
            except Exception as e:
                print(f"Warning: Email sending failed: {e}")
            
    db.commit()
    db.refresh(user)
    return {"message": "User status updated", "user_id": user.id, "is_active": user.is_active}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_user: models.User = Depends(auth.get_current_admin_user), # Changed dependency
    db: Session = Depends(get_db)
):
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

@router.post("/scan")
def scan_knowledge_base(
    current_user: models.User = Depends(auth.get_current_admin_user)
):
    """
    Manually triggers the scanning of the 'knowledge' directory
    and uploads new files to Gemini.
    """
    try:
        from backend.app.services.knowledge_service import knowledge_base
        files = knowledge_base.scan_and_load()
        return {
            "message": "Synchronisation terminée avec succès", 
            "files_count": len(files) if files else 0
        }
    except Exception as e:
        print(f"Error during scan: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors du scan: {str(e)}")
