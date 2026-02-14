<?php
defined('MOODLE_INTERNAL') || die();

// Development stubs to silence linter errors when outside Moodle
if (file_exists(__DIR__ . '/stubs.php') && !defined('PARAM_TEXT')) {
    require_once(__DIR__ . '/stubs.php');
}

if ($ADMIN->fulltree) {
    $settings->add(new admin_setting_configtext(
        'block_ai_tutor/url',
        get_string('url', 'block_ai_tutor'),
        get_string('url_desc', 'block_ai_tutor'),
        'http://localhost',
        PARAM_URL
    ));

    $settings->add(new admin_setting_configtext(
        'block_ai_tutor/default_height',
        get_string('default_height', 'block_ai_tutor'),
        get_string('default_height_desc', 'block_ai_tutor'),
        '70vh',
        PARAM_TEXT
    ));
}
