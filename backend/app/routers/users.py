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
    if plan_update.plan not in ["trial", "subscription"]:
        raise HTTPException(status_code=400, detail="Invalid plan selection")
    
    current_user.plan_selection = plan_update.plan
    
    # Auto-activate if Trial is selected
    if plan_update.plan == "trial":
        current_user.status = models.UserStatus.ACTIVE
        current_user.is_active = True

    db.commit()
    return {"message": "Plan updated", "plan": current_user.plan_selection, "status": current_user.status}
