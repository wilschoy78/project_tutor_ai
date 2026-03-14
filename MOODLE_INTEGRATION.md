# Moodle Integration Guide

This guide details how to integrate the **Teacher-Tutor AI** into a Moodle LMS instance using the included **Moodle Block Plugin** and **Moodle Web Services** (token-based).

## 1) Enable Moodle Web Services (Data + Grades)
The AI backend retrieves course lists, enrolled users, and grade items through Moodle’s REST Web Services API.

### Required Moodle-side setup
1.  Login to Moodle as an Administrator.
2.  Enable web services:
    - Site administration → Plugins → Web services → Overview
    - Enable REST protocol
3.  Create (or reuse) a Web Service token with access to at least:
    - `core_course_get_courses`
    - `core_enrol_get_enrolled_users`
    - `gradereport_user_get_grade_items`
    - `core_course_get_contents` (if ingesting content via API)

### Optional helper (dev/demo)
This repo includes a CLI helper script that can configure a service and print a token:
- [setup_services.php](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/moodle_plugin/block_ai_tutor/setup_services.php)

### Backend configuration
Set these in the backend environment:
- `MOODLE_URL` (example: `https://your-moodle-site/lms`)
- `MOODLE_TOKEN` (the token created above)
- `ENABLE_MOCK_MOODLE=False` (recommended for production)

## 2) Install the Moodle Block Plugin (Native UI Integration)
The block embeds the React app inside Moodle using an iframe and passes the minimal context (`courseId`, `studentId`, `role`) via query parameters.

### Installation (Moodle server)
1.  Copy the `moodle_plugin/block_ai_tutor` folder to your Moodle server's `/blocks/` directory.
2.  Login to Moodle as Administrator.
3.  Go to **Site administration** > **Notifications**. Moodle will detect the new plugin.
4.  Click **"Upgrade Moodle database now"**.

### Installation on https://bcccs.octanity.net/lms (Tested)
These steps apply to the production Moodle site hosted under `/lms`.

1.  Login to `https://bcccs.octanity.net/lms` as an Administrator.
2.  Install the block plugin on the Moodle server:
    - Server copy method (typical for VPS deployments):
      - Copy the repo folder `moodle_plugin/block_ai_tutor` into Moodle’s `blocks/` directory.
      - Ensure the directory name is `ai_tutor` under `blocks/` (Moodle expects the plugin at `blocks/ai_tutor`).
    - Plugin installer method (if enabled on the site):
      - Site administration → Plugins → Install plugins → Upload a ZIP that contains the `ai_tutor` folder.
3.  Complete the Moodle upgrade:
    - Site administration → Notifications → Upgrade Moodle database now.
4.  Configure the plugin to point to the deployed AI Tutor UI:
    - Site administration → Plugins → Blocks → AI Personal Tutor
    - Set **AI Tutor Application URL** to your deployed frontend base URL (example used during testing: `https://teacher-tutor-ai.onrender.com`)
    - Save changes.
5.  Add the block to a course:
    - Go to a course → Turn editing on → Add a block → AI Personal Tutor.
6.  Verification checklist:
    - The iframe loads the AI Tutor UI inside Moodle.
    - Student view shows Chat; Teacher view shows Dashboard (role-based switching).
    - API calls succeed (no `/api/v1` or `/lms/api/v1` 404s in browser devtools).

### Usage:
1.  Go to a Course.
2.  Turn **Editing On**.
3.  In the "Add a block" drawer, select **"AI Personal Tutor"**.
4.  The block will appear in the sidebar, embedding the Chat Interface directly next to the course content.

### Configuration:
The block is configured to point to `http://localhost` by default. To change this:
1.  Go to **Site administration** > **Plugins** > **Blocks** > **AI Personal Tutor**.
2.  Update the **AI Tutor URL** setting.

## 3) (Optional) Add a Course Navigation Link
If you also want a consistent navigation link inside each course, install `moodle_plugin/local_ai_tutor`.
- [local_ai_tutor/lib.php](file:///Users/wilson/Desktop/2025/MIT_CIT/2026/projects/moodle_plugin/local_ai_tutor/lib.php)

## Notes on Security and Demo Scope
- The current block passes context via query parameters for simplicity and demonstration. For a production-grade SSO flow, use signed JWT or LTI 1.3 launch and validate it server-side.
- The backend is designed to ground responses in course-specific content and return source attributions; verify this during the final demo (show the “sources” for an answer in the network response).
