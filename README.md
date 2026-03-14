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

### Configuration (Environment Variables)
The backend reads environment variables from `backend/.env` (when running locally) or from Docker Compose.

**Required**
-   `MOODLE_URL` (example: `https://bcccs.octanity.net/lms` or `http://moodle:80` in Docker)

**Recommended**
-   `MOODLE_TOKEN` (Moodle Web Services token for data extraction and grade sync)
-   `ENABLE_MOCK_MOODLE` (`True`/`False`) to toggle mock vs live Moodle client

**LLM Provider**
-   `LLM_PROVIDER` (`ollama` | `mistral_api` | `groq`)
-   `MODEL_NAME` (example: `mistral`, `llama-3.1-8b-instant`)
-   `OLLAMA_BASE_URL` (example: `http://localhost:11434` or `http://host.docker.internal:11434` in Docker)
-   `GROQ_API_KEY` or `MISTRAL_API_KEY` (only if using those providers)

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

### Moodle Plugin Installation (Production)
For installing and configuring the Moodle block plugin (including the tested setup for `https://bcccs.octanity.net/lms`), see: [MOODLE_INTEGRATION.md](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/MOODLE_INTEGRATION.md)

### Final Demo Recording (End-to-End Workflow)
Goal: record the full loop: **Student Chat → Teacher Approval → Analytics Update**.

**Pre-demo setup (5 minutes)**
1.  Start the stack (`docker-compose up --build`) and confirm:
    - Frontend loads: `http://localhost`
    - API docs load: `http://localhost:8000/docs`
2.  Pick a course from the UI (or call `GET /api/v1/moodle/courses`) and note its `courseId`.
3.  Open two browser windows (or profiles):
    - **Student**: `http://localhost?courseId=<COURSE>&studentId=<STUDENT>&role=student`
    - **Teacher**: `http://localhost?courseId=<COURSE>&studentId=<TEACHER>&role=teacher`

**Recording script (recommended order)**
1.  **Teacher: verify data + content**
    - Open Teacher Dashboard.
    - Click the content refresh/ingestion action (if present) and show “Knowledge Base” summary (optional).
2.  **Teacher: generate a pending quiz**
    - Go to the “Pending Quizzes” section.
    - Generate 1–2 quiz candidates for a topic the class is covering.
    - Leave them in **Pending**.
3.  **Student: request a quiz via chat**
    - In the chat, ask: “Generate a quiz on <topic>”.
    - Answer the quiz to trigger progress tracking (`POST /api/v1/ai/quiz/submit`).
4.  **Teacher: approve the quiz**
    - Return to “Pending Quizzes”.
    - Approve the same quiz candidate (`POST /api/v1/ai/quizzes/{quiz_id}/approve?course_id=<COURSE>`).
5.  **Student: request another quiz**
    - Ask again for a quiz on the same topic.
    - Highlight that the system now prioritizes **Approved** quiz bank items.
6.  **Teacher: analytics refresh**
    - Click “Sync Analytics” to recompute dashboard metrics (`POST /api/v1/dashboard/analytics/<COURSE>/sync`).
    - Show the student’s updated AI quiz count / last AI quiz score, and any risk-level change.

### Production Deployment Verification (Reverse Proxy)
These checks validate that your reverse proxy correctly routes the **new API endpoints** used by chat history, quiz approval, and analytics sync.

**API smoke tests (run on the production server)**
```bash
curl -fsS https://<YOUR_DOMAIN>/api/v1/openapi.json | head
curl -fsS "https://<YOUR_DOMAIN>/api/v1/ai/chat/history?course_id=<COURSE>&student_id=<STUDENT>&limit=1" | head
curl -fsS -X POST "https://<YOUR_DOMAIN>/api/v1/dashboard/analytics/<COURSE>/sync" | head
```

**If the app is hosted under a subpath**
If your deployment serves the app under `/lms`, verify these as well:
```bash
curl -fsS https://<YOUR_DOMAIN>/lms/api/v1/openapi.json | head
```

### Project Structure
-   `/backend`: FastAPI application, RAG logic, and Vector Store management.
-   `/frontend`: React application with Chat Interface and Teacher Dashboard.
-   `/docker-compose.yml`: Orchestration for full-stack deployment.

### Capstone Defense Notes
For detailed architectural decisions, pedagogical justifications, and future work, please refer to `CAPSTONE_DEFENSE.md`.
