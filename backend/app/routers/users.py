from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app import models, auth
from app.database import get_db

router = APIRouter()

class PlanUpdate(BaseModel):
    plan: str # 'trial' or 'subscription'

@router.patch("/me/plan")
def update_user_plan(
    plan_update: PlanUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if plan_update.plan not in ["trial", "subscription"]:
        raise HTTPException(status_code=400, detail="Invalid plan selection")
    
    current_user.plan_selection = plan_update.plan
    # We keep status as PENDING until admin approves, but this marks the onboarding step as "done" from user side?
    # Maybe we don't need to change status, just save the plan.
    # The Admin will see the selected plan in the "Demandes" tab.
    
    db.commit()
    return {"message": "Plan updated", "plan": current_user.plan_selection}
