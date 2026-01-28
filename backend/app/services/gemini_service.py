

import os
from google import genai
from google.genai import types
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

class LegacyCompatibleModel:
    """Wraps the new google-genai Client to mimic the old GenerativeModel behavior."""
    def __init__(self, client: genai.Client, model_name: str, system_instruction: str):
        self.client = client
        self.model_name = model_name
        self.system_instruction = system_instruction

    def generate_content(self, contents):
        config = types.GenerateContentConfig(system_instruction=self.system_instruction)
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config
            )
            return response
        except Exception as e:
            print(f"❌ Gemini generate_content failed: {e}")
            raise e
    
    def start_chat(self, history=None):
        return LegacyCompatibleChat(self.client, self.model_name, self.system_instruction, history)

class LegacyCompatibleChat:
    def __init__(self, client, model_name, system_instruction, history):
        self.client = client
        self.model_name = model_name
        self.config = types.GenerateContentConfig(system_instruction=system_instruction)
        self.chat = self.client.chats.create(
            model=model_name,
            config=self.config,
            history=history or []
        )

    def send_message(self, message):
        return self.chat.send_message(message)

class GeminiService:
    def __init__(self):
        self._model_name = None
        self.client = None
        if not API_KEY:
             print("⚠️ WARNING: GOOGLE_API_KEY is missing. Gemini features will fail.")
             return
        
        try:
            self.client = genai.Client(api_key=API_KEY)
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
             print(f"⚠️ Model detection failed ({e}). Fallback to gemini-1.5-flash.")
             self._model_name = "gemini-1.5-flash"
        
        return self._model_name

    def _find_best_model(self):
        """Auto-detects the best available model, preferring Flash."""
        try:
            # New SDK uses client.models.list() which returns iterables of model objects
            # Assuming model object has .name attribute
            models = list(self.client.models.list())
            available = [m.name for m in models if "generateContent" in (m.supported_generation_methods or [])]
            
            # Since names in new SDK might be 'models/gemini-1.5-flash', we filter string containment
            if not available:
                # Fallback if supported_generation_methods is empty or not present in some versions
                available = [m.name for m in models]

            best = next((m for m in available if "flash" in m), None)
            if not best:
                best = next((m for m in available if "1.5" in m), available[0] if available else None)
            
            # Clean up 'models/' prefix if present for uniformity, though new SDK usually handles both
            if best and best.startswith("models/"):
                 best = best.replace("models/", "")
                 
            return best or "gemini-1.5-flash"
        except Exception as e:
            # Re-raise to be caught by the property
            raise e

    def get_model(self, custom_system_instruction: str = "", track: str = "NDRC"):
        """Returns a LegacyCompatibleModel with regulatory grounding and custom instructions."""
        grounding = REGULATORY_GROUNDINGS.get(track, REGULATORY_GROUNDINGS["NDRC"])
        
        full_system_instruction = grounding
        if custom_system_instruction:
            full_system_instruction += "\n" + custom_system_instruction
        
        return LegacyCompatibleModel(
            client=self.client,
            model_name=self.model_name,
            system_instruction=full_system_instruction
        )

    def upload_file_to_gemini(self, file_path: str, mime_type: str = None):
        """Uploads a file to Gemini, avoiding duplicates."""
        try:
            display_name = os.path.basename(file_path)
            
            # Check existing files
            # client.files.list() returns iterable
            existing_files = self.client.files.list()
            for f in existing_files:
                if f.display_name == display_name:
                    print(f"   ℹ️ File '{display_name}' already exists on Gemini (URI: {f.uri}). Skipping upload.")
                    return f

            print(f"👉 Uploading {file_path} to Gemini...")
            with open(file_path, "rb") as f:
                # New SDK: client.files.upload(file=..., config=...)
                # file argument can be path or IO
                uploaded_file = self.client.files.upload(
                    file=f,
                    config=types.UploadFileConfig(
                       display_name=display_name, 
                       mime_type=mime_type
                    )
                )
            
            print(f"   File ID: {uploaded_file.name}")
            
            # Wait for processing
            import time
            while uploaded_file.state.name == "PROCESSING":
                print("   ⏳ Processing...")
                time.sleep(1)
                uploaded_file = self.client.files.get(name=uploaded_file.name)
                
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
            # file_obj should be valid content part. New SDK handles it.
            # Convert file_obj (from files.get style) to just string URI if needed, or pass directly?
            # Usually passing the file object works if it has 'uri' or 'name'.
            # However, new SDK prefers types.Part.from_uri(...) or just the object if compatible.
            # Let's try passing the object wrapped in a list.
            response = model.generate_content([file_obj, message])
            return response.text
        except Exception as e:
            return f"Error: {e}"

    def chat_with_history(self, message: str, history: list = [], file_uri: str = None, knowledge_files: list = [], context_label: str = "", track: str = "NDRC"):
        """Chat with conversation history, optional specific file, and knowledge base files."""
        try:
            # Add context instruction
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
                        # kf_name is expected to be the file ID/Name (e.g. files/xxxx)
                        kf_obj = self.client.files.get(name=kf_name)
                        kb_parts.append(kf_obj)
                        valid_files = True
                    except Exception as e:
                        print(f"⚠️ Could not load knowledge file {kf_name}: {e}")
                
                if valid_files:
                    kb_parts.append("Utilise ces connaissances pour répondre aux questions futures.")
                    chat_history.append(types.Content(
                        role="user",
                        parts=[types.Part.from_text(text=str(p)) if isinstance(p, str) else types.Part.from_uri(file_uri=p.uri, mime_type=p.mime_type) for p in kb_parts]
                    ))
                    chat_history.append(types.Content(
                        role="model",
                        parts=[types.Part.from_text(text="Bien compris. J'ai pris connaissance de la base documentaire.")]
                    ))

            # 1. Add Specific File Context (User Uploaded)
            if file_uri:
                print(f"👉 Including file context: {file_uri}")
                try:
                    file_obj = self.client.files.get(name=file_uri)
                    # We inject the file as a user message
                    chat_history.append(types.Content(
                        role="user",
                        parts=[
                            types.Part.from_uri(file_uri=file_obj.uri, mime_type=file_obj.mime_type),
                            types.Part.from_text(text="Voici un document spécifique que je fournis.")
                        ]
                    ))
                    chat_history.append(types.Content(
                        role="model",
                        parts=[types.Part.from_text(text="Bien reçu. J'analyserai ce document.")]
                    ))
                except Exception as e:
                    print(f"⚠️ Could not retrieve file {file_uri}: {e}")
            
            # 2. Add Conversation History (Existing messages)
            for msg in history:
                role = "user" if msg['role'] == "user" else "model"
                content = msg.get('content', '')
                if content:
                    chat_history.append(types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=content)]
                    ))

            # 3. Start Chat Session
            chat = model.start_chat(history=chat_history)
            
            # 4. Send new message
            response = chat.send_message(message)
            return response.text
        except Exception as e:
            print(f"❌ Gemini Error: {e}")
            import traceback
            traceback.print_exc()
            return f"Désolé, une erreur est survenue avec l'IA : {e}"

# Singleton instance
gemini_service = GeminiService()
