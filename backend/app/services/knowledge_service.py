import os
from pathlib import Path
import docx
import google.generativeai as genai
from backend.app.services.gemini_service import gemini_service

# Knowledge base root
KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent / 'knowledge'

class KnowledgeBase:
    def __init__(self):
        self.loaded_files = []  # List of Gemini file IDs
        self.file_index = {}    # filename -> gemini_file_name mapping
        print(f"📚 Knowledge Base initialized. Root: {KNOWLEDGE_DIR}")

    def _convert_docx_to_text(self, file_path: Path) -> str:
        """Converts a DOCX file to plain text."""
        try:
            doc = docx.Document(str(file_path))
            return "\n".join([p.text for p in doc.paragraphs])
        except Exception as e:
            print(f"⚠️ Could not convert {file_path.name}: {e}")
            return None

    def _get_mime_type(self, file_path: Path) -> str:
        """Returns the MIME type based on file extension."""
        ext = file_path.suffix.lower()
        mime_map = {
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.docx': 'text/plain',  # Will be converted
            '.doc': 'text/plain',   # Will be converted (attempted)
        }
        return mime_map.get(ext, 'application/octet-stream')

    def scan_and_load(self):
        """Scans the knowledge directory and uploads files to Gemini, organizing by subfolder (category)."""
        if not KNOWLEDGE_DIR.exists():
            print(f"⚠️ Knowledge directory does not exist: {KNOWLEDGE_DIR}")
            return

        print(f"🔍 Scanning {KNOWLEDGE_DIR}...")
        files_to_upload = []

        # 1. Identify files and their categories
        for root, dirs, files in os.walk(KNOWLEDGE_DIR):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            # Determine category based on immediate subfolder name relative to KNOWLEDGE_DIR
            relative_path = Path(root).relative_to(KNOWLEDGE_DIR)
            category = str(relative_path.parts[0]) if relative_path.parts else "general"

            for file in files:
                if file.startswith('.') or file.startswith('~$'):
                    continue
                file_path = Path(root) / file
                if file_path.suffix.lower() in ['.pdf', '.txt', '.md', '.docx', '.doc']:
                    files_to_upload.append({
                        "path": file_path,
                        "category": category
                    })

        print(f"📄 Found {len(files_to_upload)} files to load.")

        # 2. Fetch existing files from Gemini to avoid duplicates
        existing_remote_files = {}
        try:
            print("☁️  Checking existing files on Gemini...")
            for f in genai.list_files(page_size=100):
                if f.display_name:
                    existing_remote_files[f.display_name] = f.name
        except Exception as e:
            print(f"⚠️ Could not list remote files: {e}")

        # 3. Process each file
        for item in files_to_upload:
            fp = item["path"]
            category = item["category"]
            target_display_name = fp.name
            
            try:
                # Check existance
                if target_display_name in existing_remote_files:
                    remote_id = existing_remote_files[target_display_name]
                    # Update index with category info
                    self.file_index[target_display_name] = {
                        "id": remote_id,
                        "category": category
                    }
                    if remote_id not in self.loaded_files:
                        self.loaded_files.append(remote_id)
                    print(f"   ⏭️  Skipped ({category}): {target_display_name}")
                    continue

                # Upload Logic
                gemini_file = None
                
                if fp.suffix.lower() in ['.docx', '.doc']:
                    text_content = self._convert_docx_to_text(fp)
                    if text_content:
                        import tempfile
                        safe_name = fp.stem.replace(" ","_")
                        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', prefix=f"{safe_name}_", delete=False, encoding='utf-8') as tmp:
                            tmp.write(text_content)
                            tmp_path = tmp.name
                        
                        gemini_file = gemini_service.upload_file_to_gemini(tmp_path, mime_type='text/plain', display_name=target_display_name)
                        os.unlink(tmp_path)
                    else:
                        print(f"   ⚠️ Skipping empty/unreadable DOCX: {fp.name}")
                        continue
                else:
                    mime = self._get_mime_type(fp)
                    gemini_file = gemini_service.upload_file_to_gemini(str(fp), mime_type=mime, display_name=target_display_name)

                if gemini_file:
                    self.loaded_files.append(gemini_file.name)
                    self.file_index[target_display_name] = {
                        "id": gemini_file.name,
                        "category": category
                    }
                    print(f"   ✅ Uploaded ({category}): {target_display_name}")

            except Exception as e:
                print(f"   ❌ Failed to load {fp.name}: {e}")

        print(f"🎉 Knowledge Base sync complete: {len(self.loaded_files)} active files.")
        return self.loaded_files

    def get_all_file_ids(self):
        """Returns all loaded Gemini file IDs (flat list)."""
        return self.loaded_files

    def get_file_ids_by_category(self, category: str):
        """Returns file IDs belonging to a specific category (e.g. 'bts_ndrc')."""
        return [
            info["id"] for info in self.file_index.values() 
            if info.get("category") == category
        ]

# Singleton
knowledge_base = KnowledgeBase()
