import sys
import os

# Add backend directory to sys.path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.services.moodle_client import moodle_client
import json

def verify_connection():
    print("Verifying Moodle connection...")
    try:
        site_info = moodle_client.get_site_info()
        print("Successfully connected to Moodle!")
        print(f"Site Name: {site_info.get('sitename')}")
        print(f"Username: {site_info.get('username')}")
        print("-" * 20)
        
        print("Fetching courses...")
        courses = moodle_client.get_courses()
        print(f"Found {len(courses)} courses:")
        for course in courses:
            print(f"- {course.get('fullname')} (ID: {course.get('id')})")
            
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    verify_connection()
