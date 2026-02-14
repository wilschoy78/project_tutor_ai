# Teacher-Tutor Generative AI using LangChain
## An Open-source Approach to Personalized Learning

### Project Overview
This project implements an intelligent, personalized AI Tutor system that integrates with Moodle LMS. It uses Retrieval-Augmented Generation (RAG) to ground AI responses in specific course materials, ensuring academic relevance and accuracy.

### Key Features
1.  **Personalized Learning Paths**: Adapts content based on student learning styles (Visual/Textual) and performance history.
2.  **Real-time Feedback System**: Generates dynamic quizzes based on course content and tracks student performance.
3.  **Teacher Dashboard**: Provides analytics on student engagement, class averages, and individual struggles.
4.  **Moodle Integration**: Extracts course content (PDFs, Pages) to create a specialized knowledge base.
5.  **Open Source Stack**: Built entirely with open-source tools (LangChain, ChromaDB, Ollama, FastAPI, React).

### Tech Stack
-   **Backend**: Python, FastAPI
-   **Frontend**: React, TypeScript, Tailwind CSS
-   **AI/ML**: LangChain, Ollama (Mistral/Llama3), ChromaDB (Vector Store)
-   **Deployment**: Docker, Docker Compose

### Prerequisites
-   **Docker Desktop** installed
-   **Ollama** installed locally (`ollama serve`) with the `mistral` model pulled (`ollama pull mistral`).

### How to Run

#### Option 1: Using Docker (Recommended for Deployment)
1.  Ensure Ollama is running on your host machine:
    ```bash
    ollama serve
    ```
2.  Build and start the containers:
    ```bash
    docker-compose up --build
    ```
3.  Access the application:
    -   Frontend: `http://localhost`
    -   Backend API Docs: `http://localhost:8000/docs`

#### Option 2: Local Development
1.  **Backend**:
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    uvicorn main:app --reload
    ```
2.  **Frontend**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

### Project Structure
-   `/backend`: FastAPI application, RAG logic, and Vector Store management.
-   `/frontend`: React application with Chat Interface and Teacher Dashboard.
-   `/docker-compose.yml`: Orchestration for full-stack deployment.

### Capstone Defense Notes
For detailed architectural decisions, pedagogical justifications, and future work, please refer to `CAPSTONE_DEFENSE.md`.
