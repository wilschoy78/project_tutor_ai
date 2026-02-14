<?php

require_once('../../config.php');

// Development stubs to silence linter errors when outside Moodle
if (file_exists(__DIR__ . '/stubs.php') && !function_exists('has_capability')) {
    require_once(__DIR__ . '/stubs.php');
}

global $DB, $OUTPUT, $PAGE, $USER;

// Get the course ID from the URL parameter
$courseid = required_param('courseid', PARAM_INT);

// Get the course record or throw an error if not found
$course = $DB->get_record('course', array('id' => $courseid), '*', MUST_EXIST);

// Ensure the user is logged in and has access to this course
require_login($course);

// Set up the page context and URL
$context = context_course::instance($courseid);
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/blocks/ai_tutor/view.php', array('courseid' => $courseid)));
$PAGE->set_title(get_string('pluginname', 'block_ai_tutor'));
$PAGE->set_heading($course->fullname);
$PAGE->set_pagelayout('incourse'); // Use standard course layout

// Output the page header
echo $OUTPUT->header();

// --- Content Start ---

// Get configured AI Tutor URL
$ai_url = get_config('block_ai_tutor', 'url');
if (empty($ai_url)) {
    $ai_url = 'http://localhost';
}

// Prepare parameters for the React app
$user_id = $USER->id;

// Determine user role
$is_teacher = has_capability('moodle/course:update', $context);
$role = $is_teacher ? 'teacher' : 'student';

$full_url = "$ai_url?courseId=$courseid&studentId=$user_id&role=$role";

echo '<div class="ai-tutor-full-view">';
echo '<h2>' . get_string('pluginname', 'block_ai_tutor') . '</h2>';

// Render the iframe with responsive height
echo '
    <div class="ai-tutor-container" style="height: 80vh; width: 100%; margin-top: 20px;">
        <iframe src="' . $full_url . '" 
                style="width: 100%; height: 100%; border: 1px solid #ddd; border-radius: 8px;"
                allow="microphone; camera; display-capture">
        </iframe>
    </div>
';

echo '</div>';

// --- Content End ---

echo $OUTPUT->footer();
