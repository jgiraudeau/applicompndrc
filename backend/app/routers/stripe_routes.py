from fastapi import APIRouter, HTTPException, Request, Header
from fastapi.responses import JSONResponse
import stripe
import os
from .. import models
from ..database import get_db
from sqlalchemy.orm import Session
from fastapi import Depends

router = APIRouter()

# Initialize Stripe with your Secret Key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

# Frontend URL for success/cancel redirects
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3001")

@router.post("/create-checkout-session")
async def create_checkout_session(data: dict):
    price_id = data.get("priceId")
    email = data.get("email") # Optional, to pre-fill
    user_id = data.get("userId") # To track who is paying

    if not price_id:
        raise HTTPException(status_code=400, detail="Missing priceId")

    try:
        checkout_session = stripe.checkout.Session.create(
            line_items=[
                {
                    # Use inline price data for easier testing without pre-creating products
                    'price_data': {
                        'currency': 'eur',
                        'product_data': {
                            'name': 'Abonnement Professeur Virtuel Pro',
                        },
                        'unit_amount': 999, # 9.99 EUR
                        'recurring': {
                            'interval': 'month',
                        },
                    },
                    'quantity': 1,
                },
            ],
            mode='subscription',
            success_url=FRONTEND_URL + '/onboarding?success=true&session_id={CHECKOUT_SESSION_ID}',
            cancel_url=FRONTEND_URL + '/onboarding?canceled=true',
            customer_email=email,
            metadata={
                'user_id': user_id
            }
        )
        return {"url": checkout_session.url}
    except Exception as e:
        print(f"Stripe Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def webhook_received(request: Request, stripe_signature: str = Header(None), db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = stripe_signature
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Fulfill the purchase...
        user_id = session.get('metadata', {}).get('user_id')
        customer_id = session.get('customer')
        
        if user_id:
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if user:
                print(f"Payment success for user {user.email}. Activating subscription.")
                user.plan_selection = "subscription"
                user.stripe_customer_id = customer_id
                user.status = models.UserStatus.ACTIVE 
                # (You might want to set status active here too if default was pending)
                
                db.commit()

                # Send Confirmation Email
                try:
                    from backend.app.services.email_service import email_service
                    email_service.send_approval_email(user)
                except Exception as e:
                    print(f"Failed to send approval email: {e}")

    return {"status": "success"}

@router.get("/verify-session/{session_id}")
async def verify_session(session_id: str, db: Session = Depends(get_db)):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session.payment_status == 'paid':
            user_id = session.metadata.get('user_id')
            customer_id = session.customer
            
            if user_id:
                user = db.query(models.User).filter(models.User.id == user_id).first()
                if user:
                    print(f"Manual Verified Payment for user {user.email}. Activating subscription.")
                    user.plan_selection = "subscription"
                    user.stripe_customer_id = customer_id
                    user.status = "active"
                    db.commit()
                    return {"status": "active", "plan": "subscription"}
        
        return {"status": "pending"}
    except Exception as e:
        print(f"Error verifying session: {e}")
        raise HTTPException(status_code=400, detail="Invalid Session ID")
