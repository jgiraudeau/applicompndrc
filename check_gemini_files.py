
import os
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv

# Config
PROJECT_ROOT = Path(__file__).resolve().parent
KNOWLEDGE_DIR = PROJECT_ROOT / "backend/knowledge"
ENV_PATH = PROJECT_ROOT / "backend/.env"

# Load Env
load_dotenv(dotenv_path=ENV_PATH)
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    api_key = input("Clé API non trouvée. Entrez votre GOOGLE_API_KEY : ")

genai.configure(api_key=api_key)

print("\n�️‍♂️ AUDIT COMPLET : LOCAL vs GEMINI\n")

# 1. Scan Local Files
print("📂 1. Scanning Local 'knowledge' folder...")
local_files = {}

if not KNOWLEDGE_DIR.exists():
    print(f"❌ Erreur : Dossier {KNOWLEDGE_DIR} introuvable.")
else:
    for root, dirs, files in os.walk(KNOWLEDGE_DIR):
        # Filtrer dossiers cachés
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for file in files:
            if file.startswith('.') or file.startswith('~$'): continue
            
            ext = os.path.splitext(file)[1].lower()
            if ext in ['.pdf', '.txt', '.md', '.docx', '.doc']:
                # On utilise le nom du fichier comme clé unique (attention aux doublons de noms dans des sous-dossiers différents)
                local_files[file] = os.path.join(root, file)

print(f"   => {len(local_files)} documents éligibles trouvés en local.\n")

# 2. Scan Gemini Files
print("☁️  2. Scanning Gemini Storage...")
gemini_files = set()
try:
    remote_list = list(genai.list_files())
    for f in remote_list:
        gemini_files.add(f.display_name)
    print(f"   => {len(gemini_files)} documents actifs trouvés sur Gemini.\n")
except Exception as e:
    print(f"❌ Erreur Gemini : {e}")
    exit()

# 3. Compare
print("⚖️  3. Comparaison...")
missing_on_gemini = []
present_both = []

for local_name in local_files.keys():
    if local_name in gemini_files:
        present_both.append(local_name)
    else:
        missing_on_gemini.append(local_name)

# 4. Report
print("-" * 60)
print(f"✅ Synchronisés : {len(present_both)}")
print(f"⚠️  Manquants sur Gemini : {len(missing_on_gemini)}")
print("-" * 60)

if missing_on_gemini:
    print("\n� LISTE DES FICHIERS MANQUANTS (À VECTORISER) :")
    for name in missing_on_gemini:
        print(f" - {name}")
    print("\n💡 SOLUTION : Allez dans l'Admin Panel > Vectoriser Nouveaux Fichiers.")
else:
    print("\n✨ TOUT EST À JOUR ! Tous vos fichiers locaux sont bien sur Gemini.")

print("-" * 60)
input("\nAppuyez sur Entrée pour quitter...")
