"""
Temporary Admin Setup Endpoint
⚠️ SECURITY WARNING: This endpoint should be DISABLED in production after first use!
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
from .. import models, auth
from ..database import get_db

router = APIRouter()

# Security: Use a strong setup secret from environment
SETUP_SECRET = os.getenv("ADMIN_SETUP_SECRET", "")
SETUP_ENABLED = os.getenv("ENABLE_ADMIN_SETUP", "false").lower() == "true"


class AdminSetupRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str  # Initial password (user should change it)


@router.post("/setup-admin")
def setup_first_admin(
    setup_request: AdminSetupRequest,
    x_setup_secret: str = Header(..., description="Admin setup secret"),
    db: Session = Depends(get_db)
):
    """
    Create the first admin user in production.
    
    ⚠️ This endpoint should only be used ONCE to bootstrap the admin account.
    
    Required Header:
    - X-Setup-Secret: Must match ADMIN_SETUP_SECRET environment variable
    
    Environment Variables Required:
    - ENABLE_ADMIN_SETUP=true (to enable this endpoint)
    - ADMIN_SETUP_SECRET=<your-secret-key> (to authenticate)
    """
    
    # Check if endpoint is enabled
    if not SETUP_ENABLED:
        raise HTTPException(
            status_code=403,
            detail="Admin setup endpoint is disabled. Set ENABLE_ADMIN_SETUP=true to enable."
        )
    
    # Check if setup secret is configured
    if not SETUP_SECRET:
        raise HTTPException(
            status_code=500,
            detail="ADMIN_SETUP_SECRET not configured on server"
        )
    
    # Verify setup secret
    if x_setup_secret != SETUP_SECRET:
        raise HTTPException(
            status_code=403,
            detail="Invalid setup secret"
        )
    
    # Check if an admin already exists
    existing_admin = db.query(models.User).filter(
        models.User.role == "admin"
    ).first()
    
    if existing_admin:
        raise HTTPException(
            status_code=400,
            detail=f"Admin already exists: {existing_admin.email}. Disable this endpoint."
        )
    
    # Check if user with this email already exists
    existing_user = db.query(models.User).filter(
        models.User.email == setup_request.email
    ).first()
    
    if existing_user:
        # Promote existing user to admin
        existing_user.role = "admin"
        existing_user.is_active = True
        existing_user.status = "active"
        db.commit()
        db.refresh(existing_user)
        
        return {
            "success": True,
            "message": f"User {setup_request.email} promoted to admin",
            "user_id": existing_user.id,
            "action": "promoted"
        }
    
    # Create new admin user
    try:
        # Create organization if needed
        org = db.query(models.Organization).first()
        if not org:
            org = models.Organization(
                name="Default Organization",
                plan="enterprise"
            )
            db.add(org)
            db.flush()
        
        new_admin = models.User(
            email=setup_request.email,
            full_name=setup_request.full_name,
            hashed_password=auth.get_password_hash(setup_request.password),
            role="admin",
            organization_id=org.id,
            is_active=True,
            status="active",
            plan_selection="subscription"
        )
        
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        
        return {
            "success": True,
            "message": f"Admin user {setup_request.email} created successfully",
            "user_id": new_admin.id,
            "action": "created",
            "next_steps": [
                "1. Log in with your new admin credentials",
                "2. Set ENABLE_ADMIN_SETUP=false in Railway to disable this endpoint",
                "3. Change your password from the dashboard"
            ]
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create admin user: {str(e)}"
        )
