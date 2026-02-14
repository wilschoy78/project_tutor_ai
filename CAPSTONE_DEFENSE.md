# Capstone Defense: Teacher-Tutor Generative AI

## 1. Problem Statement & Motivation
Traditional Learning Management Systems (LMS) like Moodle serve as static repositories of information. They lack the interactivity required to support **Personalized Learning**—a pedagogical approach that tailors instruction to students' needs, skills, and interests.

**The Gap**: Teachers cannot physically provide 1-on-1 tutoring to every student 24/7.
**The Solution**: An AI-powered Tutor that acts as a force multiplier for educators, grounded specifically in the teacher's curated curriculum.

## 2. Technical Architecture & Design Decisions

### 2.1 Why Retrieval-Augmented Generation (RAG)?
We chose RAG over fine-tuning for three reasons:
1.  **Accuracy**: RAG reduces hallucinations by grounding answers in retrieved documents.
2.  **Currency**: Course content changes frequently. Updating a vector database is instant, whereas fine-tuning a model is computationally expensive and slow.
3.  **Traceability**: Every AI response cites its source (e.g., "Week 1 Lecture Notes"), crucial for academic integrity.

### 2.2 Privacy-First Approach (Local LLMs)
By using **Ollama** and local open-source models (Mistral/Llama3):
-   **Data Sovereignty**: Student data and course materials never leave the school's infrastructure.
-   **Cost Efficiency**: Eliminates per-token costs associated with proprietary APIs like OpenAI.
-   **FERPA Compliance**: Minimizes third-party data exposure risks.

### 2.3 Personalized Learning Engine
The system implements a "Student Context" layer that intercepts user queries.
-   **Before**: User asks "Explain Neural Networks".
-   **After**: System retrieves Student Profile (Visual Learner, Weak in Math) -> Injects System Prompt: *"Explain Neural Networks using visual analogies and minimize complex calculus."*

## 3. Implementation Details

### Core Components
-   **Vector Store (ChromaDB)**: Stores semantic embeddings of Moodle content.
-   **Orchestrator (LangChain)**: Manages the retrieval-generation chain and prompt templating.
-   **Feedback Loop**: Quiz results are fed back into the Student Profile to update "Strengths/Weaknesses" dynamically.

### Key Algorithms
1.  **Semantic Search**: Uses cosine similarity to find relevant course modules.
2.  **Context Injection**: Dynamically constructs prompts at runtime based on the active user session.

## 4. Pedagogical Alignment
The system supports **Bloom's Taxonomy**:
1.  **Remember/Understand**: AI answers factual questions from course text.
2.  **Apply/Analyze**: The "Pop Quiz" feature forces active recall and application of concepts.
3.  **Evaluate**: Immediate feedback on quizzes helps students self-assess their mastery.

## 5. Security & Deployment
-   **Containerization**: Docker ensures the application runs consistently across development and production environments.
-   **Input Validation**: Pydantic models in FastAPI prevent injection attacks.
-   **Role-Based Access**: Teacher Dashboard is separated from the Student Chat interface (demonstrated via view toggle).

## 6. Limitations & Future Work
-   **Multi-modal Support**: Currently text-only; future versions could ingest diagrams and lecture videos.
-   **Reinforcement Learning**: Implementing explicit "Thumbs Up/Down" feedback to fine-tune the retrieval ranking.
-   **LTI Integration**: Fully integrating as a native LTI 1.3 tool within Moodle for seamless authentication.
