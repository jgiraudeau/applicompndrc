from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Literal
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import ActivityLog
from backend.app.services.gemini_service import gemini_service, REGULATORY_GROUNDING
from backend.app.services.knowledge_service import knowledge_base
import google.generativeai as genai

router = APIRouter()

# Specialized prompts for each document type
PROMPTS = {
    "dossier_prof": REGULATORY_GROUNDING + """Tu es un expert en création de cours pour le BTS NDRC.
Génère un DOSSIER PROFESSEUR complet avec la structure suivante :

# Dossier Professeur : [Titre]

## Présentation de la Séquence
- Bloc de compétences visé et savoirs associés.
- Place dans la progression annuelle.

## Déroulement de la Séance (Conducteur)
Détaille le scénario pédagogique étape par étape.

## CORRIGÉ DÉTAILLÉ (LIEN DOSSIER ÉLÈVE)
**IMPORTANT** : Pour chaque question posée dans le dossier élève, fournis ici la réponse attendue, les éléments de barème et des conseils de remédiation. 
Distingue bien :
- Corrigé de l'Activité 1 : [Réponses précises]
- Corrigé de l'Activité 2 : [Réponses précises]

## Points de Vigilance & Prolongements
- Astuces pour l'animation.
- Liens avec les épreuves (CCF/Ponctuel).
""",

    "dossier_eleve": REGULATORY_GROUNDING + """Tu es un expert en création de supports pédagogiques pour le BTS NDRC.
Génère un DOSSIER ÉLÈVE clair, structuré et incitant à l'action :

# Dossier Élève : [Titre]

## Contexte Professionnel
[Une mise en situation concrète dans une entreprise pour ancrer les questions]

## Documents de Travail
[Fiches outils, extraits de documents ou données nécessaires pour répondre]

## TRAVAIL À RÉALISER (ACTIVITÉS)
Propose des questions progressives et numérotées, directement liées au contexte et aux documents fournis.
Chaque question doit solliciter une compétence du référentiel.

## Synthèse Personnelle
[Zone pour que l'élève récapitule les notions clés apprises]
""",

    "fiche_deroulement": REGULATORY_GROUNDING + """Tu es un expert en ingénierie pédagogique pour le BTS NDRC.
Génère une FICHE DE DÉROULEMENT DE COURS détaillée :

# Fiche de Déroulement : [Titre]

## Informations Pratiques
| Élément | Détail |
|---------|--------|
| Classe | BTS NDRC 1ère/2ème année |
| Durée totale | X heures |
| Salle | Salle informatique / Classe |
| Matériel | ... |

## Chronologie Détaillée

### Phase 1 : Accroche (XX min)
- **Objectif** : Capter l'attention, créer le besoin
- **Méthode** : [Brainstorming / Vidéo / Cas réel]
- **Actions prof** : ...
- **Consigne élève** : ...
- **Transition** : ...

### Phase 2 : Apport de Connaissances (XX min)
...

### Phase 3 : Mise en Application (XX min)
...

### Phase 4 : Synthèse (XX min)
...

## Check-list Préparation
- [ ] Documents photocopiés
- [ ] Vidéoprojecteur testé
- [ ] Fichiers sur clé USB
- [ ] ...
""",

    "evaluation": REGULATORY_GROUNDING + """Tu es un expert en évaluation pour le BTS NDRC.
Génère une ÉVALUATION COMPLÈTE avec :

# Évaluation : [Titre]

## Mise en situation d'examen
[Un scénario réaliste conforme aux épreuves E4, E5 ou E6]

## Travail à réaliser
[Questions précises avec barème de points]

## Corrigé Type et Barème
[Réponses attendues détaillées avec critères d'évaluation officiels]
""",

    "quiz": REGULATORY_GROUNDING + """Tu es un expert en évaluation formative pour le BTS NDRC.
Génère un QUIZ / QCM complet et pédagogique :

# Quiz de Révision : [Titre du Thème]

## Questions
Génère 5 à 10 questions (QCM ou questions ouvertes courtes).

## Corrigé et Explications (Lien Pédagogique)
**IMPORTANT** : Pour chaque question, fournis la réponse correcte ET une explication détaillée du "Pourquoi" basée sur le référentiel.
""",

    "planning_annuel": REGULATORY_GROUNDING + """Tu es un expert en ingénierie de formation pour le BTS NDRC.
Génère une PROGRESSION ANNUELLE détaillée et structurée :

# Progression Annuelle : [Nom de la Matière/Bloc]

## Calendrier de la Progression
| Période | Chapitre | Notions Clés | Compétences Visées | Activités prévues |
|---------|----------|--------------|-------------------|--------------------|
| ...     | ...      | ...          | ...               | ...                |

## Modalités d'Évaluation (Conforme Règlement)
- Planning des DS et des examens blancs.
- Rappel des modalités officielles (Ponctuel/CCF) selon le référentiel fourni.
""",
}

class GenerateRequest(BaseModel):
    topic: str
    duration_hours: Optional[int] = 4
    target_block: Optional[str] = None
    document_type: Literal["dossier_prof", "dossier_eleve", "fiche_deroulement", "evaluation", "quiz", "planning_annuel"] = "dossier_prof"

class GenerateResponse(BaseModel):
    content: str
    document_type: str
    log_id: Optional[int] = None

@router.post("/course", response_model=GenerateResponse)
async def generate_document(request: GenerateRequest, db: Session = Depends(get_db)):
    """
    Generates a specific type of pedagogical document.
    """
    if not request.topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    
    try:
        system_prompt = PROMPTS.get(request.document_type, PROMPTS["dossier_prof"])
        
        user_prompt = f"""Génère le document demandé sur le thème suivant :

**Thème** : {request.topic}
**Durée souhaitée** : {request.duration_hours} heures
"""
        if request.target_block:
            user_prompt += f"**Bloc ciblé** : {request.target_block}\n"

        user_prompt += "\nUtilise le référentiel BTS NDRC et les synthèses de cours disponibles."

        model = gemini_service.get_model(custom_system_instruction=system_prompt)
        
        content_parts = []
        kb_files = knowledge_base.get_all_file_ids()
        
        for file_id in kb_files[:3]:
            try:
                file_obj = genai.get_file(file_id)
                content_parts.append(file_obj)
            except:
                pass
        
        content_parts.append(user_prompt)
        
        response = model.generate_content(content_parts)
        
        # Log activity
        try:
            new_log = ActivityLog(
                document_type=request.document_type,
                topic=request.topic,
                duration_hours=request.duration_hours,
                target_block=request.target_block
            )
            db.add(new_log)
            db.commit()
            db.refresh(new_log)
            log_id = new_log.id
        except Exception as log_error:
            print(f"⚠️ Activity logging failed: {log_error}")
            log_id = None

        return GenerateResponse(
            content=response.text, 
            document_type=request.document_type,
            log_id=log_id
        )
    
    except Exception as e:
        print(f"❌ Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
