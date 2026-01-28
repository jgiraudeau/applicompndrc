from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Optional
from fpdf import FPDF
from docx import Document
import docx.shared
import io
import re
import pandas as pd
from backend.app.services.gemini_service import gemini_service
import json

from backend.app.auth import get_current_user
from backend.app.models import User
from fastapi import Depends

router = APIRouter()

class ExportRequest(BaseModel):
    content: str
    filename: Optional[str] = "document"

def md_to_pdf(md_text):
    """
    Converts Markdown to PDF using Pypandoc (to HTML) -> WeasyPrint (to PDF).
    Fallback to FPDF if dependencies are missing.
    """
    try:
        import pypandoc
        from weasyprint import HTML, CSS
        
        # 1. Convert Markdown -> HTML
        try:
            html_body = pypandoc.convert_text(md_text, 'html', format='markdown', extra_args=['--table-of-contents'])
        except:
            import markdown
            html_body = markdown.markdown(md_text, extensions=['tables'])

        # 2. CSS
        css_string = """
        @page { size: A4; margin: 20mm; }
        body { font-family: Helvetica, Arial, sans-serif; font-size: 11pt; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background-color: #f2f2f2; font-weight: bold; }
        """

        # 3. Generate
        return HTML(string=html_body).write_pdf(stylesheets=[CSS(string=css_string)])

    except Exception as e:
        print(f"⚠️ WeasyPrint/Pandoc Failed: {e}. Falling back to FPDF.")
        from fpdf import FPDF
        
        class SimplePDF(FPDF):
            def footer(self):
                self.set_y(-15)
                self.set_font('Arial', 'I', 8)
                self.cell(0, 10, 'Page ' + str(self.page_no()), 0, 0, 'C')

        pdf = SimplePDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        # Latin-1 encoding fix
        text = md_text.encode('latin-1', 'replace').decode('latin-1')
        pdf.multi_cell(0, 10, text)
        return bytes(pdf.output())

def md_to_docx(md_text):
    """
    Converts Markdown to DOCX using Pandoc (via pypandoc).
    This handles tables, headers, and complex formatting much better than manual parsing.
    """
    import pypandoc
    import tempfile
    import os

    try:
        # Create a temporary file for the output
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp_docx:
            output_filename = tmp_docx.name

        # Convert content
        # extra_args=['--reference-doc=custom-reference.docx'] could be used later for styling
        pypandoc.convert_text(
            md_text, 
            'docx', 
            format='markdown', 
            outputfile=output_filename,
            extra_args=['--toc-depth=2'] # Optional cleanup args
        )

        # Read the file back as bytes
        with open(output_filename, "rb") as f:
            docx_bytes = f.read()

        # Clean up
        os.unlink(output_filename)

        return docx_bytes

    except Exception as e:
        # Catch ALL errors (OSError, ImportError, etc.)
        print(f"⚠️ Pandoc Conversion FAILED: {e}")
        print("🔄 Falling back to basic python-docx generation...")
        
        try:
            doc = Document()
            doc.add_heading("NOTE: Export Basique (Serveur en cours de configuration)", level=0)
            doc.add_paragraph("L'export avancé (tableaux) a échoué. Voici le contenu brut :")
            doc.add_paragraph("-" * 20)
            
            # Basic Dump
            lines = md_text.split('\n')
            for line in lines:
                doc.add_paragraph(line)
            
            result = io.BytesIO()
            doc.save(result)
            return result.getvalue()
        except Exception as e2:
             print(f"❌ Critical Export Error: {e2}")
             raise e2

@router.post("/pdf")
async def export_pdf(request: ExportRequest, current_user: User = Depends(get_current_user)):
    try:
        pdf_bytes = md_to_pdf(request.content)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={request.filename}.pdf",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        print(f"❌ PDF Export Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/docx")
async def export_docx(request: ExportRequest, current_user: User = Depends(get_current_user)):
    try:
        docx_bytes = md_to_docx(request.content)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f"attachment; filename={request.filename}.docx",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        print(f"❌ DOCX Export Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Specialized Quiz Exports ---

@router.post("/quiz/gift")
async def export_gift(request: ExportRequest, current_user: User = Depends(get_current_user)):
    """
    Transforms a Markdown quiz into Moodle GIFT format using Gemini.
    """
    try:
        prompt = f"""Tu es un expert en Moodle (format GIFT). Transforme ce quiz Markdown en format GIFT (.txt) valide.
        Règles CRITIQUES :
        1. Chaque question DOIT être suivie d'une ligne vide.
        2. Format QCM : La question {{=RéponseCorrecte ~MauvaiseRéponse1 ~MauvaiseRéponse2}}
        3. Pas de titres de parties (ex: ### Partie 1), juste les questions.
        4. Échappe les caractères spéciaux si nécessaire (ex: ~ , = , # , {{ , }}).
        5. Ne réponds QUE avec le texte GIFT pur. Pas de markdown, pas de ```.

        Quiz à transformer :
        {request.content}
        """
        
        import google.generativeai as genai
        model = genai.GenerativeModel(gemini_service.model_name)
        response = model.generate_content(prompt)
        gift_content = response.text.strip()
        
        # Clean potential AI noise
        gift_content = re.sub(r'^```[\w]*\n?', '', gift_content)
        gift_content = re.sub(r'\n?```$', '', gift_content)
        
        return Response(
            content=gift_content.encode('utf-8'),
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename={request.filename}_moodle.txt",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        print(f"❌ GIFT Export Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quiz/wooclap")
async def export_wooclap(request: ExportRequest, current_user: User = Depends(get_current_user)):
    """
    Transforms a Markdown quiz into an Excel file for Wooclap using the specific template.
    """
    try:
        prompt = f"""Transforme ce quiz Markdown en un JSON structuré pour Excel (Wooclap). 
        Utilise EXACTEMENT cette structure de colonnes pour chaque objet :
        - "Type": "MCQ" (toujours MCQ pour l'instant)
        - "Title": [Le texte de la question]
        - "Correct": [L'index de la bonne réponse : 1, 2, 3 ou 4]
        - "Choice 1": [Option A]
        - "Choice 2": [Option B]
        - "Choice 3": [Option C]
        - "Choice 4": [Option D]

        Règles :
        - Ne renvoie que le JSON (liste d'objets). Pas de texte explicatif.
        - Si une question n'est pas un QCM, ignore-la.

        Quiz :
        {request.content}
        """
        
        import google.generativeai as genai
        model = genai.GenerativeModel(gemini_service.model_name)
        response = model.generate_content(prompt)
        
        json_str = response.text.strip()
        json_str = re.sub(r'^```json\n?', '', json_str)
        json_str = re.sub(r'\n?```$', '', json_str)
        
        data = json.loads(json_str)
        df = pd.DataFrame(data)
        
        # Ensure column order matches user image exactly
        expected_cols = ["Type", "Title", "Correct", "Choice 1", "Choice 2", "Choice 3", "Choice 4"]
        # Filter and reorder columns that exist
        current_cols = [c for c in expected_cols if c in df.columns]
        df = df[current_cols]
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Wooclap')
            
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={request.filename}_wooclap.xlsx",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        print(f"❌ Wooclap Export Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quiz/google")
async def export_google(request: ExportRequest, current_user: User = Depends(get_current_user)):
    """
    Transforms a Markdown quiz into a CSV for Google Forms imports.
    """
    try:
        prompt = f"""Transforme ce quiz Markdown en format CSV (séparateur virgule) prêt pour Google Forms.
        Colonnes : Question, Option 1, Option 2, Option 3, Option 4, Correct Answer
        Ne réponds QUE avec le CSV brut. Pas de blabla.

        Quiz Markdown :
        {request.content}
        """
        
        import google.generativeai as genai
        model = genai.GenerativeModel(gemini_service.model_name)
        response = model.generate_content(prompt)
        
        csv_content = response.text.strip()
        csv_content = re.sub(r'^```csv\n?', '', csv_content)
        csv_content = re.sub(r'\n?```$', '', csv_content)
        
        return Response(
            content=csv_content.encode('utf-8'),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={request.filename}_google.csv",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        print(f"❌ Google Forms Export Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
