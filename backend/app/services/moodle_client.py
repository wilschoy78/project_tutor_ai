import requests
from typing import Dict, Any, List, Optional
from app.core.config import settings

class MoodleClient:
    def __init__(self):
        self.url = settings.MOODLE_URL
        self.token = settings.MOODLE_TOKEN
        self.rest_endpoint = f"{self.url}/webservice/rest/server.php"
        print(f"MoodleClient initialized with URL: {self.url}")
        print("MoodleClient initialized with Token: [REDACTED]")

    def _call_moodle(self, function_name: str, params: Dict[str, Any] = None, method: str = "POST") -> Any:
        """
        Generic method to call Moodle Web Service API.
        """
        if params is None:
            params = {}
            
        payload = {
            "wstoken": self.token,
            "wsfunction": function_name,
            "moodlewsrestformat": "json",
            **params
        }
        
        try:
            headers = {
                "User-Agent": "TeacherTutorAI/1.0",
                "Accept": "application/json"
            }
            if method.upper() == "GET":
                response = requests.get(self.rest_endpoint, params=payload, headers=headers)
            else:
                response = requests.post(self.rest_endpoint, data=payload, headers=headers)
                
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error calling Moodle API ({method}): {e}")
            raise

    def get_site_info(self) -> Dict[str, Any]:
        """
        Get Moodle site information.
        """
        return self._call_moodle("core_webservice_get_site_info")

    def get_courses(self) -> List[Dict[str, Any]]:
        """
        Get list of courses.
        """
        # core_course_get_courses usually returns all courses if no ids provided, 
        # or we might need to use core_course_get_courses_by_field if strict
        # Let's try to get all courses available to the user
        # Note: 'core_course_get_courses' might return all courses if user is admin
        try:
            return self._call_moodle("core_course_get_courses")
        except:
             # Fallback to core_course_get_courses_by_field if the first one fails or returns empty unexpectedly
            return self._call_moodle("core_course_get_courses_by_field")

    def get_course_contents(self, course_id: int) -> List[Dict[str, Any]]:
        """
        Get contents of a specific course (modules, sections).
        """
        return self._call_moodle("core_course_get_contents", {"courseid": course_id})

    def get_user_activities(self, course_id: int, user_id: int) -> Dict[str, Any]:
        """
        Get student's activity completion status and grades.
        """
        # Fetch completion status
        completion_data = self._call_moodle("core_completion_get_course_completion_status", {
            "courseid": course_id,
            "userid": user_id
        })
        
        # Fetch grades
        grades_data = self._call_moodle("gradereport_user_get_grade_items", {
            "courseid": course_id,
            "userid": user_id
        })
        
        return {
            "completion": completion_data,
            "grades": grades_data
        }

    def update_grade_item(self, course_id: int, user_id: int, item_id: int, grade: float) -> Any:
        """
        Update a manual grade item for a student.
        Note: The function 'core_grades_update_grades' is typically used for activity grades.
        For manual items, we might need 'gradereport_user_get_grade_items' to find it, 
        and then 'core_grade_update_grades' (singular/plural varies by version).
        
        However, the most standard way to write to the gradebook from an external tool 
        without LTI is often via 'core_grades_update_grades'.
        
        Parameters:
        - source: A string identifying the source of the grade (e.g., 'ai-tutor')
        - courseid: The course ID
        - component: 'mod_quiz', 'mod_assign', or 'moodle' for manual items?
          Actually, for manual items, it's tricky via WS API.
          
          Alternative: If we know the 'itemid', we can try using 'core_grades_update_grades' 
          but it usually requires 'component' and 'activityid'.
          
          Let's try a direct approach if the standard function supports itemid directly.
          Documentation says: core_grades_update_grades takes 'itemid', 'userid', 'gradeval', etc.
        """
        # Prepare the grade data structure
        # The structure usually expected by core_grades_update_grades is:
        # source, courseid, component, activityid, itemnumber, grades[...].
        # But wait, that function is for activity grades.
        
        # For MANUAL grade items, we often need to use a different approach or trick Moodle.
        # But let's assume we can use the 'itemid' directly if we can find a function.
        # Unfortunately, standard Moodle WS API doesn't have a simple "update_grade_item_by_id".
        
        # Let's try 'core_grade_update_grades' (if available plugin) or fallback.
        # Since we are hacking this for a demo, we might need to rely on the fact 
        # that we might not be able to push to a MANUAL item easily without a custom plugin.
        
        # However, let's try 'core_grades_update_grades' with generic params.
        # Warning: This is the most brittle part of Moodle API integration.
        
        # Let's try to just log it for now if we can't find the perfect function documentation.
        # But wait! 'gradereport_grader_update_grade' might exist? No.
        
        # Let's assume we use 'core_grade_update_grades' which allows updating generic grades.
        # params: source, courseid, component, activityid, itemnumber, grades
        
        # If we use a manual item, 'component' is 'moodle', 'activityid' is likely null?
        
        print(f"Attempting to update grade for user {user_id}, item {item_id} to {grade}")
        
        # We will try a specific payload structure often used for plugins
        # But since we can't guarantee it works without trial, we will wrap in try/catch
        
        # REVISED PLAN:
        # We will use 'core_grades_update_grades' with:
        # source = 'app', courseid = ..., component = 'unknown', activityid = ...
        # If that fails, we just log it. 
        # Actually, let's use a simpler known working function if possible.
        
        # For this specific capstone, if we can't push to manual item 25 easily,
        # we might just log "Grade Passback: Success (Simulated)" for the demo 
        # unless we are sure about the API.
        
        # Let's try the standard call:
        payload = {
            "source": "ai-tutor",
            "courseid": course_id,
            "component": "mod_manual", # Guessing component for manual items
            "activityid": item_id,     # Using itemid as activityid might work?
            "itemnumber": 0,
            "grades": [
                {
                    "studentid": user_id,
                    "grade": grade
                }
            ]
        }
        
        # NOTE: This call is speculative because Moodle's API for manual items is obscure.
        # If it fails, we will catch it and log a warning but not crash the app.
        try:
            print(f"Calling Moodle API 'core_grades_update_grades' with payload: {payload}")
            # Try GET request to avoid 405 Method Not Allowed
            response = self._call_moodle("core_grades_update_grades", payload, method="GET")
            print(f"Moodle API Response: {response}")
            return response
        except Exception as e:
            print(f"Grade passback failed (expected if manual item API not enabled): {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Moodle Error Details: {e.response.text}")
            return {"status": "failed", "message": str(e)}

    def _get_assignments(self, course_id: int) -> List[Dict[str, Any]]:
        response = self._call_moodle(
            "mod_assign_get_assignments",
            {
                "courseids[0]": course_id,
            },
            method="GET",
        )
        courses = response.get("courses") if isinstance(response, dict) else None
        if not courses:
            return []
        assignments: List[Dict[str, Any]] = []
        for c in courses:
            if isinstance(c, dict) and int(c.get("id", -1)) == int(course_id):
                assignments = c.get("assignments") or []
                break
        return assignments if isinstance(assignments, list) else []

    def _find_assignment_id_by_name(self, course_id: int, assignment_name: str) -> Optional[int]:
        assignments = self._get_assignments(course_id)
        target = assignment_name.strip().lower()
        for a in assignments:
            if not isinstance(a, dict):
                continue
            name = str(a.get("name", "")).strip().lower()
            if name == target:
                try:
                    return int(a.get("id"))
                except Exception:
                    return None
        return None

    def save_assignment_grade(self, assignment_id: int, user_id: int, grade: float) -> Any:
        payload = {
            "assignmentid": assignment_id,
            "userid": user_id,
            "grade": float(grade),
            "attemptnumber": -1,
            "addattempt": 0,
        }
        print(f"Calling Moodle API 'mod_assign_save_grade' with payload: {payload}")
        response = self._call_moodle("mod_assign_save_grade", payload, method="GET")
        print(f"Moodle API Response: {response}")
        return response

    def push_ai_tutor_progress(self, course_id: int, user_id: int, grade: float, assignment_name: str = "AI Tutor Progress") -> Any:
        assignment_id = self._find_assignment_id_by_name(course_id, assignment_name)
        if assignment_id is None:
            return {
                "status": "failed",
                "message": f"Assignment not found: {assignment_name}",
            }
        return self.save_assignment_grade(assignment_id, user_id, grade)

    def download_file(self, file_url: str, max_bytes: Optional[int] = None) -> Optional[bytes]:
        """
        Download a file from Moodle using the token.
        """
        if not file_url:
            return None

        # Moodle file URLs usually need the token appended
        if "?" in file_url:
            url_with_token = f"{file_url}&token={self.token}"
        else:
            url_with_token = f"{file_url}?token={self.token}"
            
        try:
            print(f"Downloading file from Moodle: {file_url}")
            response = requests.get(url_with_token, stream=True, timeout=30)
            response.raise_for_status()
            if max_bytes is None:
                return response.content

            data = bytearray()
            for chunk in response.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                data.extend(chunk)
                if len(data) > max_bytes:
                    print(f"Skipped file download (over {max_bytes} bytes): {file_url}")
                    return None
            return bytes(data)
        except requests.RequestException as e:
            print(f"Error downloading file {file_url}: {e}")
            return None

class MockMoodleClient(MoodleClient):
    """
    Mock client for development/testing when Moodle is unreachable.
    """
    def _call_moodle(self, function_name: str, params: Dict[str, Any] = None, method: str = "POST") -> Any:
        print(f"[MOCK] Calling Moodle ({method}): {function_name} with {params}")
        if function_name == "core_webservice_get_site_info":
            return {
                "sitename": "Mock Moodle Site",
                "username": "admin",
                "firstname": "Admin",
                "lastname": "User",
                "userid": 1,
                "userpictureurl": "https://secure.gravatar.com/avatar/test?s=100&d=mm&r=g"
            }
        elif function_name == "core_course_get_courses":
            return [
                {"id": 1, "fullname": "Introduction to AI", "shortname": "AI-101"},
                {"id": 2, "fullname": "Advanced Python", "shortname": "PY-201"}
            ]
        elif function_name == "core_course_get_contents":
            return [
                {
                    "id": 101,
                    "name": "Week 1: Basics",
                    "modules": [
                        {
                            "id": 1001,
                            "name": "What is AI?",
                            "modname": "page",
                            "contents": [{"fileurl": "http://mock/file.pdf", "filename": "intro.pdf"}]
                        },
                        {
                            "id": 1002,
                            "name": "Quiz 1",
                            "modname": "quiz"
                        }
                    ]
                }
            ]
        return {}

# Use Mock client if connection fails or explicitly requested
moodle_client = MoodleClient() if not settings.ENABLE_MOCK_MOODLE else MockMoodleClient()
