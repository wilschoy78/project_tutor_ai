import json
import os
import re
import time
import uuid
from typing import List, Dict, Any, Optional
from app.services.rag_service import rag_service
from app.core.config import settings

QUIZ_DATA_DIR = settings.QUIZ_DATA_DIR

class QuizService:
    def __init__(self):
        os.makedirs(QUIZ_DATA_DIR, exist_ok=True)

    def _get_file_path(self, course_id: int) -> str:
        return os.path.join(QUIZ_DATA_DIR, f"course_{course_id}.json")

    def _load_quizzes(self, course_id: int) -> List[Dict[str, Any]]:
        file_path = self._get_file_path(course_id)
        if not os.path.exists(file_path):
            return []
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []

    def _save_quizzes(self, course_id: int, quizzes: List[Dict[str, Any]]) -> None:
        file_path = self._get_file_path(course_id)
        with open(file_path, 'w') as f:
            json.dump(quizzes, f, indent=2)

    def generate_quiz_candidates(self, course_id: int, topic: str, count: int = 1) -> List[Dict[str, Any]]:
        """
        Generates quizzes using RAG and saves them as pending.
        """
        def _key(q: Dict[str, Any]) -> str:
            question = str(q.get("question") or "").strip().lower()
            options = q.get("options") or []
            if not isinstance(options, list):
                options = []
            opts = "||".join([str(o).strip().lower() for o in options])
            return f"{question}::{opts}"

        def _near_duplicate(a: str, b: str) -> bool:
            def toks(s: str) -> set:
                parts = re.split(r"[^a-z0-9]+", (s or "").lower())
                return {p for p in parts if len(p) >= 3}
            ta = toks(a)
            tb = toks(b)
            if not ta or not tb:
                return False
            inter = len(ta & tb)
            union = len(ta | tb)
            score = inter / union if union else 0.0
            return score >= 0.82

        current_quizzes = self._load_quizzes(course_id)
        existing_keys = {_key(q) for q in current_quizzes}
        existing_questions = [q.get("question", "") for q in current_quizzes if q.get("question")]

        new_quizzes: List[Dict[str, Any]] = []
        attempts_per_item = 4
        for idx in range(count):
            created: Optional[Dict[str, Any]] = None
            for attempt in range(attempts_per_item):
                token = f"{idx + 1}/{count}:{attempt + 1}:{uuid.uuid4()}"
                avoid = [q.get("question", "") for q in new_quizzes if q.get("question")]
                quiz_data = rag_service.generate_quiz(course_id, topic, diversity_token=token, avoid_questions=avoid)
            
                quiz_record = {
                    "id": str(uuid.uuid4()),
                    "course_id": course_id,
                    "topic": topic,
                    "question": quiz_data.get("question", ""),
                    "options": quiz_data.get("options", []),
                    "correct_answer": quiz_data.get("correct_answer", ""),
                    "explanation": quiz_data.get("explanation", ""),
                    "hint": quiz_data.get("hint", ""),
                    "status": "pending",
                    "created_at": time.time(),
                    "source": "ai_generated"
                }
                k = _key(quiz_record)
                if k in existing_keys:
                    continue
                if any(_near_duplicate(quiz_record.get("question", ""), q.get("question", "")) for q in new_quizzes):
                    continue
                if any(_near_duplicate(quiz_record.get("question", ""), q) for q in existing_questions):
                    continue
                existing_keys.add(k)
                created = quiz_record
                break

            if created is None:
                continue
            new_quizzes.append(created)
        
        if new_quizzes:
            current_quizzes.extend(new_quizzes)
            self._save_quizzes(course_id, current_quizzes)
        
        return new_quizzes

    def get_quizzes(self, course_id: int, status: Optional[str] = None) -> List[Dict[str, Any]]:
        quizzes = self._load_quizzes(course_id)
        if status:
            return [q for q in quizzes if q.get("status") == status]
        return quizzes

    def update_quiz_status(self, course_id: int, quiz_id: str, status: str) -> Optional[Dict[str, Any]]:
        quizzes = self._load_quizzes(course_id)
        updated_quiz = None
        
        for q in quizzes:
            if q.get("id") == quiz_id:
                q["status"] = status
                q["updated_at"] = time.time()
                updated_quiz = q
                break
        
        if updated_quiz:
            self._save_quizzes(course_id, quizzes)
            
        return updated_quiz

    def get_student_quiz(self, course_id: int, topic: str) -> Dict[str, Any]:
        """
        Tries to find an APPROVED quiz for the topic.
        If none found, generates one on the fly (and marks it as auto-approved or transient).
        For this implementation, we will generate on fly if no approved quiz exists, 
        but we won't save it to the bank to avoid cluttering with unreviewed content.
        """
        # 1. Try to find an approved quiz matching the topic (fuzzy match or exact?)
        # For simplicity, we filter by topic substring or just pick a random approved one if topic is "General"
        approved = self.get_quizzes(course_id, status="approved")
        
        def _norm_topic(t: Any) -> str:
            s = str(t or "").strip().lower()
            s = " ".join(s.split())
            return s

        requested = _norm_topic(topic)
        is_general = requested in {"", "general", "general review", "general course review", "review"}

        candidates: List[Dict[str, Any]] = []
        if not is_general:
            for q in approved:
                qt = _norm_topic(q.get("topic"))
                if not qt:
                    continue
                if requested in qt or qt in requested:
                    candidates.append(q)

        if candidates:
            import random
            selected = random.choice(candidates)
            return {
                "question": selected["question"],
                "options": selected["options"],
                "correct_answer": selected["correct_answer"],
                "explanation": selected["explanation"],
                "hint": selected["hint"],
                "origin": "approved",
                "requested_topic": topic,
                "matched_topic": selected.get("topic"),
            }
            
        # 2. Fallback: Generate on the fly
        print(f"No approved quiz found for topic '{topic}', generating on the fly...")
        quiz = rag_service.generate_quiz(course_id, topic, diversity_token=str(uuid.uuid4()))
        if isinstance(quiz, dict):
            quiz["origin"] = "rag"
            quiz["requested_topic"] = topic
            quiz["matched_topic"] = None
        return quiz

quiz_service = QuizService()
