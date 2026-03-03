from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.rag_service import rag_service
from app.services.student_service import student_service
from app.services.conversation_service import conversation_service
from app.services.quiz_service import quiz_service

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
    student_id: int = 1
    topic: str

class QuizResponse(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    hint: Optional[str] = None

class QuizSubmission(BaseModel):
    course_id: int
    student_id: int
    topic: str
    is_correct: bool

class PendingQuiz(BaseModel):
    id: str
    course_id: int
    topic: str
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    hint: Optional[str] = None
    status: str
    created_at: float

class TeacherQuizRequest(BaseModel):
    course_id: int
    topic: str
    count: int = 1

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
        # We assume the progress is already synced or cached.
        # If the frontend wants to force a sync, we might need a flag.
        # For now, we rely on the cache in student_service.get_student_progress
        result = rag_service.generate_learning_path(request.course_id, request.student_id)
        overrides = student_service.get_learning_path_overrides(request.student_id, request.course_id)
        if isinstance(overrides, dict):
            pinned = overrides.get("pinned_recommendations") or []
            result["pinned_recommendations"] = pinned
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/progress/sync")
def sync_student_progress(request: LearningPathRequest):
    """
    Force sync of student progress from Moodle.
    """
    try:
        progress = student_service.sync_student_progress(request.student_id, request.course_id)
        return progress
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
        
        # Check if the user is asking for a quiz via chat text
        lower_q = request.question.lower()
        if "quiz" in lower_q and ("give" in lower_q or "create" in lower_q or "generate" in lower_q or "make" in lower_q):
            # Extract topic (simple heuristic)
            topic = "General Review"
            if "on" in lower_q:
                topic = request.question.split("on", 1)[1].strip()
            elif "about" in lower_q:
                topic = request.question.split("about", 1)[1].strip()
            
            # Generate quiz using the existing service
            quiz_data = quiz_service.get_student_quiz(request.course_id, topic)
            
            # Create a structured response that the frontend can detect
            # We return the quiz JSON as the answer, but wrapped in a specific way or just the JSON string?
            # The frontend checks if the message contains a 'quiz' property usually, but for /chat endpoint it returns ChatResponse { answer, sources }
            # So we need to encode it in the answer in a way the frontend can parse, OR rely on the frontend parsing "I've generated a quiz..."
            
            # Let's return a special marker that the frontend can detect to render the card
            import json
            quiz_json = json.dumps(quiz_data)
            
            # We save the interaction to history with the quiz marker
            # The frontend's history loader might already handle this if we save it correctly
            # But here we are returning a ChatResponse immediately.
            
            # Ideally, we should unify /chat and /quiz or make /chat capable of returning structured data.
            # For now, let's embed it in the answer with a hidden marker or just return the text and let the frontend handle it?
            # No, the user wants the interactive card.
            
            # Hack: Return the JSON string as the answer. The frontend needs to check if answer is valid JSON quiz.
            # Or better: "I've generated a quiz for you: <QUIZ_JSON>..."
            
            response_text = f"I've generated a quiz for you on {topic}:::JSON_QUIZ:::{quiz_json}"
            
            conversation_service.add_message(request.course_id, request.student_id, "assistant", response_text)
            
            return {
                "answer": response_text,
                "sources": []
            }

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
    Prioritizes approved quizzes from the Quiz Bank.
    """
    try:
        # Generate the quiz first (using quiz_service to leverage bank)
        # Note: get_student_quiz returns a dict, QuizResponse expects fields
        # quiz_service.get_student_quiz returns {question, options, correct_answer, explanation, hint}
        # which matches QuizResponse structure
        
        # Check quiz bank first
        quiz_data = quiz_service.get_student_quiz(request.course_id, request.topic)
        
        # Save to history so it persists
        conversation_service.add_message(request.course_id, request.student_id, "user", f"Give me a pop quiz on {request.topic}")
        conversation_service.add_message(request.course_id, request.student_id, "assistant", f"I've generated a quiz for you: {quiz_data['question']}")
        
        return quiz_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Teacher Quiz Management Endpoints ---

@router.get("/quizzes/pending", response_model=List[PendingQuiz])
def get_pending_quizzes(course_id: int):
    """
    Get all pending quizzes for a course.
    """
    try:
        quizzes = quiz_service.get_quizzes(course_id, status="pending")
        return quizzes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quizzes/generate", response_model=List[PendingQuiz])
def generate_quiz_candidates(request: TeacherQuizRequest):
    """
    Teacher triggers generation of quiz candidates for review.
    """
    try:
        quizzes = quiz_service.generate_quiz_candidates(request.course_id, request.topic, request.count)
        return quizzes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quizzes/{quiz_id}/approve")
def approve_quiz(course_id: int, quiz_id: str):
    """
    Approve a pending quiz.
    """
    try:
        result = quiz_service.update_quiz_status(course_id, quiz_id, "approved")
        if not result:
            raise HTTPException(status_code=404, detail="Quiz not found")
        return {"status": "success", "message": "Quiz approved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quizzes/{quiz_id}/reject")
def reject_quiz(course_id: int, quiz_id: str):
    """
    Reject (delete) a pending quiz.
    """
    try:
        # Currently update_quiz_status sets status='rejected'. 
        # We could also delete it. For now, marking as rejected is safer for audit.
        result = quiz_service.update_quiz_status(course_id, quiz_id, "rejected")
        if not result:
            raise HTTPException(status_code=404, detail="Quiz not found")
        return {"status": "success", "message": "Quiz rejected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
