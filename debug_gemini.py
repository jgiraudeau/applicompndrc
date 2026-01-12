from backend.app.services.gemini_service import gemini_service

print("Testing Gemini Service...")
try:
    response = gemini_service.chat_with_history("Bonjour")
    print(f"Response: {response}")
except Exception as e:
    print(f"Error: {e}")
