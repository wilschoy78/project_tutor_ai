from typing import Dict, Any
import json
import os
import re
from app.services.moodle_client import moodle_client

AI_GRADES_FILE = "ai_grades.json"
STUDENT_PROFILES_FILE = "student_profiles.json"
LEARNING_PATH_OVERRIDES_FILE = "learning_path_overrides.json"


class StudentService:
    def __init__(self):
        self.ai_grades = self._load_ai_grades()
        self.student_profiles = self._load_student_profiles()
        self.learning_path_overrides = self._load_learning_path_overrides()

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
    
    def _load_student_profiles(self) -> Dict[str, Any]:
        if os.path.exists(STUDENT_PROFILES_FILE):
            try:
                with open(STUDENT_PROFILES_FILE, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading student profiles: {e}")
                return {}
        return {}

    def _save_student_profiles(self):
        try:
            with open(STUDENT_PROFILES_FILE, 'w') as f:
                json.dump(self.student_profiles, f)
        except Exception as e:
            print(f"Error saving student profiles: {e}")

    def _load_learning_path_overrides(self) -> Dict[str, Any]:
        if os.path.exists(LEARNING_PATH_OVERRIDES_FILE):
            try:
                with open(LEARNING_PATH_OVERRIDES_FILE, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading learning path overrides: {e}")
                return {}
        return {}

    def _save_learning_path_overrides(self):
        try:
            with open(LEARNING_PATH_OVERRIDES_FILE, 'w') as f:
                json.dump(self.learning_path_overrides, f)
        except Exception as e:
            print(f"Error saving learning path overrides: {e}")

    def get_learning_path_overrides(self, student_id: int, course_id: int) -> Dict[str, Any]:
        s_id = str(student_id)
        c_id = str(course_id)
        if s_id in self.learning_path_overrides and c_id in self.learning_path_overrides[s_id]:
            return self.learning_path_overrides[s_id][c_id]
        return {"pinned_recommendations": []}

    def set_learning_path_overrides(self, student_id: int, course_id: int, pinned_recommendations: Any) -> Dict[str, Any]:
        s_id = str(student_id)
        c_id = str(course_id)
        if s_id not in self.learning_path_overrides:
            self.learning_path_overrides[s_id] = {}
        if not isinstance(pinned_recommendations, list):
            pinned_list = []
        else:
            pinned_list = [str(x) for x in pinned_recommendations]
        self.learning_path_overrides[s_id][c_id] = {"pinned_recommendations": pinned_list}
        self._save_learning_path_overrides()
        return self.learning_path_overrides[s_id][c_id]

    def update_student_profile(self, student_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        s_id = str(student_id)
        profile = self.student_profiles.get(s_id, {
            "learning_style": "General",
            "strengths": [],
            "weaknesses": [],
            "interests": []
        })
        if "learning_style" in data and data["learning_style"]:
            profile["learning_style"] = data["learning_style"]
        if "strengths" in data and isinstance(data["strengths"], list):
            profile["strengths"] = data["strengths"]
        if "weaknesses" in data and isinstance(data["weaknesses"], list):
            profile["weaknesses"] = data["weaknesses"]
        if "interests" in data and isinstance(data["interests"], list):
            profile["interests"] = data["interests"]
        self.student_profiles[s_id] = profile
        self._save_student_profiles()
        return profile
        
    def get_student_profile(self, student_id: int) -> Dict[str, Any]:
        """
        Fetches student profile, combining persisted AI attributes with Moodle identity data.
        """
        s_id = str(student_id)
        profile = self.student_profiles.get(s_id)
        if not profile:
            profile = {
                "learning_style": "General",
                "strengths": [],
                "weaknesses": [],
                "interests": []
            }
            self.student_profiles[s_id] = profile
            self._save_student_profiles()

        name = "Unknown"
        email = None
        moodle_id = student_id

        try:
            users = moodle_client._call_moodle(
                "core_user_get_users",
                {"criteria": [{"key": "id", "value": str(student_id)}]}
            )

            if users and "users" in users and users["users"]:
                user = users["users"][0]
                name = f"{user.get('firstname', '')} {user.get('lastname', '')}".strip() or name
                email = user.get("email", email)
                moodle_id = user.get("id", moodle_id)
        except Exception as e:
            print(f"Error fetching Moodle user for profile {student_id}: {e}")

        return {
            "id": moodle_id,
            "name": name,
            "email": email,
            "learning_style": profile.get("learning_style", "General"),
            "strengths": profile.get("strengths", []),
            "weaknesses": profile.get("weaknesses", []),
            "interests": profile.get("interests", [])
        }

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
                        raw = item.get("percentageformatted") or item.get("gradeformatted") or "0"
                        score = 0.0
                        if isinstance(raw, (int, float)):
                            score = float(raw)
                        elif isinstance(raw, str):
                            m_pct = re.search(r"(-?\d+(?:\.\d+)?)", raw)
                            if m_pct:
                                score = float(m_pct.group(1))
                            else:
                                m_frac = re.search(r"(-?\d+(?:\.\d+)?)\s*/\s*(-?\d+(?:\.\d+)?)", raw)
                                if m_frac:
                                    num = float(m_frac.group(1))
                                    denom = float(m_frac.group(2)) or 1.0
                                    score = (num / denom) * 100.0
                        if score < 0:
                            score = 0.0
                        if score > 100:
                            score = 100.0
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
            # 1. Get Enrolled Users and filter out non-students (e.g., teachers/admins)
            enrolled_users = moodle_client._call_moodle("core_enrol_get_enrolled_users", {"courseid": course_id})

            filtered_users = []
            for user in enrolled_users:
                roles = user.get("roles") or []
                role_shortnames = {
                    str(r.get("shortname", "")).lower()
                    for r in roles
                    if isinstance(r, dict)
                }
                # Treat typical teaching/admin roles as non-students
                if role_shortnames and any(
                    r in {"editingteacher", "teacher", "manager", "admin", "coursecreator"}
                    for r in role_shortnames
                ):
                    continue
                filtered_users.append(user)

            total_students = len(filtered_users)
            active_students = 0 # Placeholder logic
            
            scores = []
            
            detailed_students = []

            for user in filtered_users[:20]:
                uid = user["id"]
                fullname = f"{user.get('firstname', '')} {user.get('lastname', '')}".strip()

                profile = self.get_student_profile(uid)
                progress = self.get_student_progress(uid, course_id)

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
                    "learning_style": profile.get("learning_style", "General"),
                    "strengths": profile.get("strengths", []),
                    "weaknesses": profile.get("weaknesses", [])
                })
            
            class_average = sum(scores) / len(scores) if scores else 0
            
            return {
                "course_id": course_id,
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
