import os
import google.generativeai as genai
from dotenv import load_dotenv

def test_gemini_connection():
    # 1. Load Environment Variables
    load_dotenv()
    
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ ERREUR: La clé API 'GOOGLE_API_KEY' est introuvable dans le fichier .env")
        print("➡️  Veuillez créer un fichier .env dans le dossier backend avec votre clé.")
        return

    print(f"✅ Clé API trouvée: {api_key[:5]}...*****")

    # 2. Configure Gemini
    try:
        genai.configure(api_key=api_key)
        print("✅ Configuration Gemini OK.")
    except Exception as e:
        print(f"❌ Erreur de configuration: {e}")
        return

    # 3. List Available Models
    print("\n🔍 Recherche des modèles disponibles...")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"   - {m.name}")
    except Exception as e:
        print(f"❌ Erreur lors du listing des modèles : {e}")

    # 4. Robust Test Generation
    print("\n📡 Test de connexion en cours (Génération de texte)...")
    
    # 4. Smart Auto-Discovery Test
    print("\n📡 Test de connexion en cours (Mode Auto-Découverte)...")
    
    available_models = []
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                available_models.append(m.name)
    except Exception as e:
        print(f"❌ Impossible de lister les modèles pour l'auto-découverte : {e}")
        return

    if not available_models:
        print("❌ Aucun modèle compatible 'generateContent' trouvé.")
        return
        
    print(f"ℹ️ {len(available_models)} modèles compatibles trouvés. Test du premier disponible...")

    # Sort to try 'flash' or 'pro' first if available, otherwise take the first one
    # This prefers models with shorter names (usually stable versions)
    available_models.sort(key=lambda x: len(x)) 
    
    success = False
    for model_name in available_models:
        # We prioritize flash models for speed in this test
        print(f"👉 Tentative avec : {model_name}...")
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content("Dis bonjour au Professeur Virtuel en une phrase.")
            print(f"\n🤖 Réponse de Gemini ({model_name}) :\n> {response.text}")
            print("\n🎉 SUCCÈS : La connexion à Gemini est opérationnelle !")
            success = True
            break
        except Exception as e:
            print(f"   ⚠️ Échec : {str(e)[:100]}...")

    if not success:
         print("\n❌ TOUS les tests ont échoué. Vérifiez votre clé API ou les quotas.")
         return

    # 5. Test File Upload & Comprehension
    print("\n📄 Test d'analyse de document (RAG Native)...")
    file_path = "conception_systeme.md"
    
    if not os.path.exists(file_path):
        print(f"⚠️ Fichier non trouvé : {file_path}")
        return

    print(f"👉 Upload de {file_path}...")
    try:
        # Upload file with explicit mime type
        uploaded_file = genai.upload_file(file_path, mime_type="text/markdown")
        print(f"   ID Fichier: {uploaded_file.name}")
        
        # Wait for processing
        import time
        while uploaded_file.state.name == "PROCESSING":
            print("   ⏳ Traitement en cours...")
            time.sleep(2)
            uploaded_file = genai.get_file(uploaded_file.name)
            
        if uploaded_file.state.name == "FAILED":
             print("❌ L'upload a échoué.")
             return

        print("   ✅ Fichier prêt.")

        # Ask question
        print("👉 Question: 'Quels sont les modules principaux du projet ?'")
        
        # Force use of a Multimodal model (Flash is best for this)
        # We look for 'flash' in the available models we found earlier
        pro_model_name = next((m for m in available_models if "flash" in m), None)
        
        if not pro_model_name:
             # Fallback to any 1.5 model
             pro_model_name = next((m for m in available_models if "1.5" in m), available_models[0])

        print(f"👉 Utilisation du modèle Multimodal : {pro_model_name}")
        
        model = genai.GenerativeModel(pro_model_name)
        
        response = model.generate_content(
            [uploaded_file, "Quels sont les modules principaux décrit dans ce document ? Fais une liste à puces."]
        )
        print(f"\n🤖 Réponse de Gemini :\n{response.text}")
        print("\n🎉 SUCCÈS : Gemini a lu et compris le fichier !")
        
    except Exception as e:
        print(f"\n❌ ÉCHEC du test de fichier : {e}")

if __name__ == "__main__":
    test_gemini_connection()


if __name__ == "__main__":
    test_gemini_connection()
