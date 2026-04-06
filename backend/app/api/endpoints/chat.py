from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import html
from app.services.rag_service import rag_service
from app.services.student_service import student_service
from app.services.conversation_service import conversation_service
from app.services.quiz_service import quiz_service
from app.core.config import settings

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

@router.get("/knowledge-base/{course_id}/view", response_class=HTMLResponse)
def view_knowledge_base(course_id: int, request: Request):
    try:
        result = rag_service.get_knowledge_base_summary(course_id)
        sources = result.get("sources") if isinstance(result, dict) else None
        if not isinstance(sources, list):
            sources = []

        root_path = request.scope.get("root_path") or ""
        api_prefix = f"{root_path}{settings.API_V1_STR}"
        delete_url = f"{api_prefix}/ai/knowledge-base/{course_id}"
        json_url = f"{api_prefix}/ai/knowledge-base/{course_id}"
        home_url = f"{root_path}/"

        rows = []
        for s in sources:
            if not isinstance(s, dict):
                continue
            name = html.escape(str(s.get("name", "")))
            type_ = html.escape(str(s.get("type", "")))
            chunks = html.escape(str(s.get("chunks", "")))
            rows.append(
                f"<tr>"
                f"<td class='td name'>{name}</td>"
                f"<td class='td type'>{type_}</td>"
                f"<td class='td chunks'>{chunks}</td>"
                f"</tr>"
            )

        document_count = html.escape(str(result.get("document_count", 0))) if isinstance(result, dict) else "0"

        html_content = f"""
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Course Knowledge Base</title>
    <style>
      :root {{
        --bg: #f9fafb;
        --card: #ffffff;
        --border: #e5e7eb;
        --muted: #6b7280;
        --text: #111827;
        --indigo: #4f46e5;
        --red: #dc2626;
        --shadow: 0 10px 25px rgba(0,0,0,0.10);
      }}
      body {{
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      }}
      .wrap {{
        max-width: 980px;
        margin: 24px auto;
        padding: 0 16px;
      }}
      .modal {{
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: var(--shadow);
        overflow: hidden;
      }}
      .header {{
        padding: 20px 20px 12px 20px;
        border-bottom: 1px solid #f3f4f6;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }}
      .title {{
        font-size: 22px;
        font-weight: 800;
        line-height: 1.2;
        margin: 0;
      }}
      .subtitle {{
        margin: 6px 0 0 0;
        color: var(--muted);
        font-size: 13px;
      }}
      .content {{
        padding: 20px;
      }}
      .stat {{
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 18px;
        display: flex;
        align-items: center;
        gap: 14px;
        background: #fafafa;
      }}
      .icon {{
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: #eef2ff;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--indigo);
        font-weight: 800;
      }}
      .statLabel {{
        font-size: 12px;
        color: var(--muted);
        margin: 0;
      }}
      .statValue {{
        font-size: 22px;
        font-weight: 900;
        margin: 2px 0 0 0;
      }}
      .sectionTitle {{
        margin: 18px 0 10px 0;
        font-size: 12px;
        letter-spacing: 0.08em;
        color: var(--muted);
        font-weight: 800;
      }}
      table {{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border: 1px solid var(--border);
        border-radius: 14px;
        overflow: hidden;
        background: white;
      }}
      thead th {{
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--muted);
        text-align: left;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
        background: #fbfbfb;
      }}
      .td {{
        padding: 14px 16px;
        border-bottom: 1px solid #f3f4f6;
        font-size: 14px;
      }}
      tbody tr:last-child .td {{
        border-bottom: none;
      }}
      .chunks {{
        text-align: right;
        width: 90px;
        white-space: nowrap;
      }}
      .footer {{
        padding: 16px 20px;
        border-top: 1px solid #f3f4f6;
        background: #f9fafb;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }}
      .btn {{
        border: 1px solid var(--border);
        background: white;
        padding: 10px 14px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
      }}
      .btnDanger {{
        border-color: #fecaca;
        color: var(--red);
        background: #fff;
      }}
      .btnPrimary {{
        border-color: transparent;
        background: var(--indigo);
        color: white;
      }}
      .links {{
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }}
      .link {{
        color: var(--muted);
        font-size: 12px;
        text-decoration: none;
      }}
      .link:hover {{
        text-decoration: underline;
      }}
      .empty {{
        padding: 18px;
        border: 1px dashed var(--border);
        border-radius: 14px;
        color: var(--muted);
        background: #fafafa;
        text-align: center;
        font-size: 14px;
      }}
      .toast {{
        margin-top: 12px;
        font-size: 13px;
        color: var(--muted);
      }}
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="modal">
        <div class="header">
          <div>
            <h1 class="title">Course Knowledge Base</h1>
            <p class="subtitle">Ingested content available for AI</p>
            <p class="subtitle" style="margin-top:4px; font-size:12px;">Course ID: {course_id}</p>
          </div>
          <div class="links">
            <a class="link" href="{json_url}">View JSON</a>
            <a class="link" href="{home_url}">Back to App</a>
          </div>
        </div>
        <div class="content">
          <div class="stat">
            <div class="icon">KB</div>
            <div>
              <p class="statLabel">Total Documents</p>
              <p class="statValue">{document_count} Chunks</p>
            </div>
          </div>

          <div class="sectionTitle">Sources</div>
          {("<table><thead><tr><th>Name</th><th>Type</th><th style='text-align:right;'>Chunks</th></tr></thead><tbody>" + "".join(rows) + "</tbody></table>") if len(rows) > 0 else "<div class='empty'>No content found. Try ingesting the course.</div>"}
          <div id="toast" class="toast"></div>
        </div>
        <div class="footer">
          <button class="btn btnDanger" id="clearBtn">Clear Knowledge Base</button>
          <div style="display:flex; gap:10px;">
            <a class="btn" href="{home_url}" style="text-decoration:none; display:inline-flex; align-items:center;">Close</a>
          </div>
        </div>
      </div>
    </div>
    <script>
      const clearBtn = document.getElementById("clearBtn");
      const toast = document.getElementById("toast");
      const deleteUrl = {html.escape(delete_url)!r};
      clearBtn.addEventListener("click", async () => {{
        const msg =
          "This will clear the AI Knowledge Base for this course.\\n\\n" +
          "- Removes all ingested chunks/sources used for grounded answers\\n" +
          "- Does NOT change Moodle content or grades\\n" +
          "- Students may see fewer/no sources until content is refreshed again\\n\\n" +
          "Type CLEAR to confirm.";
        const typed = window.prompt(msg, "");
        if (!typed || typed.trim().toUpperCase() !== "CLEAR") return;
        clearBtn.disabled = true;
        clearBtn.textContent = "Clearing...";
        toast.textContent = "";
        try {{
          const res = await fetch(deleteUrl, {{ method: "DELETE" }});
          if (!res.ok) {{
            const data = await res.json().catch(() => null);
            const msg = (data && (data.detail || data.message)) ? (data.detail || data.message) : `HTTP ${{
              res.status
            }}`;
            throw new Error(msg);
          }}
          toast.textContent = "Knowledge base cleared. Reloading…";
          window.location.reload();
        }} catch (e) {{
          toast.textContent = `Failed to clear knowledge base: ${{
            (e && e.message) ? e.message : "Unknown error"
          }}`;
          clearBtn.disabled = false;
          clearBtn.textContent = "Clear Knowledge Base";
        }}
      }});
    </script>
  </body>
</html>
        """.strip()

        return html_content
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
