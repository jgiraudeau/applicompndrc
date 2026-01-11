from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from .. import models, auth
from ..database import get_db

router = APIRouter()

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
