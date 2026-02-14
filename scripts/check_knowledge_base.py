import sys
import os
import chromadb

# Add backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

def check_knowledge_base(course_id: int):
    print(f"Checking Knowledge Base for Course {course_id}...")
    
    # Connect to ChromaDB
    # Note: Depending on how it's running, we might need to point to the docker volume or run this INSIDE the container.
    # Since we are on the host, we can try to access the mapped volume './backend/chroma_db'
    
    db_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'chroma_db')
    
    if not os.path.exists(db_path):
        print(f"Error: Database path not found at {db_path}")
        return

    try:
        client = chromadb.PersistentClient(path=db_path)
        collection = client.get_collection("moodle_content")
        
        # Query for all documents with this course_id
        results = collection.get(where={"course_id": course_id})
        
        if not results['ids']:
            print("No documents found for this course.")
            return

        print(f"\nFound {len(results['ids'])} chunks.")
        
        # Group by Source
        sources = {}
        for meta in results['metadatas']:
            source = meta.get('source', 'Unknown')
            mod_type = meta.get('type', 'Unknown')
            key = f"{source} ({mod_type})"
            sources[key] = sources.get(key, 0) + 1
            
        print("\n--- Ingested Content Sources ---")
        for source, count in sources.items():
            print(f"- {source}: {count} chunks")
            
    except Exception as e:
        print(f"Error reading database: {e}")
        print("Note: If the backend container is running, it might lock the DB file. Try running this script inside the container.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        c_id = int(sys.argv[1])
    else:
        c_id = 2 # Default to Course 2
    check_knowledge_base(c_id)
