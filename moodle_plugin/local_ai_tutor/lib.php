<?php

defined('MOODLE_INTERNAL') || die();

/**
 * Extends the settings navigation with the AI Tutor link.
 *
 * @param settings_navigation $settingsnav
 * @param context $context
 */
function local_ai_tutor_extend_settings_navigation($settingsnav, $context) {
    // Only add link if we are in a course context
    if ($context->contextlevel == CONTEXT_COURSE) {
        // Create the URL to the BLOCK's view page (we reuse the block's view)
        // Note: We need to make sure the user has access. The view.php checks capability.
        $url = new moodle_url('/blocks/ai_tutor/view.php', array('courseid' => $context->instanceid));
        
        // Find the "Course administration" node.
        // In Boost (Moodle 4.0+), this often maps to the "More" menu or the secondary navigation.
        // We look for 'courseadmin' which is the standard key.
        $coursenode = $settingsnav->find('courseadmin', navigation_node::TYPE_COURSE);
        
        if ($coursenode) {
            // Add the AI Tutor link
            $coursenode->add(
                get_string('ai_tutor', 'local_ai_tutor'),
                $url,
                navigation_node::TYPE_SETTING,
                null,
                'local_ai_tutor_link',
                new pix_icon('i/users', '') 
            );
        }
    }
}
