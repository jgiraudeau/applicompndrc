from fastapi import APIRouter, HTTPException, Body, Depends
from pydantic import BaseModel
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class GoogleToken(BaseModel):
    token: str

class CourseWorkCreate(BaseModel):
    token: str
    courseId: str
    title: str
    description: str = ""
    materials: list = [] # Future use for links/drive files

def get_classroom_service(token: str):
    """Builds and returns the Google Classroom service using the provided access token."""
    try:
        creds = Credentials(token=token)
        service = build('classroom', 'v1', credentials=creds)
        return service
    except Exception as e:
        logger.error(f"Failed to create Classroom service: {e}")
        raise HTTPException(status_code=400, detail="Invalid Google Token or Service Error")

@router.post("/courses")
async def list_courses(data: GoogleToken = Body(...)):
    """List the courses the user is teaching."""
    try:
        service = get_classroom_service(data.token)
        # teacherId='me' lists courses where user is a teacher
        results = service.courses().list(teacherId='me', pageSize=10).execute()
        courses = results.get('courses', [])
        
        # Simplified response
        return [{"id": c['id'], "name": c['name'], "section": c.get('section', '')} for c in courses]
    except Exception as e:
        logger.error(f"Error listing courses: {e}")
        # If user has no courses or API not enabled, return empty list or error
        # Often "403" if scope is missing.
        raise HTTPException(status_code=500, detail=f"Google API Error: {str(e)}")

@router.post("/coursework")
async def create_assignment(data: CourseWorkCreate = Body(...)):
    """Create a DRAFT assignment in the specified course."""
    try:
        service = get_classroom_service(data.token)
        
        coursework = {
            'title': data.title,
            'description': data.description,
            'workType': 'ASSIGNMENT',
            'state': 'DRAFT', # Safer default
            'submissionModificationMode': 'MODIFIABLE_UNTIL_TURNED_IN',
        }
        
        created = service.courses().courseWork().create(
            courseId=data.courseId,
            body=coursework
        ).execute()
        
        return {"id": created.get('id'), "url": created.get('alternateLink')}
        
    except Exception as e:
        logger.error(f"Error creating coursework: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create assignment: {str(e)}")
