# Moodle Integration Guide

This guide details how to integrate the **Teacher-Tutor AI** into a Moodle LMS instance. We provide two methods: a standard **LTI (External Tool)** configuration and a custom **Moodle Block Plugin**.

## Method 1: LTI External Tool (Recommended for Production)
The simplest way to "seamlessly integrate" without custom code on the Moodle server is using the LTI (Learning Tools Interoperability) standard.

### Steps:
1.  **Deploy the AI Tutor**: Ensure the Docker container is running and accessible (e.g., `http://your-server-ip`).
2.  **Login to Moodle** as Administrator.
3.  Navigate to **Site administration** > **Plugins** > **Activity modules** > **External tool** > **Manage tools**.
4.  Click **"configure a tool manually"**.
5.  **Tool Settings**:
    *   **Tool Name**: AI Personal Tutor
    *   **Tool URL**: `http://your-server-ip` (The URL of the Frontend)
    *   **LTI Version**: LTI 1.3 (Recommended) or 1.1
    *   **Public Key**: (If implementing LTI 1.3 auth flow in backend)
6.  **Save changes**.
7.  **Add to Course**: Go to any course, turn editing on, add an activity, select **"External Tool"**, and choose "AI Personal Tutor".

## Method 2: Custom Moodle Block Plugin (Native Integration)
For a more integrated experience where the AI Tutor lives in the sidebar of every course, use our custom PHP block.

### Installation:
1.  Copy the `moodle_plugin/block_ai_tutor` folder to your Moodle server's `/blocks/` directory.
2.  Login to Moodle as Administrator.
3.  Go to **Site administration** > **Notifications**. Moodle will detect the new plugin.
4.  Click **"Upgrade Moodle database now"**.

### Usage:
1.  Go to a Course.
2.  Turn **Editing On**.
3.  In the "Add a block" drawer, select **"AI Personal Tutor"**.
4.  The block will appear in the sidebar, embedding the Chat Interface directly next to the course content.

### Configuration:
The block is configured to point to `http://localhost:80` by default. To change this:
1.  Go to **Site administration** > **Plugins** > **Blocks** > **AI Personal Tutor**.
2.  Update the **AI Tutor URL** setting.
