from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Literal
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import ActivityLog
from backend.app.services.gemini_service import gemini_service
from backend.app.services.knowledge_service import knowledge_base
import google.generativeai as genai

router = APIRouter()

# Specialized prompts for each document type
PROMPTS = {
    "dossier_prof": """Tu es un expert en création de cours pour le BTS NDRC.
Génère un DOSSIER PROFESSEUR complet avec la structure suivante :
**NOTE CRITIQUE** : Si le thème concerne le **Bloc 2**, ne mentionne JAMAIS de CCF (le Bloc 2 n'est pas en CCF).

# Dossier Professeur : [Titre]

## Présentation de la Séquence
- Bloc de compétences visé
- Place dans la progression annuelle
- Pré-requis élèves

## Objectifs Pédagogiques
- Compétences visées (référentiel)
- Savoirs associés
- Critères de réussite

## Déroulement Détaillé
Pour chaque séance :
### Séance X : [Titre] (XX min)
| Phase | Durée | Activité Prof | Activité Élève | Supports |
|-------|-------|---------------|----------------|----------|
| ...   | ...   | ...           | ...            | ...      |

## Corrigés et Points de Vigilance
- Réponses attendues aux activités
- Erreurs fréquentes à anticiper
- Remédiations proposées

## Prolongements Possibles
- Liens avec autres chapitres
- Ouverture professionnelle
""",

    "dossier_eleve": """Tu es un expert en création de supports pédagogiques pour le BTS NDRC.
Génère un DOSSIER ÉLÈVE complet et prêt à imprimer avec :

# Dossier Élève : [Titre]

## Mise en Situation Professionnelle
[Contexte d'entreprise fictif mais réaliste]

## Documents Ressources
- Document 1 : [Titre]
[Contenu du document]
- Document 2 : [Titre]
[Contenu]

## Activités
### Activité 1 : [Titre]
**Consigne** : ...
**Travail à réaliser** :
1. ...
2. ...

### Activité 2 : [Titre]
...

## Fiche de Synthèse à Compléter
[Schéma ou tableau à trous pour la prise de notes]

## Auto-évaluation
[ ] J'ai compris...
[ ] Je suis capable de...
""",

    "fiche_deroulement": """Tu es un expert en ingénierie pédagogique pour le BTS NDRC.
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

    "evaluation": """Tu es un expert en évaluation pour le BTS NDRC.
Génère une ÉVALUATION COMPLÈTE avec :

# Évaluation : [Titre]

## Corrigé Type
[Réponses attendues avec barème détaillé]
""",

    "quiz": """Tu es un expert en évaluation formative pour le BTS NDRC.
Génère un QUIZ / QCM complet et pédagogique :

# Quiz de Révision : [Titre du Thème]

## Instructions
- Durée : 15-20 minutes
- Objectif : Vérifier la compréhension des notions clés

## Questions

### Partie 1 : Questions à Choix Multiples (QCM)
Génère 5 à 10 questions avec :
1. [Question]
   a) [Option A]
   b) [Option B]
   c) [Option C]
   d) [Option D]

### Partie 2 : Questions de Compréhension
Génère 3 questions ouvertes demandant une explication courte.

### Partie 3 : Mini Étude de Situation
Un court scénario (3-4 lignes) suivi de 2 questions d'analyse.

## Corrigé et Explications
[Fournis les réponses correctes ET une brève explication pour chaque question afin de favoriser l'apprentissage]
**NOTE CRITIQUE** : Si le thème concerne le **Bloc 2**, ne mentionne JAMAIS de CCF (le Bloc 2 n'est pas en CCF).
""",

    "planning_annuel": """Tu es un expert en ingénierie de formation pour le BTS NDRC.
Génère une PROGRESSION ANNUELLE détaillée et structurée :
**NOTE CRITIQUE** : Si le thème concerne le **Bloc 2**, ne mentionne JAMAIS de CCF (le Bloc 2 n'est pas en CCF).

# Progression Annuelle : [Nom de la Matière/Bloc]
## Année Scolaire 202X-202X

### Objectifs Généraux
- [Lister les grands objectifs du référentiel]

### Calendrier de la Progression
Génère un tableau mois par mois ou semaine par semaine :

| Période | Chapitre | Notions Clés | Compétences Visées | Activités / Cas prévus |
|---------|----------|--------------|-------------------|------------------------|
| Sept.   | ...      | ...          | ...               | ...                    |
| Oct.    | ...      | ...          | ...               | ...                    |
| ...     | ...      | ...          | ...               | ...                    |

### Modalités d'Évaluation
- Fréquence des DS
- Planning des CCF / Oraux

### Ressources & Supports
- [Lister les outils, manuels et sources de la base de connaissance utilisés]
"""
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

        model = genai.GenerativeModel(
            gemini_service.model_name,
            system_instruction=system_prompt
        )
        
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
