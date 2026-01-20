from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import google.oauth2.credentials
from googleapiclient.discovery import build
from backend.app.services.gemini_service import gemini_service
import google.generativeai as genai
import json
import re

router = APIRouter()

import os

class GoogleFormRequest(BaseModel):
    token: str # Google Access Token
    refresh_token: Optional[str] = None # Refresh Token for renewal
    title: str
    content: str # Markdown content

@router.post("/forms/create")
async def create_google_form_endpoint(request: GoogleFormRequest):
    try:
        # 1. Parse markdown to JSON using Gemini
        prompt = f"""
        Tu es un expert en éducation. Transforme ce quiz (format Markdown) en un tableau JSON strict pour créer un Google Form.
        Structure attendue pour chaque question :
        {{
            "title": "Le texte de la question",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_solution": "Option A" (Le texte exact de la bonne réponse, ou null si non précisé)
        }}

        Quiz Markdown :
        {request.content}

        Règles :
        - JSON Valid uniquement.
        - Pas de ```json au début ou à la fin. Juste le tableau [ ... ].
        """
        
        model = genai.GenerativeModel(gemini_service.model_name)
        response = model.generate_content(prompt)
        
        cleaned_json = response.text.replace('```json', '').replace('```', '').strip()
        # Handle potential leading/trailing whitespace or text
        match = re.search(r'\[.*\]', cleaned_json, re.DOTALL)
        if match:
            cleaned_json = match.group(0)
            
        questions_data = json.loads(cleaned_json)
        
        # 2. Init Google Forms API
        # We need Client credentials for refreshing
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        token_uri = "https://oauth2.googleapis.com/token"

        creds = google.oauth2.credentials.Credentials(
            request.token,
            refresh_token=request.refresh_token,
            token_uri=token_uri,
            client_id=client_id,
            client_secret=client_secret
        )
        
        # Build service (this will auto-refresh if token is expired and refresh_token is present)
        form_service = build('forms', 'v1', credentials=creds)
        
        # 3. Create the Form
        form_body = {
            "info": {
                "title": request.title,
                "documentTitle": request.title
            }
        }
        form = form_service.forms().create(body=form_body).execute()
        form_id = form['formId']
        
        # 4. Convert to Quiz (Optional, but good for teachers)
        # Update settings to make it a quiz
        update_settings = {
            "requests": [
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
        }
        try:
             form_service.forms().batchUpdate(formId=form_id, body=update_settings).execute()
        except Exception as e:
             print(f"Warning: Could not set Quiz mode: {e}")

        # 5. Add Questions
        batch_requests = []
        for index, q in enumerate(questions_data):
            # Prepare options with grading if correct_solution found
            options_List = []
            correct_answer_value = q.get('correct_solution')
            
            for opt_text in q.get('options', []):
                if opt_text: # Ensure text is not empty
                    option_obj = {"value": str(opt_text)}
                    options_List.append(option_obj)
            
            # FAILSAFE: Google API requires at least 1 option
            if not options_List:
                print(f"⚠️ Warning: Question '{q.get('title')}' has no options. Adding placeholder.")
                options_List.append({"value": "Vrai"})
                options_List.append({"value": "Faux"})

            # Construct Question Item
            question_item = {
                "createItem": {
                    "item": {
                        "title": q.get('title', f"Question {index+1}"),
                        "questionItem": {
                            "question": {
                                "required": True,
                                "grading": {
                                    "pointValue": 1,
                                    "correctAnswers": {
                                        "answers": [{"value": correct_answer_value}]
                                    }
                                } if correct_answer_value else None,
                                "choiceQuestion": {
                                    "type": "RADIO",
                                    "options": options_List,
                                    "shuffle": True
                                }
                            }
                        }
                    },
                    "location": {
                        "index": index
                    }
                }
            }
            batch_requests.append(question_item)
            
        if batch_requests:
            form_service.forms().batchUpdate(formId=form_id, body={"requests": batch_requests}).execute()
            
        return {"url": form["responderUri"], "edit_url": f"https://docs.google.com/forms/d/{form_id}/edit", "id": form_id}

    except Exception as e:
        print(f"❌ Google Forms Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
