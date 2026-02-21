from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from app.services.rag_service import rag_service
from app.services.student_service import student_service
from app.services.conversation_service import conversation_service

router = APIRouter()

class IngestRequest(BaseModel):
    course_id: int

class ChatRequest(BaseModel):
    course_id: int
    question: str
    student_id: int = 1

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]


class ChatHistoryMessage(BaseModel):
    id: int
    role: str
    content: str
    created_at: str

class QuizRequest(BaseModel):
    course_id: int
    topic: str

class QuizResponse(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str

class QuizSubmission(BaseModel):
    course_id: int
    student_id: int
    topic: str
    is_correct: bool

@router.post("/ingest", response_model=Dict[str, Any])
def ingest_course(request: IngestRequest):
    """
    Trigger ingestion of a course's content into the Vector DB.
    """
    try:
        result = rag_service.ingest_course_content(request.course_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/knowledge-base/{course_id}")
def get_knowledge_base(course_id: int):
    """
    Get a summary of ingested content for a course.
    """
    try:
        result = rag_service.get_knowledge_base_summary(course_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/knowledge-base/{course_id}", response_model=Dict[str, Any])
def clear_knowledge_base(course_id: int):
    """
    Clear all ingested knowledge base documents for a course.
    """
    try:
        result = rag_service.clear_knowledge_base(course_id)
        if result.get("status") != "success":
            raise HTTPException(status_code=500, detail=result.get("message", "Failed to clear knowledge base"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class LearningPathRequest(BaseModel):
    course_id: int
    student_id: int

@router.post("/learning-path")
def get_learning_path(request: LearningPathRequest):
    try:
        result = rag_service.generate_learning_path(request.course_id, request.student_id)
        overrides = student_service.get_learning_path_overrides(request.student_id, request.course_id)
        if isinstance(overrides, dict):
            pinned = overrides.get("pinned_recommendations") or []
            result["pinned_recommendations"] = pinned
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quiz/submit")
def submit_quiz_result(submission: QuizSubmission):
    """
    Record quiz result to update student progress.
    """
    try:
        score = 100 if submission.is_correct else 0
        # Use a timestamp or random ID for uniqueness in a real app
        # Here we just use the topic name
        import time
        quiz_name = f"Quiz: {submission.topic} ({int(time.time())})"
        
        student_service.update_student_progress(
            submission.student_id, 
            submission.course_id, 
            quiz_name, 
            score
        )
        return {"status": "success", "message": "Progress updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Ask a question about a specific course.
    """
    try:
        conversation_service.add_message(request.course_id, request.student_id, "user", request.question)
        result = rag_service.ask_question(request.course_id, request.question, request.student_id)
        conversation_service.add_message(request.course_id, request.student_id, "assistant", result["answer"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/history", response_model=List[ChatHistoryMessage])
def get_chat_history(course_id: int, student_id: int, limit: int = 50):
    """
    Get recent chat history for a course and student.
    """
    try:
        history = conversation_service.get_history(course_id, student_id, limit=limit)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quiz", response_model=QuizResponse)
def generate_quiz(request: QuizRequest):
    """
    Generate a quiz question based on a topic.
    """
    try:
        result = rag_service.generate_quiz(request.course_id, request.topic)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
