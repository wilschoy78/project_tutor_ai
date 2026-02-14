<?php
define('CLI_SCRIPT', true);

// Adjust path if needed to find config.php
// Since this file is in blocks/ai_tutor/, config is ../../config.php
require_once(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/clilib.php');
require_once($CFG->dirroot . '/webservice/lib.php');

// 1. Enable Web Services
set_config('enablewebservices', 1);
set_config('webserviceprotocols', 'rest');

mtrace("Web services enabled.");

// 2. Create Service
$service_name = 'AI Tutor Service';
$service_shortname = 'ai_tutor_service';

$service = $DB->get_record('external_services', ['shortname' => $service_shortname]);
if (!$service) {
    $service = new stdClass();
    $service->name = $service_name;
    $service->shortname = $service_shortname;
    $service->enabled = 1;
    $service->restrictedusers = 0; // Available to all users with permission
    $service->component = 'moodle';
    $service->timecreated = time();
    $service->timemodified = time();
    $service->id = $DB->insert_record('external_services', $service);
    mtrace("Service '$service_name' created.");
} else {
    mtrace("Service '$service_name' already exists.");
}

// 3. Add Functions to Service
$functions = [
    'core_webservice_get_site_info',
    'core_course_get_courses',
    'core_course_get_contents',
    'core_user_get_users',
    'core_enrol_get_enrolled_users',
    'gradereport_user_get_grade_items',
    'mod_quiz_get_user_attempts'
];

foreach ($functions as $fname) {
    $f = $DB->get_record('external_functions', ['name' => $fname]);
    if ($f) {
        if (!$DB->record_exists('external_services_functions', ['externalserviceid' => $service->id, 'functionname' => $fname])) {
            $sf = new stdClass();
            $sf->externalserviceid = $service->id;
            $sf->functionname = $fname;
            $DB->insert_record('external_services_functions', $sf);
            mtrace("Added function $fname.");
        }
    } else {
        mtrace("Warning: Function $fname does not exist.");
    }
}

// 4. Create Token for Admin
$user = $DB->get_record('user', ['username' => 'admin']);
if (!$user) {
    mtrace("Error: Admin user not found.");
    exit(1);
}

$token_record = $DB->get_record('external_tokens', [
    'userid' => $user->id,
    'externalserviceid' => $service->id,
    'tokentype' => EXTERNAL_TOKEN_PERMANENT
]);

if (!$token_record) {
    $token = md5(uniqid(rand(), true));
    $token_record = new stdClass();
    $token_record->token = $token;
    $token_record->tokentype = EXTERNAL_TOKEN_PERMANENT;
    $token_record->userid = $user->id;
    $token_record->externalserviceid = $service->id;
    $token_record->contextid = 1; // System context
    $token_record->creatorid = $user->id;
    $token_record->timecreated = time();
    $token_record->timemodified = time();
    $DB->insert_record('external_tokens', $token_record);
    mtrace("Created new token.");
} else {
    $token = $token_record->token;
    mtrace("Retrieved existing token.");
}

mtrace("\n=== MOODLE TOKEN ===");
mtrace($token);
mtrace("====================");
