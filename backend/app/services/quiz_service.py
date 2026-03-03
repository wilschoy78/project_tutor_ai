import json
import os
import time
import uuid
from typing import List, Dict, Any, Optional
from app.services.rag_service import rag_service

QUIZ_DATA_DIR = "data/quizzes"

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
        new_quizzes = []
        for _ in range(count):
            # Generate using RAG
            quiz_data = rag_service.generate_quiz(course_id, topic)
            
            # Add metadata
            quiz_record = {
                "id": str(uuid.uuid4()),
                "course_id": course_id,
                "topic": topic,
                "question": quiz_data.get("question", ""),
                "options": quiz_data.get("options", []),
                "correct_answer": quiz_data.get("correct_answer", ""),
                "explanation": quiz_data.get("explanation", ""),
                "hint": quiz_data.get("hint", ""),
                "status": "pending",  # pending, approved, rejected
                "created_at": time.time(),
                "source": "ai_generated"
            }
            new_quizzes.append(quiz_record)
        
        # Save to file
        current_quizzes = self._load_quizzes(course_id)
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
        
        candidates = []
        for q in approved:
            # Simple topic matching
            if topic.lower() in q.get("topic", "").lower() or q.get("topic", "").lower() in topic.lower():
                candidates.append(q)
        
        if not candidates and topic.lower() in ["general", "general course review"]:
            candidates = approved

        if candidates:
            import random
            selected = random.choice(candidates)
            return {
                "question": selected["question"],
                "options": selected["options"],
                "correct_answer": selected["correct_answer"],
                "explanation": selected["explanation"],
                "hint": selected["hint"]
            }
            
        # 2. Fallback: Generate on the fly
        print(f"No approved quiz found for topic '{topic}', generating on the fly...")
        return rag_service.generate_quiz(course_id, topic)

quiz_service = QuizService()
