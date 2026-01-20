import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from backend.app import models

class EmailService:
    def __init__(self):
        # Brevo (Sendinblue) Defaults
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp-relay.brevo.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")

    def _send_email(self, to_email: str, subject: str, body_html: str):
        if not self.smtp_user or not self.smtp_password:
            print("⚠️ SMTP credentials not set. Email skipped.")
            return

        try:
            msg = MIMEMultipart()
            msg['From'] = self.smtp_user
            msg['To'] = to_email
            msg['Subject'] = subject

            msg.attach(MIMEText(body_html, 'html'))

            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()  # Secure the connection
            server.login(self.smtp_user, self.smtp_password)
            text = msg.as_string()
            server.sendmail(self.smtp_user, to_email, text)
            server.quit()
            print(f"✅ Email sent to {to_email}")
        except Exception as e:
            print(f"❌ Failed to send email: {e}")

    def send_welcome_email(self, user: models.User):
        """Called when user registers (Status: PENDING)"""
        subject = "Bienvenue sur Professeur Virtuel - Demande reçue"
        body = f"""
        <html>
            <body>
                <h2>Bonjour {user.full_name},</h2>
                <p>Votre demande d'inscription a bien été reçue.</p>
                <p>Un administrateur va examiner votre dossier sous peu.</p>
                <p>Vous recevrez un email de confirmation une fois votre compte validé.</p>
                <br>
                <p>L'équipe Professeur Virtuel</p>
            </body>
        </html>
        """
        # Fallback to console if no creds
        if not self.smtp_user:
            print(f"📧 [MOCK] Welcome Email to {user.email}")
        else:
            self._send_email(user.email, subject, body)

    def send_approval_email(self, user: models.User):
        """Called when admin validates account (Status: ACTIVE)"""
        subject = "Compte validé ! Accédez à Professeur Virtuel"
        body = f"""
        <html>
            <body>
                <h2>Félicitations {user.full_name},</h2>
                <p>Votre compte a été validé par notre équipe.</p>
                <p>Vous avez choisi la formule : <strong>{user.plan_selection}</strong></p>
                <p>Connectez-vous dès maintenant : <a href="{os.getenv('FRONTEND_URL', 'http://localhost:3000')}">Accéder à l'application</a></p>
            </body>
        </html>
        """
        if not self.smtp_user:
            print(f"📧 [MOCK] Approval Email to {user.email}")
        else:
            self._send_email(user.email, subject, body)

    def send_rejection_email(self, user: models.User):
        subject = "Concernant votre demande d'inscription"
        body = f"""
        <html>
            <body>
                <p>Bonjour {user.full_name},</p>
                <p>Nous ne pouvons pas donner suite à votre demande pour le moment.</p>
            </body>
        </html>
        """
        if not self.smtp_user:
            print(f"📧 [MOCK] Rejection Email to {user.email}")
        else:
            self._send_email(user.email, subject, body)

email_service = EmailService()
