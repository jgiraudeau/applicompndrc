import os
from pathlib import Path
import docx
import google.generativeai as genai
from backend.app.services.gemini_service import gemini_service

# Knowledge base root
KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent.parent / 'knowledge'

class KnowledgeBase:
    def __init__(self):
        self.categorized_files = {} # category -> list of gemini_file_names
        self.all_files = [] 
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
        """Scans the knowledge directory and uploads files to Gemini, organizing by category."""
        if not KNOWLEDGE_DIR.exists():
            print(f"⚠️ Knowledge directory does not exist: {KNOWLEDGE_DIR}")
            return

        print(f"🔍 Scanning {KNOWLEDGE_DIR}...")
        
        # Reset current state
        self.categorized_files = {}
        self.all_files = []

        for root, dirs, files in os.walk(KNOWLEDGE_DIR):
            # Determine category from directory name relative to KNOWLEDGE_DIR
            # e.g. knowledge/NDRC -> category = NDRC
            rel_path = Path(root).relative_to(KNOWLEDGE_DIR)
            category = rel_path.parts[0] if rel_path.parts else "COMMON"
            
            # Normalize category
            if category == ".": category = "COMMON"
            category = category.upper()

            # Skip hidden files/folders
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for file in files:
                if file.startswith('.') or file.startswith('~$'):
                    continue
                
                file_path = Path(root) / file
                if file_path.suffix.lower() not in ['.pdf', '.txt', '.md', '.docx', '.doc']:
                    continue

                try:
                    # Upload Logic
                    gemini_file = None
                    if file_path.suffix.lower() in ['.docx', '.doc']:
                        text_content = self._convert_docx_to_text(file_path)
                        if text_content:
                            import tempfile
                            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as tmp:
                                tmp.write(text_content)
                                tmp_path = tmp.name
                            gemini_file = gemini_service.upload_file_to_gemini(tmp_path, mime_type='text/plain')
                            os.unlink(tmp_path)
                    else:
                        mime = self._get_mime_type(file_path)
                        gemini_file = gemini_service.upload_file_to_gemini(str(file_path), mime_type=mime)

                    if gemini_file:
                        # Store in index
                        if category not in self.categorized_files:
                            self.categorized_files[category] = []
                        self.categorized_files[category].append(gemini_file.name)
                        self.all_files.append(gemini_file.name)
                        print(f"   ✅ Loaded [{category}]: {file_path.name}")

                except Exception as e:
                    print(f"   ❌ Failed to load {file_path.name}: {e}")

        print(f"🎉 Knowledge Base loaded: {len(self.all_files)} files across {len(self.categorized_files)} categories.")
        return self.all_files

    def get_all_file_ids(self):
        """Returns all loaded Gemini file IDs."""
        return self.all_files

    def get_file_ids_by_category(self, category: str):
        """
        Returns file IDs relevant to the category + COMMON files.
        """
        category = category.upper() if category else ""
        relevant_files = []
        
        # Add specific category files
        if category and category in self.categorized_files:
            relevant_files.extend(self.categorized_files[category])
            
        # Add COMMON files
        if "COMMON" in self.categorized_files:
            relevant_files.extend(self.categorized_files["COMMON"])
            
        # Deduplicate just in case
        return list(set(relevant_files))

# Singleton
knowledge_base = KnowledgeBase()
