
import os
from google import genai
from dotenv import load_dotenv
from pathlib import Path

# Load environment
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("GOOGLE_API_KEY")

def format_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

def check_status():
    if not API_KEY:
        print("❌ Erreur : GOOGLE_API_KEY manquante.")
        return

    print("🔍 Connexion à Google Gemini...")
    try:
        client = genai.Client(api_key=API_KEY)
        
        print("\n📂 Fichiers indexés dans le RAG (Stockage Google) :")
        print("-" * 60)
        print(f"{'Nom du fichier':<40} | {'Taille':<10} | {'URI':<30}")
        print("-" * 60)

        total_size = 0
        count = 0
        
        # List all files
        # Note: The API might return an iterable
        files = client.files.list()
        
        for f in files:
            # size_bytes might be in `size_bytes` attribute or typical metadata
            # New SDK usually has size_bytes attribute on the File object
            try:
                size = f.size_bytes
            except:
                size = 0 # Fallback if attribute missing
                
            total_size += size
            count += 1
            print(f"{f.display_name[:38]:<40} | {format_size(size):<10} | {f.name[:30]}...")

        print("-" * 60)
        print(f"\n📊 TOTAL : {count} fichiers")
        print(f"💾 Utilisation Stockage : {format_size(total_size)}")
        
        # Limite standard gratuite souvent autour de 20GB pour Gemini API File Storage
        LIMIT_GB = 20
        usage_gb = total_size / (1024**3)
        percent = (usage_gb / LIMIT_GB) * 100
        
        print(f"📉 Estimation Quota Gratuit (~20GB) : {percent:.4f}% utilisé")
        
        print("\nℹ️  Note : Pour les TOKENS, le contexte est de 1 à 2 Millions par requête.")
        print("    Vous êtes probablement très loin de la limite par requête.")

    except Exception as e:
        print(f"❌ Erreur lors de la récupération : {e}")

if __name__ == "__main__":
    check_status()
