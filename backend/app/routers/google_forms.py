from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
import logging
import requests
import re
from typing import List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


class QuizQuestion:
    """Représente une question de quiz parsée"""
    def __init__(self, question_text: str, choices: List[str], correct_answer: str):
        self.question_text = question_text
        self.choices = choices
        self.correct_answer = correct_answer


class GoogleFormCreate(BaseModel):
    token: str
    title: str
    description: str = ""
    quiz_content: str  # Le contenu markdown du quiz


def parse_quiz_markdown(content: str) -> List[QuizQuestion]:
    """
    Parse le contenu markdown du quiz pour extraire les questions.
    
    Format attendu:
    ### Question 1
    Texte de la question ?
    
    a) Réponse A
    b) Réponse B
    c) Réponse C
    d) Réponse D
    
    **Réponse correcte : c) Réponse C**
    """
    questions = []
    
    # Split par questions (repérer les ### Question X)
    question_blocks = re.split(r'###\s*Question\s*\d+', content)
    
    for block in question_blocks[1:]:  # Skip first empty block
        lines = [line.strip() for line in block.strip().split('\n') if line.strip()]
        
        if not lines:
            continue
        
        question_text = ""
        choices = []
        correct_answer = ""
        
        i = 0
        # Trouver le texte de la question
        while i < len(lines) and not lines[i].startswith(('a)', 'b)', 'c)', 'd)', 'A)', 'B)', 'C)', 'D)')):
            if not lines[i].startswith('**'):
                question_text += lines[i] + " "
            i += 1
        
        question_text = question_text.strip()
        
        # Extraire les choix
        while i < len(lines) and lines[i].startswith(('a)', 'b)', 'c)', 'd)', 'A)', 'B)', 'C)', 'D)')):
            choice = lines[i][2:].strip()  # Remove "a) " prefix
            choices.append(choice)
            i += 1
        
        # Trouver la réponse correcte
        for line in lines[i:]:
            if 'réponse correcte' in line.lower() or 'correct' in line.lower():
                # Extraire la lettre (a, b, c, d)
                match = re.search(r'[a-dA-D]\)', line)
                if match:
                    letter = match.group(0)[0].lower()
                    index = ord(letter) - ord('a')
                    if 0 <= index < len(choices):
                        correct_answer = choices[index]
                break
        
        if question_text and choices and correct_answer:
            questions.append(QuizQuestion(question_text, choices, correct_answer))
    
    return questions


@router.post("/create")
async def create_google_form(data: GoogleFormCreate = Body(...)):
    """
    Créer un Google Form interactif à partir d'un quiz.
    Le formulaire est créé en mode QUIZ avec correction automatique.
    """
    try:
        # 1. Parser le contenu du quiz
        logger.info("Parsing quiz content...")
        questions = parse_quiz_markdown(data.quiz_content)
        
        if not questions:
            raise HTTPException(
                status_code=400, 
                detail="Aucune question n'a pu être extraite du contenu. Vérifiez le format du quiz."
            )
        
        logger.info(f"Parsed {len(questions)} questions")
        
        # 2. Créer le formulaire Google Form
        create_url = "https://forms.googleapis.com/v1/forms"
        headers = {
            "Authorization": f"Bearer {data.token}",
            "Content-Type": "application/json"
        }
        
        form_body = {
            "info": {
                "title": data.title,
                "documentTitle": data.title,
            }
        }
        
        # Créer le form vide
        response = requests.post(create_url, headers=headers, json=form_body)
        
        if response.status_code != 200:
            logger.error(f"Form creation error: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Erreur lors de la création du formulaire: {response.text}"
            )
        
        form_data = response.json()
        form_id = form_data.get('formId')
        form_url = form_data.get('responderUri')
        
        logger.info(f"Form created with ID: {form_id}")
        
        # 3. Configurer le form en mode QUIZ
        batch_url = f"https://forms.googleapis.com/v1/forms/{form_id}:batchUpdate"
        
        # Construire les requêtes pour ajouter les questions
        requests_batch = [
            {
                "updateSettings": {
                    "settings": {
                        "quizSettings": {
                            "isQuiz": True
                        }
                    },
                    "updateMask": "quizSettings.isQuiz"
                }
            }
        ]
        
        # Ajouter chaque question
        for idx, q in enumerate(questions):
            question_request = {
                "createItem": {
                    "item": {
                        "title": q.question_text,
                        "questionItem": {
                            "question": {
                                "required": True,
                                "choiceQuestion": {
                                    "type": "RADIO",
                                    "options": [{"value": choice} for choice in q.choices],
                                    "shuffle": False
                                },
                                "grading": {
                                    "pointValue": 1,
                                    "correctAnswers": {
                                        "answers": [{"value": q.correct_answer}]
                                    }
                                }
                            }
                        }
                    },
                    "location": {
                        "index": idx
                    }
                }
            }
            requests_batch.append(question_request)
        
        # Envoyer les mises à jour par batch
        batch_response = requests.post(
            batch_url,
            headers=headers,
            json={"requests": requests_batch}
        )
        
        if batch_response.status_code != 200:
            logger.error(f"Batch update error: {batch_response.text}")
            raise HTTPException(
                status_code=batch_response.status_code,
                detail=f"Erreur lors de la configuration du quiz: {batch_response.text}"
            )
        
        logger.info("Form configured as quiz with questions")
        
        return {
            "form_id": form_id,
            "form_url": form_url,
            "questions_count": len(questions),
            "message": "Formulaire créé avec succès (mode quiz, brouillon)"
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating Google Form: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne: {str(e)}"
        )
