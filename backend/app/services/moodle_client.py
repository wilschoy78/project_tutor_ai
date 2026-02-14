import requests
from typing import Dict, Any, List, Optional
from app.core.config import settings

class MoodleClient:
    def __init__(self):
        self.url = settings.MOODLE_URL
        self.token = settings.MOODLE_TOKEN
        self.rest_endpoint = f"{self.url}/webservice/rest/server.php"
        print(f"MoodleClient initialized with URL: {self.url}")
        print(f"MoodleClient initialized with Token: {self.token}")

    def _call_moodle(self, function_name: str, params: Dict[str, Any] = None) -> Any:
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
            response = requests.post(self.rest_endpoint, data=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error calling Moodle API: {e}")
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

    def download_file(self, file_url: str) -> Optional[bytes]:
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
            response = requests.get(url_with_token)
            response.raise_for_status()
            return response.content
        except requests.RequestException as e:
            print(f"Error downloading file {file_url}: {e}")
            return None

class MockMoodleClient(MoodleClient):
    """
    Mock client for development/testing when Moodle is unreachable.
    """
    def _call_moodle(self, function_name: str, params: Dict[str, Any] = None) -> Any:
        print(f"[MOCK] Calling Moodle: {function_name} with {params}")
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
moodle_client = MoodleClient() if not settings.USE_MOCK_MOODLE else MockMoodleClient()
