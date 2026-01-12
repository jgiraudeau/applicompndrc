from backend.app.services.gemini_service import gemini_service
import google.generativeai as genai
import time

# Create a dummy text file
with open("test_doc.txt", "w") as f:
    f.write("Le NPS (Net Promoter Score) se calcule en soustrayant le % de détracteurs au % de promoteurs.")

print("1. Uploading file...")
try:
    f_obj = gemini_service.upload_file_to_gemini("test_doc.txt", mime_type="text/plain")
    file_id = f_obj.name
    print(f"   File ID: {file_id}")
    
    print("2. Chatting with file context...")
    response = gemini_service.chat_with_history("Comment on calcule le NPS ?", history=[], file_uri=file_id)
    print(f"   Response: {response}")
    
except Exception as e:
    print(f"❌ ERROR: {e}")
