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
        Aggregates data for a teacher dashboard using real Moodle data.
        """
        analytics = {
            "course_id": course_id,
            "total_students": 0,
            "average_score": 0,
            "students": []
        }
        
        try:
            # 1. Get Enrolled Users
            enrolled_users = moodle_client._call_moodle("core_enrol_get_enrolled_users", {"courseid": course_id})
            
            if not enrolled_users:
                return analytics
            
            # Check for Moodle API exception (returned as dict)
            if isinstance(enrolled_users, dict) and "exception" in enrolled_users:
                print(f"ERROR: Moodle API exception: {enrolled_users}")
                return analytics

            if not isinstance(enrolled_users, list):
                print(f"ERROR: Unexpected response format: {enrolled_users}")
                return analytics
                
            total_score_sum = 0
            total_quizzes_count = 0
            
            for user in enrolled_users:
                # Filter out teachers/admins
                roles = user.get('roles', [])
                is_staff = False
                for role in roles:
                    if role.get('shortname') in ['editingteacher', 'teacher', 'manager', 'coursecreator']:
                        is_staff = True
                        break
                
                if is_staff:
                    continue

                student_id = user["id"]
                fullname = f"{user.get('firstname', '')} {user.get('lastname', '')}".strip()
                
                # Get progress
                prog = self.get_student_progress(student_id, course_id)
                scores = list(prog["quiz_scores"].values())
                avg = sum(scores) / len(scores) if scores else 0
                
                # Determine mock learning style for visualization
                learning_styles = ["Visual", "Textual", "Auditory", "Kinesthetic"]
                style = learning_styles[student_id % len(learning_styles)]
                
                student_data = {
                    "id": student_id,
                    "name": fullname,
                    "learning_style": style,
                    "completed_modules_count": len(prog["completed_modules"]),
                    "quiz_average": round(avg, 1),
                    "quizzes_taken": len(scores),
                    "last_activity": "Today" # Mock
                }
                
                analytics["students"].append(student_data)
                
                if scores:
                    total_score_sum += sum(scores)
                    total_quizzes_count += len(scores)

            analytics["total_students"] = len(analytics["students"])
            analytics["average_score"] = round(total_score_sum / total_quizzes_count, 1) if total_quizzes_count > 0 else 0
            
        except Exception as e:
            print(f"Error fetching course analytics: {e}")
            
        return analytics

student_service = StudentService()
