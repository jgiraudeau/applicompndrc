from app import models

class EmailService:
    def __init__(self):
        # In the future, init SMTP client here
        pass

    def send_welcome_email(self, user: models.User):
        """Called when user registers (Status: PENDING)"""
        print("---------------------------------------------------------")
        print(f"📧 [MOCK EMAIL] To: {user.email}")
        print(f"Subject: Bienvenue sur Professeur Virtuel - Demande reçue")
        print(f"Bonjour {user.full_name},")
        print("Votre demande d'inscription a bien été reçue.")
        print("Un administrateur va examiner votre dossier sous peu.")
        print("Vous recevrez un email de confirmation une fois votre compte validé.")
        print("---------------------------------------------------------")

    def send_approval_email(self, user: models.User):
        """Called when admin validates account (Status: ACTIVE)"""
        print("---------------------------------------------------------")
        print(f"📧 [MOCK EMAIL] To: {user.email}")
        print(f"Subject: Compte validé ! Accédez à Professeur Virtuel")
        print(f"Félicitations {user.full_name},")
        print("Votre compte a été validé par notre équipe.")
        print(f"Vous avez choisi la formule : {user.plan_selection}")
        print("Connectez-vous dès maintenant : http://localhost:3000")
        print("---------------------------------------------------------")

    def send_rejection_email(self, user: models.User):
        print("---------------------------------------------------------")
        print(f"📧 [MOCK EMAIL] To: {user.email}")
        print(f"Subject: Concernant votre demande d'inscription")
        print("Nous ne pouvons pas donner suite à votre demande pour le moment.")
        print("---------------------------------------------------------")

email_service = EmailService()
