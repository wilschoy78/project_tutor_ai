import sys
import os
import cloudscraper
import json

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.config import settings

def verify_connection_scraper():
    print("Verifying Moodle connection with cloudscraper...")
    
    url = f"{settings.MOODLE_URL}/webservice/rest/server.php"
    token = settings.MOODLE_TOKEN
    
    # Create a scraper instance
    scraper = cloudscraper.create_scraper()
    
    payload = {
        "wstoken": token,
        "wsfunction": "core_webservice_get_site_info",
        "moodlewsrestformat": "json"
    }
    
    try:
        print(f"Connecting to {url}...")
        response = scraper.post(url, data=payload)
        response.raise_for_status()
        
        # Check if we got the HTML challenge page instead of JSON
        if "<!DOCTYPE html>" in response.text or "Checking your browser" in response.text:
            print("Failed to bypass browser check.")
            print("Response preview:", response.text[:200])
            return

        data = response.json()
        print("Successfully connected to Moodle!")
        print(f"Site Name: {data.get('sitename')}")
        print(f"Username: {data.get('username')}")
            
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    verify_connection_scraper()
