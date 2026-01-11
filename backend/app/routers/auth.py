from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from .. import models, auth
from ..database import get_db
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import secrets

import os

# GOOGLE_CLIENT_ID should be fetched from environment
# to ensure it matches the frontend's configuration.

# Schemas
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    organization_name: str
    plan: str = "free"

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    organization_name: str
    role: str

@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # 1. Check if user exists
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Map string plan to Enum
    plan_map = {
        "free": models.PlanType.FREE,
        "pro": models.PlanType.PRO,
        "enterprise": models.PlanType.ENTERPRISE
    }
    selected_plan = plan_map.get(user_data.plan, models.PlanType.FREE)

    # 3. Create Organization
    new_org = models.Organization(
        name=user_data.organization_name,
        plan=selected_plan
    )
    db.add(new_org)
    # db.commit() -> Moved to end to ensure atomicity
    # db.refresh(new_org) -> Not strictly needed if we flush, but let's keep it simple. 
    # Actually, we need new_org.id for the user. db.flush() is better.
    db.flush()

    # 4. Create User
    hashed_pwd = auth.get_password_hash(user_data.password)
    new_user = models.User(
        email=user_data.email,
        hashed_password=hashed_pwd,
        full_name=user_data.full_name,
        organization_id=new_org.id,
        role=models.UserRole.SCHOOL_ADMIN # First user is Admin of their school
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 5. Generate Token
    access_token = auth.create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "organization_name": current_user.organization.name,
        "role": current_user.role
    }

class GoogleToken(BaseModel):
    token: str

@router.post("/google", response_model=Token)
def google_login(token_data: GoogleToken, db: Session = Depends(get_db)):
    try:
        token = token_data.token
        
        # Fetch Client ID from Env
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        if not client_id:
            # Fallback for local debugging if .env is missing, but prefer Env.
            client_id = "217122577762-f6glm4d9hod0vc2jlee2th8nhmaeinlf.apps.googleusercontent.com"

        # Validate Google Token
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id) 
        
        email = idinfo['email']
        name = idinfo.get('name', 'Utilisateur Google')
        
        # Check if user exists
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            # Create a new user automatically
            org_name = f"Org de {name}"
            new_org = models.Organization(name=org_name, plan=models.PlanType.FREE)
            db.add(new_org)
            db.flush()
            
            hashed_pwd = auth.get_password_hash(secrets.token_urlsafe(16)) # Random password
            new_user = models.User(
                email=email,
                hashed_password=hashed_pwd,
                full_name=name,
                organization_id=new_org.id,
                role=models.UserRole.TEACHER
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user = new_user
            
        access_token = auth.create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
        
    except ValueError as ve:
         print(f"Google Token Validation Error: {ve}")
         raise HTTPException(status_code=400, detail="Invalid Google Token")
    except Exception as e:
        print(f"Google Login Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
