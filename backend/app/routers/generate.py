from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Literal
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import ActivityLog
from backend.app.services.gemini_service import gemini_service
# Lazy import: knowledge_base will be imported inside functions to avoid startup delays
import google.generativeai as genai

router = APIRouter()

# Specialized prompt templates for each document type
PROMPT_TEMPLATES = {
    "dossier_prof": """Tu es un expert en création de cours pour le BTS {track}.
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

    "dossier_eleve": """Tu es un expert en création de supports pédagogiques pour le BTS {track}.
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

    "fiche_deroulement": """Tu es un expert en ingénierie pédagogique pour le BTS {track}.
Génère une FICHE DE DÉROULEMENT DE COURS détaillée :

# Fiche de Déroulement : [Titre]

## Informations Pratiques
| Élément | Détail |
|---------|--------|
| Classe | BTS {track} 1ère/2ème année |
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

    "evaluation": """Tu es un expert en évaluation pour le BTS {track}.
Génère une ÉVALUATION COMPLÈTE avec :

# Évaluation : [Titre]

## Mise en situation d'examen
[Un scénario réaliste conforme aux épreuves E4, E5 ou E6 (adaptées au BTS {track})]

## Travail à réaliser
[Questions précises avec barème de points]

## Corrigé Type et Barème
[Réponses attendues détaillées avec critères d'évaluation officiels]
""",

    "quiz": """Tu es un expert en évaluation formative pour le BTS {track}.
Génère un QUIZ / QCM complet et pédagogique :

# Quiz de Révision : [Titre du Thème]

## Questions
Génère 5 à 10 questions (QCM ou questions ouvertes courtes).

## Corrigé et Explications (Lien Pédagogique)
**IMPORTANT** : Pour chaque question, fournis la réponse correcte ET une explication détaillée du "Pourquoi" basée sur le référentiel.
""",

    "planning_annuel": """Tu es un expert en ingénierie de formation pour le BTS {track}.
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
    category: Optional[str] = "NDRC"

class GenerateResponse(BaseModel):
    content: str
    document_type: str
    log_id: Optional[int] = None

from backend.app.auth import get_current_user
from backend.app.models import User
from backend.app.services.usage_service import check_and_increment_usage

@router.post("/course", response_model=GenerateResponse)
async def generate_document(request: GenerateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Generates a specific type of pedagogical document based on the selected BTS track.
    """
    if not request.topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    
    # Check Quota before generating expensive AI content
    check_and_increment_usage(db, current_user, 'generate_course')
    
    try:
        # Determine track, default to NDRC
        track = request.category or "NDRC"
        
        # Get template and format it
        template = PROMPT_TEMPLATES.get(request.document_type, PROMPT_TEMPLATES["dossier_prof"])
        # Format replacing {track} with the actual track name
        system_prompt = template.format(track=track)
        
        user_prompt = f"""Génère le document demandé sur le thème suivant :

**Thème** : {request.topic}
**Durée souhaitée** : {request.duration_hours} heures
"""
        if request.target_block:
            user_prompt += f"**Bloc ciblé** : {request.target_block}\n"

        user_prompt += f"\nUtilise le référentiel BTS {track} et les synthèses de cours disponibles."

        # Pass track to get_model to ensure correct regulatory grounding
        model = gemini_service.get_model(custom_system_instruction=system_prompt, track=track)
        
        content_parts = []
        
        # Lazy import to avoid startup delays
        from backend.app.services.knowledge_service import knowledge_base
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
                target_block=request.target_block,
                user_id=current_user.id
            )
            # Add category/track to activity log? Model doesn't support it yet, so skip or use 'topic'
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

class RefineRequest(BaseModel):
    current_content: str
    instruction: str
    track: Optional[str] = "NDRC"

@router.post("/refine", response_model=GenerateResponse)
async def refine_document(request: RefineRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Refines existing content based on a specific instruction (Didactic Refinement Agent).
    """
    if not request.current_content or not request.instruction:
        raise HTTPException(status_code=400, detail="Content and instruction are required")
    
    # Check Quota (Refining counts as generation or maybe less? Let's count it for now)
    check_and_increment_usage(db, current_user, 'generate_course')
    
    try:
        track = request.track or "NDRC"
        
        # System Prompt for the Refinement Agent
        system_prompt = f"""Tu es un Éditeur Pédagogique Senior expert du BTS {track}.
Ta mission est d'améliorer ou de modifier le document pédagogique fourni en suivant STRICTEMENT les instructions de l'utilisateur.

RÈGLES D'OR :
1. CONSERVE la structure Markdown existante (titres, tableaux, listes) sauf si l'instruction demande de la changer.
2. RESPECTE les référentiels officiels du BTS {track} (ne pas inventer d'épreuves impossibles).
3. ADINTEGRE les modifications de manière fluide et didactique.
4. NE SOIS PAS BAVARD : Renvoie uniquement le document modifié complet, prêt à l'emploi. Pas de phrase d'intro du type "Voici le document modifié".

Instruction de l'utilisateur : "{request.instruction}"
"""
        
        # We reuse the get_model from gemini_service but with our specific refinement system prompt
        # We pass 'track' to ensure regulatory groundings are still loaded in the context if needed by safety filters
        model = gemini_service.get_model(custom_system_instruction=system_prompt, track=track)
        
        # The prompt sent to the model is the content itself
        user_message = f"""Voici le contenu actuel à modifier :

{request.current_content}
"""
        
        response = model.generate_content([user_message])
        
        return GenerateResponse(
            content=response.text,
            document_type="refined", # Generic type for refined content
            log_id=None # We might not create a new log for refinement to avoid clutter, or maybe update the previous one?
        )

    except Exception as e:
        print(f"❌ Refinement error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
