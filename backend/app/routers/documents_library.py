from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

from backend.app.database import get_db
import backend.app.models as models
import backend.app.auth as auth

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic Models
class DocumentCreate(BaseModel):
    title: str
    document_type: str
    content: str
    duration_hours: Optional[float] = None
    target_block: Optional[str] = None
    google_doc_url: Optional[str] = None


class DocumentResponse(BaseModel):
    id: str
    title: str
    document_type: str
    content: str
    duration_hours: Optional[float]
    target_block: Optional[str]
    google_doc_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("/save", response_model=DocumentResponse)
def save_document(
    doc_data: DocumentCreate = Body(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sauvegarder un document généré pour l'utilisateur connecté.
    """
    try:
        new_doc = models.GeneratedDocument(
            user_id=current_user.id,
            title=doc_data.title,
            document_type=doc_data.document_type,
            content=doc_data.content,
            duration_hours=doc_data.duration_hours,
            target_block=doc_data.target_block,
            google_doc_url=doc_data.google_doc_url
        )
        
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        
        logger.info(f"Document saved: {new_doc.id} for user {current_user.email}")
        
        return new_doc
        
    except Exception as e:
        logger.error(f"Error saving document: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving document: {str(e)}")


@router.get("/list", response_model=List[DocumentResponse])
def list_documents(
    document_type: Optional[str] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lister tous les documents de l'utilisateur connecté.
    Optionnel: filtrer par type de document.
    """
    try:
        query = db.query(models.GeneratedDocument).filter(
            models.GeneratedDocument.user_id == current_user.id
        )
        
        if document_type:
            query = query.filter(models.GeneratedDocument.document_type == document_type)
        
        documents = query.order_by(models.GeneratedDocument.created_at.desc()).all()
        
        return documents
        
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupérer un document spécifique.
    Vérifie que le document appartient bien à l'utilisateur.
    """
    try:
        document = db.query(models.GeneratedDocument).filter(
            models.GeneratedDocument.id == document_id,
            models.GeneratedDocument.user_id == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return document
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting document: {str(e)}")


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Supprimer un document.
    Vérifie que le document appartient bien à l'utilisateur.
    """
    try:
        document = db.query(models.GeneratedDocument).filter(
            models.GeneratedDocument.id == document_id,
            models.GeneratedDocument.user_id == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        db.delete(document)
        db.commit()
        
        logger.info(f"Document deleted: {document_id} by user {current_user.email}")
        
        return {"success": True, "message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")
