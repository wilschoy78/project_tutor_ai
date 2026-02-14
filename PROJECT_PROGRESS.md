# Project Implementation Progress: Teacher-Tutor Generative AI

**Student:** Wilson A. Gayo  
**Project:** Teacher-Tutor Generative AI using LangChain: An Open-source Approach to Personalized Learning  
**Date:** 2026-02-07

---

## Executive Summary
This document outlines the current implementation status of the "Teacher-Tutor Generative AI" capstone project. The development is divided into three distinct phases: (1) The Core Moodle LMS Environment, (2) The Generative AI Application, and (3) The Integration Plugin.

---

## Phase 1: Moodle LMS Implementation (Completed)
**Status:** ✅ Live / Production Ready  
**URL:** [https://bcccs.octanity.net/lms/](https://bcccs.octanity.net/lms/)

This phase established the foundational Learning Management System (LMS) required to host the educational content and student data that grounds the AI.

### Key Achievements
-   **Deployment:** Moodle LMS successfully hosted and accessible via public domain.
-   **Course Management:** Structure for courses (e.g., "Introduction to AI Tutor") created with modules, quizzes, and resources.
-   **User Administration:** Admin, Teacher, and Student roles configured.
-   **Data Structure:** Verified database schema for retrieving user enrollments and grades.

> **[Screenshot Placeholder 1: Moodle Landing Page]**  
> *Insert a screenshot of the `https://bcccs.octanity.net/lms/` homepage showing the active courses.*

> **[Screenshot Placeholder 2: Course Content View]**  
> *Insert a screenshot of a specific course page showing topics, quizzes, and resources.*

---

## Phase 2: AI Application Development (In Progress)
**Status:** 🔄 Active Development  
**Tech Stack:** Python (FastAPI), LangChain, ChromaDB, Ollama (Mistral), React (TypeScript)

This phase involves building the "Brain" of the system—a Retrieval-Augmented Generation (RAG) engine that provides personalized tutoring based *only* on the Moodle content from Phase 1.

### Key Achievements
1.  **RAG Architecture:**
    -   Implemented `RagService` to ingest course content from Moodle.
    -   Integrated **ChromaDB** for vector storage of course materials.
    -   **Quiz System:** Implemented "Pop Quiz" generation using LLM and persisted results to `ai_grades.json` for Teacher Dashboard analytics.
    -   **AI Models:** Switched to **Groq (Llama 3)** for fast inference while keeping **Ollama (Mistral)** for local embeddings.
    -   **Personalized Learning Paths:** Implemented logic to analyze student performance and generate custom study plans (Weaknesses, Recommended Modules, Step-by-Step Plan).
2.  **Teacher Dashboard:**
    -   Built a React-based dashboard for teachers to view course analytics.
    -   **Real-time Moodle Sync:** The dashboard now pulls live student data from Moodle via the Web Service API.
    -   **Role Filtering:** Implemented logic to strictly separate "Students" from "Staff" (Teachers/Admins) in analytics reports.
    -   **Detailed Student View:** Added a modal interface to view the specific "Personalized Learning Path" for each student directly from the dashboard.
3.  **Student Context Engine:**
    -   `StudentService` fetches enrolled user lists and activity logs.
    -   AI responses are tailored to the specific `courseId` and `studentId` passed from the frontend.

### Recent Technical Updates
-   **API Hardening:** Fixed `string indices` errors by properly handling Moodle API exceptions.
-   **Role Logic:** Added filtering to exclude `editingteacher` and `manager` roles from student performance lists.

> **[Screenshot Placeholder 3: Teacher Dashboard - Student Analytics]**  
> *Insert a screenshot of the React Dashboard showing the "Total Students", "Class Average", and the filtered list of students (Alice, Bob, etc.).*

> **[Screenshot Placeholder 7: Personalized Learning Path Modal]**  
> *Insert a screenshot of the "View Plan" modal showing the identified weaknesses and the AI-generated study plan.*

> **[Screenshot Placeholder 4: Chat Interface]**  
> *Insert a screenshot of the AI Chat interface where the model answers a question based on course content.*

---

## Phase 3: Moodle Plugin Development (In Progress)
**Status:** 🔄 Active Development  
**Component:** `block_ai_tutor` (Custom PHP Block)

This phase bridges Phase 1 and Phase 2, embedding the AI capabilities directly into the Moodle interface to ensure a seamless user experience.

### Key Achievements
1.  **Block Integration:**
    -   Created a custom block plugin (`block_ai_tutor`) that appears in the Moodle course sidebar.
    -   **IFrame Embedding:** Securely embeds the React frontend within Moodle.
    -   **Context Propagation:** Automatically passes `?courseId=X&studentId=Y&role=Z` to the AI app so it knows who is asking and what view to show.
2.  **Navigation & UI Integration:**
    -   **Local Plugin (`local_ai_tutor`):** Implemented a dedicated navigation helper to inject "AI Personal Tutor" into the global course "More" menu.
    -   **Role-Based Views:**
        -   **Teachers:** Automatically redirected to the Dashboard Analytics view with the course selection locked.
        -   **Students:** Automatically redirected to the Chat Interface with the student identity locked.
3.  **Web Services Configuration:**
    -   Developed `setup_services.php` to automate the creation of the `AI Tutor Service` and API tokens.
    -   Enabled specific permissions: `core_course_get_contents`, `core_enrol_get_enrolled_users`, etc.
4.  **User Experience (UX):**
    -   **Full-Screen Mode:** Added a "Open in Full Screen" feature that launches the AI Tutor in a dedicated, responsive view (`view.php`) for distraction-free learning.
    -   **Context Locking:** Removed manual dropdowns in the frontend when accessed via Moodle to prevent users from switching identities or courses.

> **[Screenshot Placeholder 5: AI Tutor Block in Sidebar]**  
> *Insert a screenshot of a Moodle Course page showing the "AI Tutor" block in the right-hand drawer.*

> **[Screenshot Placeholder 6: Full-Screen AI View]**  
> *Insert a screenshot of the `view.php` page showing the AI interface taking up the main window area.*
> *Note: Show both the Student view (Chat) and Teacher view (Dashboard) to demonstrate role-based switching.*

---

## Deployment & Synchronization Strategy
**Goal:** Deploy the AI Backend to the cloud and connect it to the production Moodle instance (`bcccs.octanity.net`).

### 1. Connection Architecture
The AI Backend connects to Moodle via the standard **Moodle Web Services API**. This means it works with *any* Moodle installation (Local or Cloud) without complex database migration.
-   **Configuration:** The backend only needs the `MOODLE_URL` and `MOODLE_TOKEN` environment variables to switch from "Local/Mock" to "Production".

### 2. Data Synchronization Plan
-   **User & Grade Data:** 
    -   **Sync Type:** Real-time (Zero-Copy).
    -   **Mechanism:** When a teacher opens the Dashboard, the backend instantly fetches the *live* list of students and grades from Moodle. No manual sync is required.
    -   **Implementation:** `StudentService` calls `core_enrol_get_enrolled_users` on-demand.
-   **Course Content (RAG):**
    -   **Sync Type:** On-Demand Ingestion.
    -   **Mechanism:** Course materials (PDFs, Pages, Quizzes) must be "ingested" into the AI's Vector Database (ChromaDB) to be searchable.
    -   **Action:** Teachers click "Refresh Content" (or admin triggers API) to pull the latest Moodle content into the AI brain.
    -   **Status:** The backend now exposes `GET /moodle/courses` to dynamically list all available courses from the live Moodle site, making setup seamless.

### 3. Deployment Steps
1.  **Moodle Side:** Enable Web Services and generate a Token for the AI Service.
2.  **Backend Side:** Deploy Docker container with `MOODLE_URL=https://bcccs.octanity.net` and the new Token.
3.  **Frontend Side:** The UI now automatically fetches the list of courses from the backend, so the dropdowns will instantly populate with the real courses from `bcccs.octanity.net`.

---

## Next Steps
-   **Phase 3:** Finalize Single Sign-On (SSO) security using JWT to replace simple URL parameter passing.
-   **Phase 3:** Polish the Block UI to better handle responsive heights (Done).
