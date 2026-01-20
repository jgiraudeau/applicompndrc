from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
import logging
import os
import google.oauth2.credentials
from googleapiclient.discovery import build
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class GoogleToken(BaseModel):
    token: str
    refresh_token: Optional[str] = None

class CourseWorkCreate(BaseModel):
    token: str
    refresh_token: Optional[str] = None
    courseId: str
    title: str
    description: str = ""
    materials: list = [] 

def get_credentials(token: str, refresh_token: str = None):
    """Helper to create Google Credentials with auto-refresh capability."""
    # Fetch Client Credentials
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    token_uri = "https://oauth2.googleapis.com/token"

    return google.oauth2.credentials.Credentials(
        token,
        refresh_token=refresh_token,
        token_uri=token_uri,
        client_id=client_id,
        client_secret=client_secret
    )

@router.post("/courses")
async def list_courses(data: GoogleToken = Body(...)):
    """List the courses the user is teaching using Google Client Library."""
    try:
        creds = get_credentials(data.token, data.refresh_token)
        service = build('classroom', 'v1', credentials=creds)

        results = service.courses().list(teacherId='me', courseStates='ACTIVE', pageSize=10).execute()
        courses = results.get('courses', [])
        
        return [{"id": c['id'], "name": c['name'], "section": c.get('section', '')} for c in courses]
        
    except Exception as e:
        logger.error(f"Error listing courses: {e}")
        # Return generic 500 but log detailed error (could be token expiry if refresh fail)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/coursework")
async def create_assignment(data: CourseWorkCreate = Body(...)):
    """Create a DRAFT assignment using Google Client Library."""
    try:
        creds = get_credentials(data.token, data.refresh_token)
        service = build('classroom', 'v1', credentials=creds)

        course_work = {
            'title': data.title,
            'description': data.description,
            'workType': 'ASSIGNMENT',
            'state': 'DRAFT',
            'submissionModificationMode': 'MODIFIABLE_UNTIL_TURNED_IN',
        }
        
        created = service.courses().courseWork().create(
            courseId=data.courseId, 
            body=course_work
        ).execute()

        return {"id": created.get('id'), "url": created.get('alternateLink')}
        
    except Exception as e:
        logger.error(f"Error creating coursework: {e}")
        raise HTTPException(status_code=500, detail=str(e))
