
import os
import google.generativeai as genai
from dotenv import load_dotenv
from pathlib import Path

# Load env vars safely by finding the backend root (2 levels up from services)
env_path = Path(__file__).resolve().parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)
print(f"DEBUG: Loading .env from {env_path}")
API_KEY = os.getenv("GOOGLE_API_KEY")

class GeminiService:
    def __init__(self):
        if not API_KEY:
             raise ValueError("GOOGLE_API_KEY is missing in environment variables.")
        genai.configure(api_key=API_KEY)
        self.model_name = self._find_best_model()
        print(f"✅ Gemini Service initialized with model: {self.model_name}")

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
            print(f"⚠️ Model discovery failed: {e}. Defaulting to 'gemini-1.5-flash'.")
            return "gemini-1.5-flash"

    def upload_file_to_gemini(self, file_path: str, mime_type: str = None):
        """Uploads a file to Gemini and waits for processing."""
        try:
            print(f"👉 Uploading {file_path} to Gemini...")
            if mime_type:
                uploaded_file = genai.upload_file(file_path, mime_type=mime_type)
            else:
                uploaded_file = genai.upload_file(file_path)
            
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
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content([file_obj, message])
            return response.text
        except Exception as e:
            return f"Error: {e}"

    def chat_with_history(self, message: str, history: list = [], file_uri: str = None):
        """Chat with conversation history and optional file context."""
        try:
            model = genai.GenerativeModel(self.model_name)
            
            chat_history = []
            
            # 1. Add File Context (as a separate turn or system-like context)
            if file_uri:
                print(f"👉 Including file context: {file_uri}")
                try:
                    file_obj = genai.get_file(file_uri)
                    # We inject the file as the first user message
                    chat_history.append({
                        "role": "user",
                        "parts": [file_obj, "Voici le document de référence pour notre conversation."]
                    })
                    chat_history.append({
                        "role": "model",
                        "parts": ["Bien reçu. Je utiliserai ce document pour répondre à vos questions."]
                    })
                except Exception as e:
                    print(f"⚠️ Could not retrieve file {file_uri}: {e}")
            
            # 2. Add Conversation History
            for msg in history:
                role = "user" if msg['role'] == "user" else "model"
                chat_history.append({
                    "role": role,
                    "parts": [msg['content']]
                })

            # 3. Start Chat Session
            chat = model.start_chat(history=chat_history)
            
            # 4. Send new message
            response = chat.send_message(message)
            return response.text
        except Exception as e:
            print(f"❌ Gemini Error: {e}")
            return f"Désolé, une erreur est survenue : {e}"

# Singleton instance
gemini_service = GeminiService()
