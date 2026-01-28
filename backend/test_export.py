
import sys
import os

# Add backend directory to path so imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(current_dir)) # backend/
sys.path.append(backend_dir)

from backend.app.routers.export import md_to_pdf, md_to_docx

MARKDOWN_SAMPLE = """
# Titre de Test

## Sous-titre

Ceci est un paragraphe de test avec du **gras** et de l'italique.

| Colonne 1 | Colonne 2 |
| :--- | :--- |
| Valeur A | Valeur B |
| Valeur C | Valeur D |

- Liste 1
- Liste 2
"""

def test_exports():
    print("🚀 Démarrage du test d'export local...")
    
    # Test PDF
    try:
        print("Testing PDF Export...", end="")
        pdf_bytes = md_to_pdf(MARKDOWN_SAMPLE)
        if len(pdf_bytes) > 0:
            print(" ✅ SUCCESS (Size: {} bytes)".format(len(pdf_bytes)))
            with open("test_output.pdf", "wb") as f:
                f.write(pdf_bytes)
        else:
            print(" ❌ FAIL (Empty output)")
    except Exception as e:
        print(f"\n❌ PDF CRASH: {e}")
        import traceback
        traceback.print_exc()

    # Test DOCX
    try:
        print("Testing DOCX Export...", end="")
        docx_bytes = md_to_docx(MARKDOWN_SAMPLE)
        if len(docx_bytes) > 0:
            print(" ✅ SUCCESS (Size: {} bytes)".format(len(docx_bytes)))
            with open("test_output.docx", "wb") as f:
                f.write(docx_bytes)
        else:
            print(" ❌ FAIL (Empty output)")
    except Exception as e:
        print(f"\n❌ DOCX CRASH: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_exports()
