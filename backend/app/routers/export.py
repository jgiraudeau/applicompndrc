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
        # Tentative de conversion propre en latin-1 pour fpdf
        # On remplace les caractères courants qui posent problème
        replacements = {
            '•': '*', '…': '...', '—': '-', '–': '-',
            '’': "'", '‘': "'", '“': '"', '”': '"',
            '€': 'EUR'
        }
        for k, v in replacements.items():
            text = text.replace(k, v)
        
        try:
            return text.encode('latin-1', 'replace').decode('latin-1')
        except:
            return text

    def add_md_content(self, md_text):
        lines = md_text.split('\n')
        
        for line in lines:
            # Détection de l'indentation (2 espaces ou 1 tab = 1 niveau)
            indent_level = 0
            stripped = line.strip()
            
            if not stripped:
                self.ln(3) # Petit saut de ligne pour aérer
                continue
            
            # Calcul de l'indentation brute
            leading_spaces = len(line) - len(line.lstrip(' '))
            indent_level = leading_spaces // 2
            
            # Nettoyage du texte pour l'affichage
            clean_line = self.clean_text(stripped)
            
            # Gestion des Titres
            if stripped.startswith('# '):
                self.ln(5)
                self.set_font("Helvetica", 'B', 16)
                self.set_text_color(44, 62, 80) # Bleu foncé
                self.multi_cell(self.usable_width, 10, clean_line[2:], align='C')
                
                # Ligne de séparation sous le titre
                y = self.get_y()
                self.set_draw_color(52, 152, 219)
                self.set_line_width(0.5)
                self.line(self.l_margin, y, self.w - self.r_margin, y)
                self.ln(5)
                
            elif stripped.startswith('## '):
                self.ln(5)
                self.set_font("Helvetica", 'B', 14)
                self.set_text_color(41, 128, 185) # Bleu moyen
                self.multi_cell(self.usable_width, 8, clean_line[3:])
                self.ln(2)
                
            elif stripped.startswith('### '):
                self.ln(3)
                self.set_font("Helvetica", 'B', 12)
                self.set_text_color(52, 73, 94) # Gris bleu
                self.multi_cell(self.usable_width, 7, clean_line[4:])
                
            # Gestion des Listes (Bullet points)
            elif stripped.startswith('- ') or stripped.startswith('* '):
                self.set_font("Helvetica", '', 11)
                self.set_text_color(0, 0, 0)
                
                # Retrait basé sur l'indentation
                indent_margin = 8 * (indent_level + 1)
                self.set_x(self.l_margin + indent_margin)
                
                # Puce personnalisée selon le niveau
                bullet = "*" if indent_level == 0 else "-"
                content = clean_line[2:]
                
                # Détection gras simple (**text**) -> on enlève les étoiles pour l'affichage (fpdf basic ne supporte pas le rich text facile)
                # Amélioration: si toute la ligne est grasse (ex: **Question 1**)
                if content.startswith('**') and content.endswith('**'):
                    self.set_font("Helvetica", 'B', 11)
                    content = content.strip('*')
                
                # Affichage de la puce et du texte
                # Astuce pour aligner la puce et le texte : on écrit la puce, puis le texte décalé
                current_y = self.get_y()
                current_x = self.get_x()
                self.cell(5, 6, bullet) 
                
                self.set_xy(current_x + 5, current_y)
                self.multi_cell(self.usable_width - indent_margin - 5, 6, content)
            
            # Gestion des Listes Numérotées (1. )
            elif re.match(r'^\d+\. ', stripped):
                self.set_font("Helvetica", 'B', 11) # Numéros en gras
                self.set_text_color(0, 0, 0)
                
                indent_margin = 8 * indent_level
                self.set_x(self.l_margin + indent_margin)
                
                # Séparation numéro / texte
                match = re.match(r'^(\d+\.)\s+(.*)', clean_line)
                if match:
                    number = match.group(1)
                    content = match.group(2)
                    
                    if content.startswith('**') and content.endswith('**'):
                         content = content.strip('*')
                    
                    # Affiche le numéro
                    current_y = self.get_y()
                    current_x = self.get_x()
                    self.cell(10, 6, number)
                    
                    # Affiche le texte en normal (ou gras si détecté)
                    self.set_xy(current_x + 10, current_y)
                    self.set_font("Helvetica", '', 11)
                    self.multi_cell(self.usable_width - indent_margin - 10, 6, content)
                else:
                    self.multi_cell(self.usable_width, 6, clean_line)

            # Texte normal (Paragraphes)
            else:
                self.set_font("Helvetica", '', 11)
                
                # Gestion du gras pour les questions de quiz (souvent **Question 1**) qui ne sont pas des listes
                if stripped.startswith('**') and stripped.endswith('**'):
                    self.set_font("Helvetica", 'B', 11)
                    clean_line = clean_line.strip('*')
                    
                self.set_text_color(50, 50, 50)
                self.set_x(self.l_margin + (indent_level * 5))
                self.multi_cell(self.usable_width - (indent_level * 5), 6, clean_line)

def md_to_pdf(md_text):
    pdf = PDFGenerator()
    pdf.add_md_content(md_text)
    # output() returns bytes/bytearray in fpdf2
    return bytes(pdf.output())

def md_to_docx(md_text):
    doc = Document()
    
    # Configuration des marges
    sections = doc.sections
    for section in sections:
        section.top_margin = docx.shared.Inches(1)
        section.bottom_margin = docx.shared.Inches(1)
        section.left_margin = docx.shared.Inches(1)
        section.right_margin = docx.shared.Inches(1)
    
    lines = md_text.split('\n')
    
    for line in lines:
        stripped = line.strip()
        
        # Calcul de l'indentation
        leading_spaces = len(line) - len(line.lstrip(' '))
        indent_level = leading_spaces // 2
        
        if not stripped:
            continue
            
        p = None
        
        # Titres
        if stripped.startswith('# '):
            p = doc.add_heading(stripped[2:], level=0)
        elif stripped.startswith('## '):
            p = doc.add_heading(stripped[3:], level=1)
        elif stripped.startswith('### '):
            p = doc.add_heading(stripped[4:], level=2)
            
        # Listes (Bullet points)
        elif stripped.startswith('- ') or stripped.startswith('* '):
            clean_content = stripped[2:]
            # Utilisation du style de liste approprié selon le niveau (max 3 niveaux)
            list_style = 'List Bullet'
            if indent_level == 1: list_style = 'List Bullet 2'
            if indent_level >= 2: list_style = 'List Bullet 3'
            
            try:
                p = doc.add_paragraph(style=list_style)
            except:
                p = doc.add_paragraph(style='List Bullet') # Fallback
                p.paragraph_format.left_indent = docx.shared.Inches(0.25 * (indent_level + 1))
            
            # Gestion basique du gras (**text**)
            parts = re.split(r'(\*\*.*?\*\*)', clean_content)
            for part in parts:
                if part.startswith('**') and part.endswith('**'):
                    run = p.add_run(part[2:-2])
                    run.bold = True
                else:
                    p.add_run(part)
                    
        # Listes Numérotées
        elif re.match(r'^\d+\. ', stripped):
            match = re.search(r'^\d+\.\s+(.*)', stripped)
            clean_content = match.group(1) if match else stripped
            
            try:
                p = doc.add_paragraph(style='List Number')
            except:
                p = doc.add_paragraph(style='List Number') # Fallback

            if indent_level > 0:
                p.paragraph_format.left_indent = docx.shared.Inches(0.25 * (indent_level + 1))
            
            # Gestion basique du gras
            parts = re.split(r'(\*\*.*?\*\*)', clean_content)
            for part in parts:
                if part.startswith('**') and part.endswith('**'):
                    run = p.add_run(part[2:-2])
                    run.bold = True
                else:
                    p.add_run(part)
        
        # Texte normal
        else:
            p = doc.add_paragraph()
            if indent_level > 0:
                p.paragraph_format.left_indent = docx.shared.Inches(0.25 * indent_level)
                
            # Gestion basique du gras
            parts = re.split(r'(\*\*.*?\*\*)', stripped)
            for part in parts:
                if part.startswith('**') and part.endswith('**'):
                    run = p.add_run(part[2:-2])
                    run.bold = True
                else:
                    p.add_run(part)
            
    result = io.BytesIO()
    doc.save(result)
    return result.getvalue()

@router.post("/pdf")
async def export_pdf(request: ExportRequest):
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
async def export_docx(request: ExportRequest):
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
async def export_gift(request: ExportRequest):
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
async def export_wooclap(request: ExportRequest):
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
async def export_google(request: ExportRequest):
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
