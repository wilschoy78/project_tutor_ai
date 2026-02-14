import sys
import os
import requests
import json

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.config import settings

BASE_URL = "http://localhost:8000/api/v1/ai"

def test_rag_pipeline():
    print("Testing RAG Pipeline...")
    
    # 1. Ingest Course Content (Mock)
    print("\n1. Ingesting content for Course 101...")
    try:
        response = requests.post(f"{BASE_URL}/ingest", json={"course_id": 101})
        response.raise_for_status()
        print(f"Ingestion result: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Ingestion failed: {e}")
        return

    # 2. Ask a Question
    question = "What topics are covered in Week 1?"
    print(f"\n2. Asking question: '{question}'...")
    try:
        response = requests.post(f"{BASE_URL}/chat", json={
            "course_id": 101,
            "question": question
        })
        response.raise_for_status()
        result = response.json()
        print(f"Answer: {result['answer']}")
        print("\nSources used:")
        for source in result['sources']:
            print(f"- {source['source']} ({source['type']})")
            
    except Exception as e:
        print(f"Chat failed: {e}")

if __name__ == "__main__":
    test_rag_pipeline()
