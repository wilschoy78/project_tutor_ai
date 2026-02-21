import sqlite3
import threading
from datetime import datetime
from typing import List, Dict, Any


class ConversationService:
    def __init__(self, db_path: str = "./chat_history.db"):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._lock:
            with self._get_connection() as conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        course_id INTEGER NOT NULL,
                        student_id INTEGER NOT NULL,
                        role TEXT NOT NULL,
                        content TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_messages_course_student
                    ON messages(course_id, student_id, created_at)
                    """
                )

    def add_message(self, course_id: int, student_id: int, role: str, content: str) -> None:
        timestamp = datetime.utcnow().isoformat()
        with self._lock:
            with self._get_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO messages (course_id, student_id, role, content, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (course_id, student_id, role, content, timestamp),
                )

    def get_history(self, course_id: int, student_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            with self._get_connection() as conn:
                cursor = conn.execute(
                    """
                    SELECT id, role, content, created_at
                    FROM messages
                    WHERE course_id = ? AND student_id = ?
                    ORDER BY created_at ASC
                    LIMIT ?
                    """,
                    (course_id, student_id, limit),
                )
                rows = cursor.fetchall()
        return [
            {
                "id": row["id"],
                "role": row["role"],
                "content": row["content"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]


conversation_service = ConversationService()

