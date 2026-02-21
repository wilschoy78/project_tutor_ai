# Project Implementation Progress – Incremental Update

**Student:** Wilson A. Gayo  
**Project:** Teacher-Tutor Generative AI using LangChain: An Open-source Approach to Personalized Learning  
**Previous Report Date:** 2026‑02‑07  
**This Update Date:** 2026‑02‑21  

---

## 1. Executive Summary (Incremental Update)

Since the previous progress report dated **2026‑02‑07**, work has focused on deepening the **personalization logic**, enhancing **teacher control** over AI recommendations, and stabilizing the **deployment/runtime environment** for the AI backend.

The core idea of this increment is to move from “generic analytics + AI plan” to a **tightly coupled loop** where:

- Moodle quiz analytics → drive topic‑level weakness detection,  
- The AI generates a structured learning path grounded in those metrics, and  
- Teachers can **override, pin, and add** their own recommendations, which are then persisted and surfaced alongside the AI’s output.

These changes make the system more pedagogically defensible: the AI is no longer just suggesting content, but doing so in a way that is **transparent, auditable, and teacher‑controlled**.

---

## 2. Highlights Since Last Report

- Refined **learning path generation** to use topic‑level averages and severity (high/medium) derived from Moodle and AI quizzes.
- Enhanced the **Teacher Dashboard** learning path modal to display:
  - Identified weaknesses,
  - Performance by topic (with averaged scores and quiz breakdown),
  - AI “Next Steps” grounded in analytics.
- Introduced **teacher overrides**:
  - Teachers can pin specific AI recommendations.
  - Teachers can author custom recommendations.
  - Pinned items are persisted per `(course, student)` and are returned through the backend API.
- Stabilized the **AI backend container**:
  - Fixed startup errors (e.g., missing type imports).
  - Addressed Docker build/cache issues and verified a clean build pipeline.

---

## 3. Phase 2 – AI Application Development: New Progress

### 3.1 Learning Path Generation Refinement

Previously, the learning path logic classified weaknesses simply by checking if any quiz score was below a fixed threshold. This has now been upgraded to a more robust analytics‑driven pipeline:

- **Topic Aggregation:**
  - All quiz scores (Moodle quizzes + AI pop quizzes) are grouped by **topic**.
  - Quiz names are normalized (e.g., stripping `[AI]` prefixes and quiz/test suffixes) so multiple assessments on the same topic are analyzed together.

- **Topic‑Level Metrics:**
  - For each topic, the system computes:
    - **Average score** across all quizzes for that topic.
    - **Severity** level:
      - `high` if average < 50%,
      - `medium` if 50–74%.
  - Only topics below 75% are treated as “weaknesses”.

- **Focused Remediation:**
  - Weak topics are sorted by average score (weakest first).
  - The system selects up to the **top three** weakest topics to drive the learning path.
  - For these topics, the backend passes a detailed structure to the LLM:
    - Topic name
    - Average score
    - Severity
    - List of contributing quizzes and their scores

- **LLM Prompt Enrichment:**
  - The study plan prompt now explicitly includes “Performance details” and a list of weak topics with their scores.
  - The LLM is asked to produce a **3‑step study plan** that references these weaknesses and the retrieved course materials.

**Educational impact:** This makes learning paths directly traceable to quantitative performance data and specific Moodle quizzes, improving transparency and supporting evidence‑based remediation.

---

### 3.2 Teacher Dashboard – Learning Path Modal Enhancements

The React‑based Teacher Dashboard has been upgraded to better communicate analytics and learning paths to instructors:

- **Identified Weaknesses:**
  - A chip list shows the names of topics identified as weak (e.g., “Topic 1”, “Pop Quiz”).
  - These are generated from the aggregated quiz analytics described above.

- **Performance by Topic Panel:**
  - A new section presents:
    - Topic name
    - Average score (e.g., `40%`, `0%`)
    - Severity label (e.g., **High Priority**, **Medium Priority**)
    - A compact list of contributing quizzes and their scores (e.g., `Topic 1 Quiz 1: 40%`, `[AI] Quiz: Pop Quiz (…): 0%`)
  - This gives teachers a quick, topic‑level diagnostic view before reading the full plan.

- **Study Plan + Next Steps:**
  - The existing sections are now more meaningful because they can be interpreted in context of:
    - Which topics are weak,
    - How severe the weakness is,
    - Which quizzes produced the data.

**Educational impact:** Teachers gain a clear diagnostic view, not just a black‑box AI recommendation. This supports better assessment of whether the AI’s proposed plan is reasonable.

---

### 3.3 Teacher Override and Pinned Recommendations

To align with the goal of **teacher collaboration** and **human‑in‑the‑loop control**, a new override mechanism has been implemented end‑to‑end.

**Backend:**

- A new JSON‑backed store, `learning_path_overrides.json`, has been introduced to persist overrides:
  - Keyed by student and course (`student_id`, `course_id`).
  - Stores an array of `pinned_recommendations` (teacher‑approved guidance).

- New service methods:
  - `get_learning_path_overrides(student_id, course_id)`  
    Returns `{ "pinned_recommendations": [...] }` or an empty list.
  - `set_learning_path_overrides(student_id, course_id, pinned_recommendations)`  
    Validates and persists an updated list for that (course, student).

- New REST endpoints:
  - `GET /api/v1/dashboard/students/{student_id}/learning-path-overrides?course_id=...`
  - `POST /api/v1/dashboard/students/{student_id}/learning-path-overrides`  
    Payload: `{ "course_id": <int>, "pinned_recommendations": [<string>, ...] }`

- Learning path endpoint enrichment:
  - `POST /api/v1/ai/learning-path` now returns:
    - LLM‑generated `status`, `weaknesses`, `weakness_details`, `study_plan`, `recommendations`.
    - Plus, any teacher `pinned_recommendations` already stored for that student/course.

**Frontend (Teacher Dashboard):**

- In the **“Personalized Learning Path”** modal:
  - **Teacher Pinned Recommendations** section:
    - Displays all persisted pinned recommendations for the selected student and course.
  - **“Pin” button next to AI “Next Steps”**:
    - Teachers can promote any AI‑generated recommendation to a pinned recommendation.
    - This triggers an API call to persist the updated pinned list.
  - **Custom Recommendation Input**:
    - Text input + “Save” button allows teachers to author their own recommendations (e.g., “Schedule a 1:1 review on Topic 1 this week.”).
    - These are added to the pinned list and persisted via the same API.

**Educational impact:** This turns the AI from a “black box tutor” into a **collaborative assistant**. Teachers retain control over which suggestions are emphasized, can add their own domain‑specific interventions, and can present a curated path to students.

---

### 3.4 Backend Stability and Deployment Work

During this period, several low‑level issues with the AI backend container were identified and resolved:

- **Import/Type Issues:**
  - Fixed missing type imports (e.g., `Optional` from `typing`) that caused runtime exceptions and prevented the FastAPI app from starting in the Docker container.

- **Docker Cache / Build Issues:**
  - Encountered a BuildKit snapshot error related to stale layers.
  - Resolved by pruning build cache and rebuilding images, verifying a clean `docker compose up -d` flow.

- **Verification:**
  - Backend now builds and runs successfully in Docker, exposing the API on port 8000.
  - Frontend rebuild and lint checks pass after the new dashboard changes.

**Educational impact:** While low‑level, this work is crucial for demonstrating a stable deployment pipeline and reproducible environment, which is important for your capstone’s evaluation and for future hosting on platforms like Render/Fly.io.

---

## 4. Phase 3 – Moodle Plugin & Integration: Status in This Increment

No major structural changes to the Moodle plugins (`block_ai_tutor` and `local_ai_tutor`) were introduced in this specific incremental window. However, the backend and dashboard enhancements:

- Are **fully compatible** with the existing integration strategy:
  - Course and student context (`courseId`, `studentId`, `role`) are still passed via URL/query parameters from Moodle to the React app.
  - The enhanced learning path and teacher override features are available when the dashboard is embedded inside Moodle.

Next milestones for Phase 3 (partially planned, not fully implemented in this increment):

- Incorporating these new learning path and override features into:
  - Student‑facing views within Moodle (e.g., a “My Learning Path” page).
  - Teacher‑facing views embedded directly in the course context.

---

## 5. Suggested Screenshots for This Update

Below are placeholders you can use to capture the new functionality for your advisers.

> **[Screenshot Placeholder 8: Teacher Dashboard – Performance by Topic]**  
> Capture the updated “Teacher Dashboard” view with the **Student Performance** table, then open the learning path modal for a specific student showing:  
> - “Identified Weaknesses” chips  
> - “Performance by Topic” cards with average scores and severity labels.

> **[Screenshot Placeholder 9: Personalized Learning Path with Teacher Pinned Recommendations]**  
> Open the “View Plan” modal for a student and capture:  
> - The AI‑generated Study Plan section  
> - The “Teacher Pinned Recommendations” section with at least one pinned item visible  
> - The “Next Steps” section showing the “Pin” buttons.

> **[Screenshot Placeholder 10: Adding a Custom Teacher Recommendation]**  
> Show the bottom part of the learning path modal where the teacher can type a custom recommendation and click “Save”. Include the newly added recommendation appearing under “Teacher Pinned Recommendations”.

> **[Screenshot Placeholder 11: Backend Health Verification]**  
> Capture a terminal window showing `docker compose ps` with `ai-tutor-backend`, `ai-tutor-frontend`, `moodle`, and `moodle-db` all in “Up” status, to demonstrate a stable multi‑service environment.

---

## 6. Risks, Open Issues, and Next Steps

**Risks / Open Issues:**

- **Moodle build time:** Initial Moodle container builds are still slow due to cloning the full Moodle upstream repository. This is a one‑time cost but should be noted in deployment documentation.
- **Teacher–Student views parity:** The new teacher override logic is implemented in the teacher dashboard; student‑facing UIs reflecting these pinned recommendations are the next critical step for full end‑to‑end personalized learning.

**Next Steps (Planned):**

1. **Expose Pinned Learning Paths to Students:**
   - Add a student‑facing “My Learning Path” view that:
     - Displays AI recommendations,
     - Highlights teacher‑pinned items distinctly,
     - Optionally includes rationales based on quiz analytics.

2. **Integrate Learning Styles into Learning Path Generation:**
   - Combine quiz analytics (what the student struggles with) with their declared learning style (how they prefer to learn) when generating the study plan.
   - Example: For a “Visual” learner, increase emphasis on diagrams/videos in the recommendations.

3. **Document Teacher Override Workflow for Advisers and Teachers:**
   - Create short usage notes or a walkthrough:
     - How to open the dashboard,
     - How to interpret topic‑level analytics,
     - How to pin and add recommendations,
     - How these changes persist for each student.

4. **SSO and Security Hardening (Phase 3):**
   - Continue toward replacing simple URL parameter context passing with JWT‑based SSO between Moodle and the AI backend, as outlined in the original roadmap.

---

This incremental update demonstrates concrete progress in making the AI tutor **data‑driven, transparent, and teacher‑controlled**, directly aligned with the core goals of the capstone project.