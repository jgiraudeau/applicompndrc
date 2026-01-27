
import os
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

# Load env vars safely by finding the backend root (2 levels up from services)
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)
print(f"DEBUG: Loading .env from {env_path}")
API_KEY = os.getenv("GOOGLE_API_KEY")

REGULATORY_GROUNDINGS = {
    "NDRC": """
RÈGLES OFFICIELLES BTS NDRC (Source : Circulaire 2024) - À APPLIQUER STRICTEMENT :
- E4 (Relation client et négociation-vente) : Peut être en CCF ou Ponctuel Oral.
- E5 A (Relation client à distance et digitalisation) : Épreuve exclusivement PONCTUELLE ÉCRITE (3h). Ne peut JAMAIS être au format CCF.
- E5 B (Relation client à distance et digitalisation) : Épreuve exclusivement PONCTUELLE PRATIQUE (Poste informatique).
- E6 (Relation client et animation de réseaux) : Peut être en CCF ou Ponctuel Oral.
- E11 (Culture Générale) & E3 (CEJM) : Épreuves exclusivement PONCTUELLES ÉCRITES.
- Bloc 2 (Animation Réseaux / Digitalisation) : Soumis à des règles de non-CCF pour certaines parties.

CONSIGNE : Ne jamais inventer de modalités d'examen. Si une demande de l'utilisateur contredit ces règles (ex: demander un CCF pour l'E5), refuse poliment en citant le règlement.
""",
    "MCO": """
RÈGLES OFFICIELLES BTS MCO (Management Commercial Opérationnel) - À APPLIQUER STRICTEMENT :
- E41 (Développement de la relation client et vente conseil) : Épreuve orale ou CCF.
- E42 (Animation et dynamisation de l'offre commerciale) : Épreuve orale ou CCF.
- E5 (Gestion opérationnelle) : Épreuve écrite (Etude de cas).
- E6 (Management de l'équipe commerciale) : Épreuve orale ou CCF.
- CEJM : Épreuve écrite ponctuelle.

CONSIGNE : Respecte scrupuleusement le référentiel du BTS MCO. Ne jamais inventer de modalités contraires au règlement officiel.
""",
    "GPME": """
RÈGLES OFFICIELLES BTS GPME (Gestion de la PME) - À APPLIQUER STRICTEMENT :
- E4 (Gérer la relation avec les clients et les fournisseurs de la PME) : Oral / CCF.
- E5 (Participer à la gestion des risques de la PME) : Écrit.
- E6 (Gérer le personnel et contribuer à la GRH) : Oral / CCF.
- Atelier de Professionnalisation : Cadre spécifique.

CONSIGNE : Respecte le référentiel officiel du BTS GPME pour toutes les productions.
""",
    "CEJM": """
RÈGLES OFFICIELLES CEJM (Culture Économique, Juridique et Managériale) :
- Épreuve E3 commune à plusieurs BTS tertiaires.
- Format : Épreuve écrite ponctuelle de 4 heures.
- Objectifs : Analyser une situation d'entreprise sous les angles économique, juridique et managérial.

CONSIGNE : Toutes les études de cas ou questions doivent croiser les trois dimensions (Éco, Droit, Management).
"""
}

class GeminiService:
    def __init__(self):
        self._model_name = None
        if not API_KEY:
             print("⚠️ WARNING: GOOGLE_API_KEY is missing. Gemini features will fail.")
             return
        
        try:
            genai.configure(api_key=API_KEY)
            # Lazy loading: Don't call _find_best_model() here to avoid blocking startup
            # self.model_name will be resolved on first property access
        except Exception as e:
            print(f"❌ Gemini config failed: {e}")

    @property
    def model_name(self):
        if self._model_name:
            return self._model_name
        
        try:
            print("🕵️ Auto-detecting best Gemini model...")
            self._model_name = self._find_best_model()
            print(f"✅ Selected model: {self._model_name}")
        except Exception as e:
             print(f"⚠️ Model detection failed ({e}). Fallback to flash.")
             self._model_name = "gemini-1.5-flash"
        
        return self._model_name

    def _find_best_model(self):
        """Auto-detects the best available model, preferring Flash."""
        try:
            available = [m.name for m in genai.list_models() if "generateContent" in m.supported_generation_methods]
            # Priority: Flash > 1.5 > Pro > Any
            if not available:
                raise Exception("No available Gemini models found.")
            
            best = next((m for m in available if "flash" in m), None)
            if not best:
                best = next((m for m in available if "1.5" in m), available[0])
            return best
        except Exception as e:
            # Re-raise to be caught by the property
            raise e

    def get_model(self, custom_system_instruction: str = "", track: str = "NDRC"):
        """Returns a GenerativeModel with regulatory grounding and custom instructions."""
        # Get specific grounding or fallback to generic/NDRC
        grounding = REGULATORY_GROUNDINGS.get(track, REGULATORY_GROUNDINGS["NDRC"])
        
        full_system_instruction = grounding
        if custom_system_instruction:
            full_system_instruction += "\n" + custom_system_instruction
        
        return genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=full_system_instruction
        )

    def upload_file_to_gemini(self, file_path: str, mime_type: str = None):
        """Uploads a file to Gemini, avoiding duplicates."""
        try:
            display_name = os.path.basename(file_path)
            
            # Check if file exists based on display_name
            # Note: list_files() returns an iterable. We check active files.
            for f in genai.list_files():
                if f.display_name == display_name:
                    print(f"   ℹ️ File '{display_name}' already exists on Gemini (URI: {f.uri}). Skipping upload.")
                    return f

            print(f"👉 Uploading {file_path} to Gemini...")
            if mime_type:
                uploaded_file = genai.upload_file(file_path, mime_type=mime_type, display_name=display_name)
            else:
                uploaded_file = genai.upload_file(file_path, display_name=display_name)
            
            print(f"   File ID: {uploaded_file.name}")
            
            # Wait for processing
            import time
            while uploaded_file.state.name == "PROCESSING":
                print("   ⏳ Processing...")
                time.sleep(1)
                uploaded_file = genai.get_file(uploaded_file.name)
                
            if uploaded_file.state.name == "FAILED":
                 raise Exception("File processing failed on Gemini side.")

            print("   ✅ File ready.")
            return uploaded_file
        except Exception as e:
            print(f"❌ Upload failed: {e}")
            raise e

    def chat_with_file(self, message: str, file_obj):
        """Chat with a specific file context."""
        try:
            model = self.get_model()
            response = model.generate_content([file_obj, message])
            return response.text
        except Exception as e:
            return f"Error: {e}"

    def chat_with_history(self, message: str, history: list = [], file_uri: str = None, knowledge_files: list = [], context_label: str = "", track: str = "NDRC"):
        """Chat with conversation history, optional specific file, and knowledge base files."""
        try:
            # Add context instruction if label provided
            system_instruction = ""
            if context_label:
                system_instruction = f"\nContexte spécifique : Tu es un expert du domaine '{context_label}'. Utilise les documents fournis pour répondre avec précision."
            
            model = self.get_model(custom_system_instruction=system_instruction, track=track)
            
            chat_history = []
            
            # 0. Add Knowledge Base Files (Context)
            if knowledge_files:
                print(f"📚 Including {len(knowledge_files)} knowledge files in context.")
                kb_parts = ["Voici des documents de référence (Knowledge Base) :"]
                valid_files = False
                for kf_name in knowledge_files:
                    try:
                        # Convert name to file object reference if possible, or assume it's valid
                        # The API usually takes the file object or the URI/Name directly?
                        # Using get_file to accept it as content part.
                        kf_obj = genai.get_file(kf_name)
                        kb_parts.append(kf_obj)
                        valid_files = True
                    except Exception as e:
                        print(f"⚠️ Could not load knowledge file {kf_name}: {e}")
                
                if valid_files:
                    kb_parts.append("Utilise ces connaissances pour répondre aux questions futures.")
                    chat_history.append({
                        "role": "user",
                        "parts": kb_parts
                    })
                    chat_history.append({
                        "role": "model",
                        "parts": ["Bien compris. J'ai pris connaissance de la base documentaire."]
                    })

            # 1. Add Specific File Context (User Uploaded)
            if file_uri:
                print(f"👉 Including file context: {file_uri}")
                try:
                    file_obj = genai.get_file(file_uri)
                    # We inject the file as a user message
                    chat_history.append({
                        "role": "user",
                        "parts": [file_obj, "Voici un document spécifique que je fournis."]
                    })
                    chat_history.append({
                        "role": "model",
                        "parts": ["Bien reçu. J'analyserai ce document."]
                    })
                except Exception as e:
                    print(f"⚠️ Could not retrieve file {file_uri}: {e}")
            
            # 2. Add Conversation History
            for msg in history:
                role = "user" if msg['role'] == "user" else "model"
                # Ensure parts is valid
                content = msg.get('content', '')
                if content:
                    chat_history.append({
                        "role": role,
                        "parts": [content]
                    })

            # 3. Start Chat Session
            chat = model.start_chat(history=chat_history)
            
            # 4. Send new message
            response = chat.send_message(message)
            return response.text
        except Exception as e:
            print(f"❌ Gemini Error: {e}")
            return f"Désolé, une erreur est survenue avec l'IA : {e}"

# Singleton instance
gemini_service = GeminiService()
