
from fastapi import HTTPException
from datetime import datetime, timedelta
from .. import models

# LIMITS
FREE_GENERATION_LIMIT = 5
FREE_CHAT_LIMIT = 15
FREE_TRIAL_DAYS = 15

def check_and_increment_usage(db, user: models.User, action_type: str):
    """
    Checks if the user is allowed to perform an action based on their plan and usage.
    Increments the counter if allowed.
    
    action_type: 'generate_course' or 'chat_message'
    """
    
    # 1. Bypass for Paid Users (Pro, Enterprise, Admin)
    # Checks if plan_selection is 'subscription' OR role is admin
    if user.plan_selection == 'subscription' or user.role == models.UserRole.ADMIN:
        return True # Unlimited access

    # 2. Free Tier Checks
    
    # A. Time Limit (15 days)
    # If created_at is None (legacy users), we might need a fallback or treat them as strict.
    # For now, let's assume if created_at is missing, we give them the benefit of the doubt or set it to now.
    user_creation = user.created_at or datetime.utcnow()
    trial_end_date = user_creation + timedelta(days=FREE_TRIAL_DAYS)
    
    if datetime.utcnow() > trial_end_date:
        raise HTTPException(
            status_code=403, 
            detail=f"Votre période d'essai de {FREE_TRIAL_DAYS} jours est terminée. Veuillez passer à l'abonnement Pro."
        )

    # B. Usage Limits
    if action_type == 'generate_course':
        if user.generation_count >= FREE_GENERATION_LIMIT:
            raise HTTPException(
                status_code=403, 
                detail=f"Vous avez atteint la limite de {FREE_GENERATION_LIMIT} générations pour l'essai gratuit. Passez en Pro pour l'illimité."
            )
        user.generation_count += 1

    elif action_type == 'chat_message':
        if user.chat_message_count >= FREE_CHAT_LIMIT:
            raise HTTPException(
                status_code=403, 
                detail=f"Vous avez atteint la limite de {FREE_CHAT_LIMIT} messages pour l'essai gratuit. Passez en Pro pour l'illimité."
            )
        user.chat_message_count += 1
    
    db.commit()
    return True
