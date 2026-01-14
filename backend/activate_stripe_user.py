"""
Script pour activer manuellement un compte après un paiement Stripe test.
Simule ce que le webhook aurait fait automatiquement.
"""

import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
import app.models as models

def activate_user_subscription(user_email: str):
    """
    Active l'abonnement d'un utilisateur après paiement Stripe.
    
    Args:
        user_email: Email de l'utilisateur à activer
    """
    db = SessionLocal()
    
    try:
        # 1. Trouver l'utilisateur
        user = db.query(models.User).filter(models.User.email == user_email).first()
        
        if not user:
            print(f"❌ Utilisateur non trouvé : {user_email}")
            return False
        
        print(f"\n✅ Utilisateur trouvé : {user.email}")
        print(f"   - ID: {user.id}")
        print(f"   - Nom: {user.full_name}")
        print(f"   - Statut actuel: {user.status}")
        print(f"   - Plan actuel: {user.plan_selection}")
        
        # 2. Mettre à jour le plan
        user.plan_selection = "subscription"
        print(f"\n🔄 Mise à jour du plan → subscription")
        
        # 3. Activer le compte
        user.status = "active"
        print(f"🔄 Mise à jour du statut → active")
        
        # 4. Simuler le customer_id Stripe (optionnel)
        if not user.stripe_customer_id:
            user.stripe_customer_id = "cus_test_simulation"
            print(f"🔄 Ajout d'un customer_id Stripe de test")
        
        # 5. Sauvegarder
        db.commit()
        db.refresh(user)
        
        print(f"\n✅ SUCCÈS ! Compte activé")
        print(f"\n📊 Nouveau statut :")
        print(f"   - Statut: {user.status}")
        print(f"   - Plan: {user.plan_selection}")
        print(f"   - Stripe Customer ID: {user.stripe_customer_id}")
        
        print(f"\n🚀 Vous pouvez maintenant vous reconnecter et accéder au dashboard !")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
        db.rollback()
        return False
        
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("🔧 ACTIVATION MANUELLE DE COMPTE STRIPE")
    print("=" * 60)
    
    # Par défaut, activer l'utilisateur jacques.giraudeau@gmail.com
    # Vous pouvez passer un email en argument : python activate_stripe_user.py email@example.com
    
    if len(sys.argv) > 1:
        email = sys.argv[1]
    else:
        email = "jacques.giraudeau@gmail.com"
    
    print(f"\n📧 Email de l'utilisateur : {email}")
    print(f"\n⚠️  Ce script va :")
    print(f"   1. Mettre plan_selection = 'subscription'")
    print(f"   2. Mettre status = 'active'")
    print(f"   3. Ajouter un stripe_customer_id de test\n")
    
    response = input("Voulez-vous continuer ? (o/n) : ")
    
    if response.lower() in ['o', 'oui', 'y', 'yes']:
        activate_user_subscription(email)
    else:
        print("\n❌ Opération annulée")
