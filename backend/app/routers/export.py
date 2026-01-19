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

class PDFGenerator(FPDF):
    def __init__(self):
        super().__init__()
        # 25mm left, 20mm top, 25mm right
        self.set_margins(25, 20, 25)
        self.set_auto_page_break(auto=True, margin=20)
        self.add_page()
        self.usable_width = self.w - self.l_margin - self.r_margin

    def clean_text(self, text):
        # fpdf2 standard fonts only support latin-1
        # Replacing common problematic chars
        return text.replace('•', '*').replace('…', '...').replace('—', '-').encode('latin-1', 'replace').decode('latin-1')

    def add_md_content(self, md_text):
        lines = md_text.split('\n')
        for line in lines:
            stripped = line.strip()
            if not stripped:
                self.ln(5)
                continue
                
            clean_line = self.clean_text(stripped)
            
            if stripped.startswith('# '):
                self.set_font("Helvetica", 'B', 18)
                self.set_text_color(44, 62, 80)
                self.ln(10)
                self.multi_cell(self.usable_width, 10, clean_line[2:], align='C')
                self.ln(5)
                # Bottom border
                curr_y = self.get_y()
                self.set_draw_color(52, 152, 219)
                self.line(self.l_margin, curr_y, self.w - self.r_margin, curr_y)
                self.ln(5)
            elif stripped.startswith('## '):
                self.set_font("Helvetica", 'B', 15)
                self.set_text_color(41, 128, 185)
                self.ln(5)
                self.multi_cell(self.usable_width, 8, clean_line[3:])
                self.ln(2)
            elif stripped.startswith('### '):
                self.set_font("Helvetica", 'B', 13)
                self.set_text_color(52, 73, 94)
                self.ln(3)
                self.multi_cell(self.usable_width, 7, clean_line[4:])
            elif stripped.startswith('- ') or stripped.startswith('* '):
                self.set_font("Helvetica", '', 11)
                self.set_text_color(0, 0, 0)
                self.set_x(self.l_margin + 5)
                self.multi_cell(self.usable_width - 5, 6, f"* {clean_line[2:]}")
            elif re.match(r'^\d+\. ', stripped):
                self.set_font("Helvetica", '', 11)
                self.set_text_color(0, 0, 0)
                self.set_x(self.l_margin + 5)
                self.multi_cell(self.usable_width - 5, 6, clean_line)
            else:
                self.set_font("Helvetica", '', 11)
                self.set_text_color(0, 0, 0)
                self.multi_cell(self.usable_width, 6, clean_line)

def md_to_pdf(md_text):
    pdf = PDFGenerator()
    pdf.add_md_content(md_text)
    # output() returns bytes/bytearray in fpdf2
    return bytes(pdf.output())

def md_to_docx(md_text):
    doc = Document()
    
    # Standard margins (1 inch) are default, but let's ensure they are clean
    sections = doc.sections
    for section in sections:
        section.top_margin = docx.shared.Inches(1)
        section.bottom_margin = docx.shared.Inches(1)
        section.left_margin = docx.shared.Inches(1)
        section.right_margin = docx.shared.Inches(1)
    
    lines = md_text.split('\n')
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        if stripped.startswith('# '):
            doc.add_heading(stripped[2:], level=0)
        elif stripped.startswith('## '):
            doc.add_heading(stripped[3:], level=1)
        elif stripped.startswith('### '):
            doc.add_heading(stripped[4:], level=2)
        elif stripped.startswith('- ') or stripped.startswith('* '):
            doc.add_paragraph(stripped[2:], style='List Bullet')
        elif re.match(r'^\d+\. ', stripped):
            space_idx = stripped.find(' ')
            doc.add_paragraph(stripped[space_idx+1:], style='List Number')
        else:
            doc.add_paragraph(stripped)
            
    result = io.BytesIO()
    doc.save(result)
    return result.getvalue()

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
