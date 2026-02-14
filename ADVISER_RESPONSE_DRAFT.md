# Summary Response to Adviser

**Subject:** Re: Project Scope - Teacher-Tutor Generative AI (Masters in Information Technology)

Dear [Adviser Name],

This project is for my **Master's in Information Technology (MIT)**. Below is the summary you requested:

### 1. Literature Review: Existing Solutions
Current Moodle AI plugins (e.g., *OpenAI Chat Block*, *Raison*) primarily function as generic chatbots or teacher productivity tools (generating quizzes). They rely heavily on paid, external APIs like OpenAI and lack deep integration with the specific course curriculum, often leading to generic answers or "hallucinations" not found in the lecture notes.

### 2. Features I Will Implement
My project builds a dedicated **Retrieval-Augmented Generation (RAG)** engine that integrates deeply with Moodle:
*   **Curriculum-Grounded Tutoring:** The AI answers student questions *strictly* using uploaded course documents (PDFs, PPTs), citing sources.
*   **Adaptive Learning Paths:** It analyzes student **Moodle Quiz grades** to automatically identify weak topics and recommend specific reading materials.
*   **Teacher Dashboard:** A real-time view for teachers to see what students are asking and where they are struggling.

### 3. How It Differs
| Feature | Existing Plugins | My Solution |
| :--- | :--- | :--- |
| **Knowledge Source** | General Internet (ChatGPT) | **Course Specific** (Teacher's Files) |
| **Personalization** | None / Generic | **Grade-Aware** (Adapts to student performance) |
| **Privacy & Cost** | Paid APIs / Data sent externally | **Open Source & Local** (Self-hosted, Free, Private) |

Basically, while others are "tools for teachers," my project is a **"private tutor for students"** that knows the syllabus and adapts to their grades.

Best regards,

Wilson A. Gayo
