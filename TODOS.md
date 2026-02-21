
02/21/2026

1. Expose Pinned Learning Paths to Students:

- Add a student‑facing “My Learning Path” view that:
  - Displays AI recommendations,
  - Highlights teacher‑pinned items distinctly,
  - Optionally includes rationales based on quiz analytics.

2. Integrate Learning Styles into Learning Path Generation:

- Combine quiz analytics (what the student struggles with) with their declared learning style (how they prefer to learn) when generating the study plan.
- Example: For a “Visual” learner, increase emphasis on diagrams/videos in the recommendations.

3. Document Teacher Override Workflow for Advisers and Teachers:

- Create short usage notes or a walkthrough:
  - How to open the dashboard,
  - How to interpret topic‑level analytics,
  - How to pin and add recommendations,
  - How these changes persist for each student.

4. SSO and Security Hardening (Phase 3):

- Continue toward replacing simple URL parameter context passing with JWT‑based SSO between Moodle and the AI backend, as outlined in the original roadmap.


02/19/2026

If you want to prioritize next steps before implementing chat history, my recommendation would be:

1. Replace placeholder student profile (learning styles, strengths/weaknesses) with something persisted.
2. Implement real completed_modules via Moodle’s completion API.
3. Introduce a minimal conversation table + endpoints to persist chat history per (course, student) .
Whenever you’re ready, I can design and implement any of these in the existing stack.