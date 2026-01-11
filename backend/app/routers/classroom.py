from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
import logging
import requests

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
    materials: list = [] 

@router.post("/courses")
async def list_courses(data: GoogleToken = Body(...)):
    """List the courses the user is teaching using raw HTTP requests."""
    try:
        url = "https://classroom.googleapis.com/v1/courses"
        headers = {
            "Authorization": f"Bearer {data.token}",
            "Accept": "application/json"
        }
        params = {
            "teacherId": "me",
            "pageSize": 10,
            "courseStates": "ACTIVE"
        }
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code != 200:
             logger.error(f"Google API Error ({response.status_code}): {response.text}")
             raise HTTPException(status_code=response.status_code, detail="Failed to fetch courses from Google")
             
        results = response.json()
        courses = results.get('courses', [])
        
        return [{"id": c['id'], "name": c['name'], "section": c.get('section', '')} for c in courses]
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error listing courses: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.post("/coursework")
async def create_assignment(data: CourseWorkCreate = Body(...)):
    """Create a DRAFT assignment using raw HTTP requests."""
    try:
        url = f"https://classroom.googleapis.com/v1/courses/{data.courseId}/courseWork"
        headers = {
            "Authorization": f"Bearer {data.token}",
            "Content-Type": "application/json"
        }
        
        body = {
            'title': data.title,
            'description': data.description,
            'workType': 'ASSIGNMENT',
            'state': 'DRAFT',
            'submissionModificationMode': 'MODIFIABLE_UNTIL_TURNED_IN',
        }
        
        response = requests.post(url, headers=headers, json=body)
        
        if response.status_code != 200:
             logger.error(f"Google API Work Creation Error ({response.status_code}): {response.text}")
             raise HTTPException(status_code=response.status_code, detail="Failed to create assignment")
             
        created = response.json()
        return {"id": created.get('id'), "url": created.get('alternateLink')}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating coursework: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
