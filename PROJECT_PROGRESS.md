# Project Progress Log (Root Cause → Fix Idea Updates)

Capstone: **Teacher‑Tutor Generative AI using LangChain: An Open‑source Approach to Personalized Learning**  
Owner: Wilson A. Gayo  
Last updated: 2026‑04‑06

This document tracks usability / demo‑readiness gaps discovered during Moodle block embedding and cross‑role testing, along with the implemented fixes. Each entry is framed as **Root cause → Fix idea → Implementation** so the work is academically defensible and easy to present.

## Summary (What’s Improved)

- Teacher can validate student experience via **Preview student view** for quiz candidates (no grading side effects).
- Teacher and student views now provide **clear context**: role badges, course identity, and workflow notes.
- Knowledge Base (“KB”) modal now supports **scanability and documentation**: filters, search, coverage chips, Qbank counts, CSV export.
- Moodle navigation improved: **Back to Moodle**, **Full screen** as primary action in embedded mode.
- Safe linking to Moodle activities implemented using **permission-aware redirects** and **public Moodle URL mapping**.
- Sync flows now resist repeated clicks and show progress consistently.
- Backend startup stabilized when embeddings cannot download (offline/limited network scenarios).

## Change Log (Root Cause → Fix Idea → Implementation)

### UI/UX — Header & Help Clarity

1) **Root cause:** Users don’t know what header buttons do  
**Fix idea:** Add a “?” help icon that toggles the existing help panel  
**Implementation:** Added Help icon to teacher header action cluster.  
Files:
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

2) **Root cause:** Teacher needs clarity for demo: “what Moodle activity types are included?”  
**Fix idea:** Add tooltip listing included activity types  
**Implementation:** Expanded “Refresh Content” tooltip to list Page/URL/Assignment/Quiz/Forum (titles/provenance).  
Files:
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

3) **Root cause:** Moodle offers multiple placement contexts (block, link, embedded page)  
**Fix idea:** Add placement tips inside “help” (teacher + student)  
**Implementation:** Added “Moodle placement tips” collapsible sections in both views’ help areas.  
Files:
- [ChatInterface.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/ChatInterface.tsx)
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

4) **Root cause:** Users compare teacher vs student experiences and get confused  
**Fix idea:** Add role badge + short role-based explanation  
**Implementation:** Role badges embedded inside each view’s header (no global banner to avoid Moodle layout issues).  
Files:
- [ChatInterface.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/ChatInterface.tsx)
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

### UI/UX — Course Context (Names over IDs)

5) **Root cause:** IDs are less meaningful than names (demo needs “IT321 …”)  
**Fix idea:** Show full course name + ID where relevant  
**Implementation:**
- KB modal header now shows `shortname — fullname (ID: X)`.
- Teacher header course badge now shows full name + ID.
- Student header badge now shows full name + ID and student ID.
- Student view now fetches courses even when embedded so it can resolve names.  
Files:
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)
- [ChatInterface.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/ChatInterface.tsx)

6) **Root cause:** Teacher may manage multiple courses  
**Fix idea:** Show course dropdown label with full course name  
**Implementation:** Dropdown now has a label above it showing the active course full name + ID.  
Files:
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

### Teacher ↔ Student Workflow Visibility

7) **Root cause:** Teacher wants to validate student experience  
**Fix idea:** Add “Preview student view” link for quiz candidates  
**Implementation:**
- Added preview link per quiz candidate (opens Student view in new tab).
- Added student selector (“Preview as …”).
- Student view can accept a preview quiz payload via URL and renders it in preview mode (no saving).  
Files:
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)
- [ChatInterface.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/ChatInterface.tsx)

8) **Root cause:** Students conflate teacher review with grading  
**Fix idea:** Clarify quiz approval is practice (unless graded integration exists)  
**Implementation:** Added student-facing note under “Start here”.  
Files:
- [ChatInterface.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/ChatInterface.tsx)

9) **Root cause:** Workflow visibility gap between roles  
**Fix idea:** Add teacher note that approved quizzes appear in Student Pop Quiz  
**Implementation:** Added distinct amber “Teacher note” callout in Pending Quizzes section.  
Files:
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

### Knowledge Base (KB) — Scanability, Coverage, and Exports

10) **Root cause:** Long lists reduce scanability  
**Fix idea:** Add filters + search box in KB sources table  
**Implementation:** Added type chips + search input + “showing X/Y” count; filtering applies to table and CSV export.  
Files:
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

11) **Root cause:** Teacher wants quick coverage assessment  
**Fix idea:** Add summary chips (Forum/Page/Quiz/Qbank/URL/Assignment)  
**Implementation:** Added totals chips at top of KB sources section.  
Files:
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

12) **Root cause:** Metadata formatting inconsistent  
**Fix idea:** Normalize capitalization in KB types  
**Implementation:** Backend normalizes type labels to Forum/Page/Quiz/Qbank/URL/Assignment.  
Files:
- [rag_service.py](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/backend/app/services/rag_service.py)

13) **Root cause:** Teacher needs quick confirmation for Question Bank ingestion  
**Fix idea:** Add Qbank row/chunk count in summary  
**Implementation:**
- Teacher header KB coverage line includes Qbank chunk count.
- KB modal summary includes a Qbank chunk count stat.  
Files:
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

14) **Root cause:** Teacher wants documentation outputs  
**Fix idea:** Add “Download CSV” for KB summary  
**Implementation:** Added CSV export of currently filtered KB sources (includes course + section metadata).  
Files:
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

### Moodle Navigation & Safe Linking (Verification + Demo)

15) **Root cause:** Context switch from iframe to new tab disorients users  
**Fix idea:** Add “Back to Moodle” link and remember course URL  
**Implementation:** Captures `document.referrer` per course and stores in `localStorage`; shows Back to Moodle button with `target="_top"`.  
Files:
- [ChatInterface.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/ChatInterface.tsx)
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

16) **Root cause:** Verification requires navigation to original Moodle resources  
**Fix idea:** Add safe links to Moodle activities with permission checks  
**Implementation:**
- Backend endpoint `GET /moodle/activity-link?course_id=&cmid=` verifies activity exists via Moodle Web Services and only redirects to allowed Moodle hostnames.
- Added `MOODLE_PUBLIC_URL` so redirects open the browser-accessible Moodle domain (e.g., `http://localhost:8080`) while Moodle WS can stay internal (`http://moodle:80`).  
Files:
- [moodle.py](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/backend/app/api/endpoints/moodle.py)
- [config.py](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/backend/app/core/config.py)
- [docker-compose.yml](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/docker-compose.yml)
- [ChatInterface.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/ChatInterface.tsx)
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

17) **Root cause:** Users need navigational metadata (Week/Section)  
**Fix idea:** Include section/week metadata in each source item  
**Implementation:** Student sources show a section pill; Teacher KB table shows section under the activity title.  
Files:
- [ChatInterface.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/ChatInterface.tsx)
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

### Embedded Responsiveness (Moodle Block Constraints)

18) **Root cause:** Responsive layout constraints in Moodle block  
**Fix idea:** Optimize mobile spacing and allow full-screen as primary action  
**Implementation:**
- Added Full screen button (opens in new tab) when embedded/small screen.
- Teacher header actions now split into two rows for clarity (nav row vs actions row).
- Student action buttons become a horizontal scroll row to reduce wrapping.  
Files:
- [ChatInterface.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/ChatInterface.tsx)
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

19) **Root cause:** Excess header content pushes core actions below the fold (embedded)  
**Fix idea:** Auto-collapse long notes; auto-dismiss transient prompts  
**Implementation:**
- Student “Start here” collapses by default; teacher analytics prompt auto-dismisses in 5 seconds.
- Teacher “Teacher mode enabled” and “Analytics notes” are collapsible and default to collapsed when embedded.  
Files:
- [ChatInterface.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/ChatInterface.tsx)
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

### Analytics & Sync Robustness

20) **Root cause:** Repeated clicks cause uncertainty  
**Fix idea:** Disable button during sync and show progress  
**Implementation:** Sync handlers now early-return if already syncing, and buttons show `Syncing… XX%`.  
Files:
- [ChatInterface.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/ChatInterface.tsx)
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

21) **Root cause:** After hard refresh, analytics sync fails (502)  
**Fix idea:** Prevent backend from crashing when embeddings aren’t downloadable  
**Implementation:** Added embedding fallbacks: FastEmbed → Ollama → HashEmbeddings (offline-safe).  
Files:
- [rag_service.py](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/backend/app/services/rag_service.py)

### Pending Quizzes — List Management

22) **Root cause:** Long lists reduce scanability / hard to manage candidates  
**Fix idea:** Add filters and sort controls in Pending Quizzes  
**Implementation:** Topic filter + sort dropdown + “showing X/Y” count.  
Files:
- [TeacherDashboard.tsx](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/frontend/src/components/TeacherDashboard.tsx)

## Configuration Notes (Demo-Ready)

- `MOODLE_URL` is the internal Moodle base used by the backend container (e.g., `http://moodle:80`).
- `MOODLE_PUBLIC_URL` is the browser-accessible Moodle base used for redirect links (e.g., `http://localhost:8080`).
  - Set in [docker-compose.yml](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/docker-compose.yml).

## Quick Demo Script (Recommended)

1. Teacher: **Refresh Content** (rebuild KB from Moodle).  
2. Student: **Sync My Progress** (pull completion + quiz progress).  
3. Teacher: **Sync Class Analytics** (refresh dashboard metrics).  
4. Teacher: **Pending Quizzes → Approve** and use **Preview student view** to show “teacher review → student practice” workflow.  
5. Teacher: **View Knowledge Base → Filters/Search → Open in Moodle → Download CSV** (documentation + verification).

