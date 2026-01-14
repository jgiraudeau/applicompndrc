from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
import logging
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


class GoogleDocCreate(BaseModel):
    token: str
    title: str
    content: str  # Contenu markdown


@router.post("/create")
async def create_google_doc(data: GoogleDocCreate = Body(...)):
    """
    Créer un Google Doc à partir de contenu markdown.
    Le document est créé dans Google Drive de l'utilisateur.
    """
    try:
        # 1. Créer un document Google Docs vide
        create_url = "https://docs.googleapis.com/v1/documents"
        headers = {
            "Authorization": f"Bearer {data.token}",
            "Content-Type": "application/json"
        }
        
        doc_body = {
            "title": data.title
        }
        
        response = requests.post(create_url, headers=headers, json=doc_body)
        
        if response.status_code != 200:
            logger.error(f"Doc creation error: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Erreur lors de la création du document: {response.text}"
            )
        
        doc_data = response.json()
        document_id = doc_data.get('documentId')
        
        logger.info(f"Google Doc created with ID: {document_id}")
        
        # 2. Insérer le contenu (converti de markdown vers texte simple)
        # Pour simplifier, on insère le contenu markdown tel quel
        # Une amélioration future serait de le convertir en rich text
        batch_url = f"https://docs.googleapis.com/v1/documents/{document_id}:batchUpdate"
        
        # Convertir les retours à la ligne markdown
        formatted_content = data.content.replace('\\n', '\n')
        
        requests_batch = [
            {
                "insertText": {
                    "location": {
                        "index": 1
                    },
                    "text": formatted_content
                }
            }
        ]
        
        batch_response = requests.post(
            batch_url,
            headers=headers,
            json={"requests": requests_batch}
        )
        
        if batch_response.status_code != 200:
            logger.error(f"Content insertion error: {batch_response.text}")
            # Le doc est créé mais vide, on retourne quand même l'ID
            logger.warning("Document created but content insertion failed")
        else:
            logger.info("Content inserted successfully")
        
        # 3. Obtenir l'URL du document
        # L'URL est au format: https://docs.google.com/document/d/{documentId}/edit
        doc_url = f"https://docs.google.com/document/d/{document_id}/edit"
        
        # 4. Rendre le document accessible (partage)
        # Par défaut, le doc est privé. Pour Classroom, il faut le rendre accessible
        drive_url = f"https://www.googleapis.com/drive/v3/files/{document_id}/permissions"
        
        permission_body = {
            "role": "reader",
            "type": "anyone"  # Accessible à toute personne avec le lien
        }
        
        perm_response = requests.post(
            drive_url,
            headers=headers,
            json=permission_body
        )
        
        if perm_response.status_code in [200, 201]:
            logger.info("Document made publicly accessible")
        else:
            logger.warning(f"Failed to make document public: {perm_response.text}")
        
        return {
            "document_id": document_id,
            "document_url": doc_url,
            "message": "Google Doc créé avec succès"
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating Google Doc: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne: {str(e)}"
        )
