from typing import Dict, Any, List
import json
import os
from app.services.moodle_client import moodle_client

AI_GRADES_FILE = "ai_grades.json"

class StudentService:
    def __init__(self):
        # Mock Data (fallback)
        self.mock_students = {
            1: {
                "name": "Mock Alice (Visual Learner)",
                "learning_style": "Visual",
                "strengths": ["Python Basics"],
                "weaknesses": ["Neural Networks"],
                "interests": ["Computer Vision"]
            }
        }
        self.ai_grades = self._load_ai_grades()

    def _load_ai_grades(self) -> Dict[str, Any]:
        if os.path.exists(AI_GRADES_FILE):
            try:
                with open(AI_GRADES_FILE, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def _save_ai_grades(self):
        try:
            with open(AI_GRADES_FILE, 'w') as f:
                json.dump(self.ai_grades, f)
        except Exception as e:
            print(f"Error saving AI grades: {e}")
        
    def get_student_profile(self, student_id: int) -> Dict[str, Any]:
        """
        Fetches student profile from Moodle and enriches it with local AI metadata.
        """
        try:
            # 1. Fetch Basic User Info from Moodle
            # Note: core_user_get_users_by_field is better but we use core_user_get_users for now
            users = moodle_client._call_moodle("core_user_get_users", {"criteria": [{"key": "id", "value": str(student_id)}]})
            
            if not users or "users" not in users or not users["users"]:
                print(f"User {student_id} not found in Moodle, using mock.")
                return self.mock_students.get(student_id, {"name": "Unknown", "learning_style": "General", "strengths": [], "weaknesses": []})
            
            user = users["users"][0]
            fullname = f"{user.get('firstname', '')} {user.get('lastname', '')}".strip()
            
            # 2. Determine Learning Style (Mock Logic for now, based on ID)
            # In real app, this would come from a database where we store AI-inferred attributes
            learning_styles = ["Visual", "Textual", "Auditory", "Kinesthetic"]
            style = learning_styles[student_id % len(learning_styles)]
            
            return {
                "id": user["id"],
                "name": fullname,
                "email": user.get("email"),
                "learning_style": style,
                "strengths": ["General Knowledge"], # Placeholder
                "weaknesses": ["Specific Details"], # Placeholder
                "interests": ["AI", "Moodle"] # Placeholder
            }
            
        except Exception as e:
            print(f"Error fetching student profile: {e}")
            return self.mock_students.get(student_id, {"name": "Error User", "learning_style": "General", "strengths": [], "weaknesses": []})

    def get_student_progress(self, student_id: int, course_id: int) -> Dict[str, Any]:
        """
        Fetches student grades and completion status from Moodle.
        """
        try:
            # 1. Fetch Grades
            grades_data = moodle_client._call_moodle("gradereport_user_get_grade_items", {"courseid": course_id, "userid": student_id})
            
            # DEBUG LOGGING
            # print(f"DEBUG: Grades response for user {student_id}: {grades_data}")
            
            quiz_scores = {}
            if "usergrades" in grades_data and grades_data["usergrades"]:
                for item in grades_data["usergrades"][0]["gradeitems"]:
                    if item["itemtype"] == "mod" and item["itemmodule"] == "quiz":
                        name = item.get("itemname", "Unknown Quiz")
                        grade = item.get("gradeformatted", "0")
                        # Simple parsing, remove % or non-numeric
                        try:
                            score = float(grade.replace('%', '').replace('-', '0'))
                        except:
                            score = 0
                        quiz_scores[name] = score

            # 2. Merge with AI Quiz Grades
            # Structure: self.ai_grades[str(student_id)][str(course_id)] = { "Quiz Name": score }
            s_id = str(student_id)
            c_id = str(course_id)
            if s_id in self.ai_grades and c_id in self.ai_grades[s_id]:
                ai_scores = self.ai_grades[s_id][c_id]
                # Merge, AI scores might overwrite if same name (unlikely for "Pop Quiz")
                # But we want to distinguish them, maybe prepend [AI]
                for q_name, q_score in ai_scores.items():
                    quiz_scores[f"[AI] {q_name}"] = q_score

            return {
                "completed_modules": [], # TODO: Use core_completion_get_course_completion_status
                "quiz_scores": quiz_scores
            }
            
        except Exception as e:
            print(f"Error fetching progress: {e}")
            return {"completed_modules": [], "quiz_scores": {}}

    def update_student_progress(self, student_id: int, course_id: int, quiz_name: str, score: int):
        # In a real scenario, we might write this back to Moodle or our local DB
        print(f"Recording progress for Student {student_id}, Course {course_id}: {quiz_name} = {score}")
        
        s_id = str(student_id)
        c_id = str(course_id)
        
        if s_id not in self.ai_grades:
            self.ai_grades[s_id] = {}
        if c_id not in self.ai_grades[s_id]:
            self.ai_grades[s_id][c_id] = {}
            
        self.ai_grades[s_id][c_id][quiz_name] = score
        self._save_ai_grades()

    def get_course_analytics(self, course_id: int) -> Dict[str, Any]:
        """
        Aggregates analytics for the entire class.
        """
        try:
            # 1. Get Enrolled Users
            enrolled_users = moodle_client._call_moodle("core_enrol_get_enrolled_users", {"courseid": course_id})
            
            total_students = len(enrolled_users)
            active_students = 0 # Placeholder logic
            
            scores = []
            
            # 2. Detailed Student Analytics (New)
            detailed_students = []

            # Limit detailed fetch to first 20 students to avoid performance hit on large classes
            for user in enrolled_users[:20]:
                uid = user["id"]
                fullname = f"{user.get('firstname', '')} {user.get('lastname', '')}".strip()
                
                # Fetch individual progress
                progress = self.get_student_progress(uid, course_id)
                
                # Calculate average score for this student
                student_scores = list(progress.get("quiz_scores", {}).values())
                avg_score = sum(student_scores) / len(student_scores) if student_scores else 0
                
                if avg_score > 0:
                    active_students += 1
                    scores.append(avg_score)
                
                detailed_students.append({
                    "id": uid,
                    "name": fullname,
                    "avg_score": round(avg_score, 1),
                    "quiz_scores": progress.get("quiz_scores", {}),
                    "learning_style": self.get_student_profile(uid)["learning_style"]
                })
            
            class_average = sum(scores) / len(scores) if scores else 0
            
            return {
                "total_students": total_students,
                "active_students": active_students if active_students > 0 else total_students, # Fallback if no grades yet
                "average_score": round(class_average, 1),
                "students": detailed_students
            }
            
        except Exception as e:
            print(f"Error fetching course analytics: {e}")
            return {
                "total_students": 0,
                "active_students": 0,
                "average_score": 0,
                "students": []
            }

student_service = StudentService()
