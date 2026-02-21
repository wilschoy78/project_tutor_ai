from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from app.services.student_service import student_service

router = APIRouter()


@router.get("/analytics/{course_id}", response_model=Dict[str, Any])
def get_course_analytics(course_id: int):
    try:
        analytics = student_service.get_course_analytics(course_id)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class StudentProfileUpdate(BaseModel):
    learning_style: Optional[str] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    interests: Optional[List[str]] = None


class LearningPathOverrides(BaseModel):
    course_id: int
    pinned_recommendations: List[str]


@router.get("/students/{student_id}/profile", response_model=Dict[str, Any])
def get_student_profile(student_id: int):
    try:
        profile = student_service.get_student_profile(student_id)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/students/{student_id}/profile", response_model=Dict[str, Any])
def update_student_profile(student_id: int, payload: StudentProfileUpdate):
    try:
        data: Dict[str, Any] = {}
        if payload.learning_style is not None:
            data["learning_style"] = payload.learning_style
        if payload.strengths is not None:
            data["strengths"] = payload.strengths
        if payload.weaknesses is not None:
            data["weaknesses"] = payload.weaknesses
        if payload.interests is not None:
            data["interests"] = payload.interests
        profile = student_service.update_student_profile(student_id, data)
        full_profile = student_service.get_student_profile(student_id)
        return full_profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students/{student_id}/learning-path-overrides", response_model=Dict[str, Any])
def get_learning_path_overrides(student_id: int, course_id: int):
    try:
        overrides = student_service.get_learning_path_overrides(student_id, course_id)
        return overrides
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/students/{student_id}/learning-path-overrides", response_model=Dict[str, Any])
def set_learning_path_overrides(student_id: int, payload: LearningPathOverrides):
    try:
        result = student_service.set_learning_path_overrides(
            student_id,
            payload.course_id,
            payload.pinned_recommendations,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
