import os
from pathlib import Path
import docx
import google.generativeai as genai
from backend.app.services.gemini_service import gemini_service

# Knowledge base root
KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent.parent / 'knowledge'

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
        """Scans the knowledge directory and uploads files to Gemini."""
        if not KNOWLEDGE_DIR.exists():
            print(f"⚠️ Knowledge directory does not exist: {KNOWLEDGE_DIR}")
            return

        print(f"🔍 Scanning {KNOWLEDGE_DIR}...")
        files_to_upload = []

        for root, dirs, files in os.walk(KNOWLEDGE_DIR):
            # Skip hidden files/folders
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            for file in files:
                if file.startswith('.') or file.startswith('~$'):
                    continue
                file_path = Path(root) / file
                if file_path.suffix.lower() in ['.pdf', '.txt', '.md', '.docx', '.doc']:
                    files_to_upload.append(file_path)

        print(f"📄 Found {len(files_to_upload)} files to load.")

        for fp in files_to_upload:
            try:
                # Handle DOCX conversion
                if fp.suffix.lower() in ['.docx', '.doc']:
                    text_content = self._convert_docx_to_text(fp)
                    if text_content:
                        # Create temp txt file
                        import tempfile
                        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as tmp:
                            tmp.write(text_content)
                            tmp_path = tmp.name
                        
                        gemini_file = gemini_service.upload_file_to_gemini(tmp_path, mime_type='text/plain')
                        os.unlink(tmp_path)
                    else:
                        continue
                else:
                    mime = self._get_mime_type(fp)
                    gemini_file = gemini_service.upload_file_to_gemini(str(fp), mime_type=mime)

                self.loaded_files.append(gemini_file.name)
                self.file_index[fp.name] = gemini_file.name
                print(f"   ✅ Loaded: {fp.name}")

            except Exception as e:
                print(f"   ❌ Failed to load {fp.name}: {e}")

        print(f"🎉 Knowledge Base loaded: {len(self.loaded_files)} files.")
        return self.loaded_files

    def get_all_file_ids(self):
        """Returns all loaded Gemini file IDs."""
        return self.loaded_files

# Singleton
knowledge_base = KnowledgeBase()
