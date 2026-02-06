
import sys
import os

# Add cwd to path (classic fixture)
sys.path.append(os.getcwd())

print(f"Testing scan execution...")
try:
    from app.services.knowledge_service import knowledge_base
    print("✅ Import knowledge_base success")
    
    print("🚀 Launching scan_and_load...")
    knowledge_base.scan_and_load()
    print("✅ Scan execution finished (check console for file details)")
    
except Exception as e:
    print(f"❌ CRITICAL ERROR during test: {e}")
    import traceback
    traceback.print_exc()
