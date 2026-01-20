import smtplib
import os
from dotenv import load_dotenv

# Load env manually since we are running script standalone
load_dotenv("backend/.env")

smtp_server = os.getenv("SMTP_SERVER")
smtp_port = int(os.getenv("SMTP_PORT", "587"))
smtp_user = os.getenv("SMTP_USER")
smtp_password = os.getenv("SMTP_PASSWORD")

print(f"Testing SMTP to {smtp_server}:{smtp_port}")
print(f"User: {smtp_user}")

try:
    server = smtplib.SMTP(smtp_server, smtp_port)
    server.starttls()
    server.login(smtp_user, smtp_password)
    print("✅ SMTP Authentication SUCCESS!")
    server.quit()
except Exception as e:
    print(f"❌ SMTP Authentication FAILED: {e}")
