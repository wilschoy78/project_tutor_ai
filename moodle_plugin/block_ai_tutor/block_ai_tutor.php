<?php

// Development stubs to silence linter errors when outside Moodle
if (file_exists(__DIR__ . '/stubs.php') && !function_exists('has_capability')) {
    require_once(__DIR__ . '/stubs.php');
}

class block_ai_tutor extends block_base {
    public function init() {
        $this->title = get_string('pluginname', 'block_ai_tutor');
    }

    public function get_content() {
        if ($this->content !== null) {
            return $this->content;
        }

        global $COURSE, $USER;

        $this->content = new stdClass;
        
        // Get configured URL or default to localhost
        $ai_url = get_config('block_ai_tutor', 'url');
        if (empty($ai_url)) {
            $ai_url = 'http://localhost';
        }

        // Get configured height or default to 70vh
        $block_height = get_config('block_ai_tutor', 'default_height');
        if (empty($block_height)) {
            $block_height = '70vh';
        }

        // Pass context via query params (In production, use JWT/LTI for security)
        $course_id = $COURSE->id;
        $user_id = $USER->id;
        
        // Determine user role (simplistic check for capability)
        $is_teacher = has_capability('moodle/course:update', context_course::instance($course_id));
        $role = $is_teacher ? 'teacher' : 'student';
        
        $full_url = "$ai_url?courseId=$course_id&studentId=$user_id&role=$role";
        
        // Create URL for the full-page view inside Moodle
        $view_url = new moodle_url('/blocks/ai_tutor/view.php', array('courseid' => $course_id));

        // Render IFrame with responsive height and resize capability
        $this->content->text = '
            <div class="ai-tutor-container" style="
                height: ' . $block_height . '; 
                min-height: 500px; 
                max-height: 900px; 
                width: 100%; 
                resize: vertical; 
                overflow: hidden; 
                border: 1px solid #ddd; 
                border-radius: 8px;
                background: #f8f9fa;">
                <iframe src="' . $full_url . '" 
                        style="width: 100%; height: 100%; border: none;"
                        allow="microphone; clipboard-read; clipboard-write">
                </iframe>
            </div>
            <div class="ai-tutor-footer" style="text-align: center; font-size: 0.8em; margin-top: 5px;">
                <a href="' . $view_url . '" target="_blank" class="btn btn-link">' . get_string('open_new_window', 'block_ai_tutor') . '</a>
            </div>
        ';

        return $this->content;
    }

    public function has_config() {
        return true;
    }

    public function applicable_formats() {
        return array(
            'all' => true,
            'course-view' => true, 
            'mod' => true, 
        );
    }
}
