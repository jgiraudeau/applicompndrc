from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from .. import models, auth
from ..database import get_db

router = APIRouter()

class PlanUpdate(BaseModel):
    plan: str # 'trial' or 'subscription'

@router.patch("/me/plan")
def update_user_plan(
    plan_update: PlanUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    # Accept beta_pro for the beta period
    allowed_plans = ["trial", "subscription", "beta_pro"]
    if plan_update.plan not in allowed_plans:
        raise HTTPException(status_code=400, detail="Invalid plan selection")
    
    current_user.plan_selection = plan_update.plan
    
    # BETA LOGIC: Auto-activate everyone for now to reduce friction
    if plan_update.plan == "beta_pro" or plan_update.plan == "trial":
        current_user.status = "active"
    
    db.commit()
    return {"message": "Plan updated", "plan": current_user.plan_selection, "status": current_user.status}
