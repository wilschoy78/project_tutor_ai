from typing import Dict, Any
import json
import os
import re
import time
from typing import Dict, Any, List
from app.services.moodle_client import moodle_client

# Define data directories
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
ANALYTICS_DIR = os.path.join(DATA_DIR, "analytics")
PROGRESS_DIR = os.path.join(DATA_DIR, "progress")

# Ensure directories exist
os.makedirs(ANALYTICS_DIR, exist_ok=True)
os.makedirs(PROGRESS_DIR, exist_ok=True)

AI_GRADES_FILE = os.path.join(DATA_DIR, "ai_grades.json")
STUDENT_PROFILES_FILE = os.path.join(DATA_DIR, "student_profiles.json")
LEARNING_PATH_OVERRIDES_FILE = os.path.join(DATA_DIR, "learning_path_overrides.json")


class StudentService:
    def __init__(self):
        self.ai_grades = self._load_ai_grades()
        self.student_profiles = self._load_student_profiles()
        self.learning_path_overrides = self._load_learning_path_overrides()

    def _load_json_file(self, filepath: str) -> Dict[str, Any]:
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading {filepath}: {e}")
                return {}
        return {}

    def _save_json_file(self, filepath: str, data: Any):
        try:
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving {filepath}: {e}")

    def _load_ai_grades(self) -> Dict[str, Any]:
        return self._load_json_file(AI_GRADES_FILE)

    def _save_ai_grades(self):
        self._save_json_file(AI_GRADES_FILE, self.ai_grades)
    
    def _load_student_profiles(self) -> Dict[str, Any]:
        return self._load_json_file(STUDENT_PROFILES_FILE)

    def _save_student_profiles(self):
        self._save_json_file(STUDENT_PROFILES_FILE, self.student_profiles)

    def _load_learning_path_overrides(self) -> Dict[str, Any]:
        return self._load_json_file(LEARNING_PATH_OVERRIDES_FILE)

    def _save_learning_path_overrides(self):
        self._save_json_file(LEARNING_PATH_OVERRIDES_FILE, self.learning_path_overrides)

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
        Fetches student grades and completion status.
        Tries to read from cache first, unless it's stale (not implemented here) or missing.
        """
        cache_file = os.path.join(PROGRESS_DIR, f"progress_{student_id}_{course_id}.json")
        cached_data = self._load_json_file(cache_file)
        if cached_data:
            return cached_data
            
        return self.sync_student_progress(student_id, course_id)

    def sync_student_progress(self, student_id: int, course_id: int) -> Dict[str, Any]:
        """
        Fetches fresh progress from Moodle and updates cache.
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

            progress_data = {
                "completed_modules": [], # TODO: Use core_completion_get_course_completion_status
                "quiz_scores": quiz_scores,
                "last_synced": "now" # In real app use timestamp
            }
            
            # Save to cache
            cache_file = os.path.join(PROGRESS_DIR, f"progress_{student_id}_{course_id}.json")
            self._save_json_file(cache_file, progress_data)
            
            return progress_data
            
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

        # Grade Passback to Moodle
        # Hardcoded Item ID for Demo (Course 3 -> Item 25)
        # In a real app, we would store this mapping in a DB
        if int(course_id) == 3:
            try:
                # We calculate the new aggregate grade.
                # Since Moodle's "AI Tutor Progress" item is a single value (0-100),
                # we should probably send the *average* of all AI quizzes, or just the latest score?
                # Usually, it's better to send an accumulated score. 
                # Let's send the AVERAGE of all AI quizzes taken so far.
                
                ai_scores = list(self.ai_grades[s_id][c_id].values())
                if ai_scores:
                    average_ai_grade = sum(ai_scores) / len(ai_scores)
                    print(f"Pushing grade {average_ai_grade} to Moodle assignment 'AI Tutor Progress' for User {student_id}")
                    result = moodle_client.push_ai_tutor_progress(course_id, student_id, average_ai_grade, assignment_name="AI Tutor Progress")
                    if isinstance(result, dict) and result.get("exception"):
                        print(f"Grade passback failed (API exception): {result}")
                    elif isinstance(result, dict) and result.get("status") == "failed":
                        print(f"Grade passback failed: {result.get('message')}")
            except Exception as e:
                print(f"Failed to push grade to Moodle: {e}")

        # Update the student's progress cache immediately
        cache_file = os.path.join(PROGRESS_DIR, f"progress_{student_id}_{course_id}.json")
        cached_data = self._load_json_file(cache_file)
        
        # If cache exists, inject the new score
        if cached_data:
            if "quiz_scores" not in cached_data:
                cached_data["quiz_scores"] = {}
            
            # Ensure the key format matches what we use in get_student_progress
            key = f"[AI] {quiz_name}"
            cached_data["quiz_scores"][key] = score
            self._save_json_file(cache_file, cached_data)
        else:
            # If no cache, force a full sync (which will include the new AI grade)
            self.sync_student_progress(student_id, course_id)
            
        # Also invalidate/update the course analytics cache if possible, or just let it be stale until sync
        # Ideally, we should update the analytics cache too for the teacher dashboard
        analytics_file = os.path.join(ANALYTICS_DIR, f"course_{course_id}.json")
        analytics_data = self._load_json_file(analytics_file)
        
        if analytics_data and "students" in analytics_data:
            for s in analytics_data["students"]:
                if str(s.get("id")) == s_id:
                    # Update this student's scores in the analytics snapshot
                    if "quiz_scores" not in s:
                        s["quiz_scores"] = {}
                    s["quiz_scores"][f"[AI] {quiz_name}"] = score
                    
                    # Recalculate average
                    scores = list(s["quiz_scores"].values())
                    if scores:
                        s["avg_score"] = round(sum(scores) / len(scores), 1)
                    break
            self._save_json_file(analytics_file, analytics_data)

    def sync_course_analytics(self, course_id: int) -> Dict[str, Any]:
        """
        Forces a refresh of course analytics from Moodle and caches the result.
        """
        try:
            print(f"Syncing analytics for course {course_id}...")
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

            # We iterate up to 50 students for safety in this demo, but ideally paginate or handle background task
            for user in filtered_users[:50]:
                uid = user["id"]
                fullname = f"{user.get('firstname', '')} {user.get('lastname', '')}".strip()

                profile = self.get_student_profile(uid)
                # Force sync individual progress as well
                progress = self.sync_student_progress(uid, course_id)

                quiz_scores_dict = progress.get("quiz_scores", {}) or {}
                student_scores = list(quiz_scores_dict.values())
                avg_score = sum(student_scores) / len(student_scores) if student_scores else 0

                if len(quiz_scores_dict) > 0:
                    active_students += 1
                    scores.append(avg_score)
                
                # Dynamically calculate weaknesses based on quiz scores
                # Group quizzes by topic (assuming format "Quiz: Topic Name" or similar)
                topic_map = {}
                for q_name, q_score in quiz_scores_dict.items():
                    name = q_name
                    if name.startswith("[AI] "):
                        name = name[5:]
                    
                    # Enhanced cleaning logic
                    # 1. Remove "Quiz:" prefix and trailing timestamps/IDs in parens
                    base = name.split("(")[0].strip()
                    
                    # 2. Remove common prefixes like "1 - ", "2 - ", "Quiz 1 - "
                    base = re.sub(r'^(?:Quiz\s*)?\d+\s*-\s*', '', base, flags=re.IGNORECASE)
                    
                    # 3. Remove "Quiz" or "Test" if it's the only word, or at the end
                    base = base.replace("Pop Quiz", "General Review") # Special case for AI quizzes
                    base = re.sub(r'\s+Quiz$', '', base, flags=re.IGNORECASE)
                    base = re.sub(r'\s+Test$', '', base, flags=re.IGNORECASE)
                    
                    base = base.strip()
                    
                    # 4. Fallback if empty
                    if not base or base.lower() == "general":
                        base = "General Course Concepts"
                    
                    if base not in topic_map:
                        topic_map[base] = []
                    topic_map[base].append(float(q_score))
                
                calculated_weaknesses = []
                for topic, t_scores in topic_map.items():
                    t_avg = sum(t_scores) / len(t_scores)
                    if t_avg < 75.0: # Threshold for weakness
                        calculated_weaknesses.append(topic)
                
                # Combine with profile weaknesses if any, ensuring uniqueness
                final_weaknesses = list(set(profile.get("weaknesses", []) + calculated_weaknesses))

                ai_quiz_entries: List[Dict[str, Any]] = []
                for q_name, q_score in quiz_scores_dict.items():
                    if not str(q_name).startswith("[AI] "):
                        continue
                    m_ts = re.search(r"\((\d{9,})\)", str(q_name))
                    ts = int(m_ts.group(1)) if m_ts else 0
                    try:
                        sc = float(q_score)
                    except Exception:
                        sc = 0.0
                    ai_quiz_entries.append({"ts": ts, "score": sc})

                ai_quiz_entries.sort(key=lambda x: x["ts"])
                ai_quizzes_taken = len(ai_quiz_entries)
                last_ai_quiz_ts = ai_quiz_entries[-1]["ts"] if ai_quiz_entries else None
                last_ai_quiz_score = ai_quiz_entries[-1]["score"] if ai_quiz_entries else None

                risk_reasons: List[str] = []
                if len(quiz_scores_dict) == 0:
                    risk_level = "no_data"
                    risk_reasons.append("No quiz attempts recorded yet.")
                else:
                    if avg_score < 50.0:
                        risk_level = "at_risk"
                        risk_reasons.append("Low average score (< 50%).")
                    elif avg_score < 75.0:
                        risk_level = "needs_support"
                        risk_reasons.append("Below mastery threshold (< 75%).")
                    else:
                        risk_level = "on_track"

                    if ai_quizzes_taken >= 3:
                        last3 = [x["score"] for x in ai_quiz_entries[-3:]]
                        if last3[0] > last3[1] > last3[2]:
                            risk_reasons.append("Declining performance trend in recent AI quizzes.")
                            if risk_level != "at_risk":
                                risk_level = "at_risk"

                    if last_ai_quiz_ts:
                        days_since = (time.time() - last_ai_quiz_ts) / 86400.0
                        if days_since > 7.0:
                            risk_reasons.append("No AI quiz activity in the last 7 days.")
                            if risk_level == "on_track":
                                risk_level = "needs_support"

                    if calculated_weaknesses:
                        risk_reasons.append(f"Struggling topics detected: {', '.join(calculated_weaknesses[:3])}.")

                detailed_students.append({
                    "id": uid,
                    "name": fullname,
                    "avg_score": round(avg_score, 1),
                    "quiz_scores": quiz_scores_dict,
                    "quizzes_taken": len(quiz_scores_dict),
                    "ai_quizzes_taken": ai_quizzes_taken,
                    "last_ai_quiz_ts": last_ai_quiz_ts,
                    "last_ai_quiz_score": last_ai_quiz_score,
                    "risk_level": risk_level,
                    "risk_reasons": risk_reasons,
                    "learning_style": profile.get("learning_style", "General"),
                    "strengths": profile.get("strengths", []),
                    "weaknesses": final_weaknesses
                })
            
            class_average = sum(scores) / len(scores) if scores else 0
            
            # Aggregate weaknesses across all students
            all_weaknesses = []
            for s in detailed_students:
                all_weaknesses.extend(s.get("weaknesses", []))
            
            from collections import Counter
            weakness_counts = Counter(all_weaknesses).most_common(5)
            top_weaknesses = [{"topic": topic, "count": count} for topic, count in weakness_counts]

            analytics_data = {
                "course_id": course_id,
                "total_students": total_students,
                "active_students": active_students if active_students > 0 else total_students, # Fallback if no grades yet,
                "average_score": round(class_average, 1),
                "top_weaknesses": top_weaknesses,
                "students": detailed_students
            }

            # Save to cache
            cache_file = os.path.join(ANALYTICS_DIR, f"course_{course_id}.json")
            self._save_json_file(cache_file, analytics_data)
            
            return analytics_data
            
        except Exception as e:
            print(f"Error fetching course analytics: {e}")
            return {
                "total_students": 0,
                "active_students": 0,
                "average_score": 0,
                "students": []
            }

    def get_course_analytics(self, course_id: int) -> Dict[str, Any]:
        """
        Returns cached analytics if available, otherwise syncs from Moodle.
        """
        cache_file = os.path.join(ANALYTICS_DIR, f"course_{course_id}.json")
        cached_data = self._load_json_file(cache_file)
        
        if cached_data:
            return cached_data
            
        return self.sync_course_analytics(course_id)

student_service = StudentService()
