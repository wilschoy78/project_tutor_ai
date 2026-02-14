from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.moodle_client import moodle_client

router = APIRouter()

@router.get("/courses", response_model=List[Dict[str, Any]])
def get_courses():
    """
    Fetch all available courses from the Moodle instance.
    This serves as the synchronization check for existing Moodle data.
    """
    try:
        # Call Moodle API core_course_get_courses
        # We don't need params to get all courses usually, or we can filter if needed
        courses = moodle_client._call_moodle("core_course_get_courses")
        
        # Clean up response if needed (Moodle returns a list of dicts)
        if isinstance(courses, list):
            return courses
        elif isinstance(courses, dict) and "courses" in courses:
             # Some API wrappers might return {"courses": [...]}
             return courses["courses"]
        else:
            # Fallback/Empty
            return []
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch courses from Moodle: {str(e)}")
