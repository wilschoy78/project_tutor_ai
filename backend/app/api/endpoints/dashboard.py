from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from app.services.student_service import student_service

router = APIRouter()

@router.get("/analytics/{course_id}", response_model=Dict[str, Any])
def get_course_analytics(course_id: int):
    """
    Get aggregated analytics for a specific course.
    """
    try:
        analytics = student_service.get_course_analytics(course_id)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
