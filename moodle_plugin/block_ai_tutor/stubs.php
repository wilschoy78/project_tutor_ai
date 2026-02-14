<?php
/**
 * This file is for development purposes only.
 * It provides stubs for Moodle global constants, functions, and classes
 * to silence linter errors when editing files outside of a Moodle instance.
 */

if (!defined('MOODLE_INTERNAL')) {
    define('MOODLE_INTERNAL', true);
}

if (!defined('MATURITY_ALPHA')) {
    define('MATURITY_ALPHA', 50);
}

if (!defined('PARAM_URL')) {
    define('PARAM_URL', 'url');
}

if (!defined('PARAM_TEXT')) {
    define('PARAM_TEXT', 'text');
}

if (!defined('PARAM_INT')) {
    define('PARAM_INT', 'int');
}

if (!defined('MUST_EXIST')) {
    define('MUST_EXIST', true);
}

if (!defined('IGNORE_MISSING')) {
    define('IGNORE_MISSING', false);
}

if (!defined('EXTERNAL_TOKEN_PERMANENT')) {
    define('EXTERNAL_TOKEN_PERMANENT', 0);
}

if (!function_exists('set_config')) {
    function set_config($name, $value, $plugin = null) {
        return true;
    }
}

if (!function_exists('mtrace')) {
    function mtrace($string, $eol = PHP_EOL) {
        echo $string . $eol;
    }
}

if (!function_exists('get_string')) {
    function get_string($identifier, $component = '', $a = null) {
        return $identifier;
    }
}

if (!function_exists('get_config')) {
    function get_config($plugin, $name) {
        return '';
    }
}

if (!function_exists('required_param')) {
    function required_param($parname, $type) {
        return 1;
    }
}

if (!function_exists('require_login')) {
    function require_login($courseorid = null, $autologinguest = true, $cm = null, $setwantsurltome = true, $preventredirect = false) {}
}

if (!function_exists('has_capability')) {
    function has_capability($capability, $context, $user = null, $doanything = true) {
        return false;
    }
}

if (!class_exists('admin_setting_configtext')) {
    class admin_setting_configtext {
        public function __construct($name, $visiblename, $description, $defaultsetting, $paramtype = null, $size = null) {}
    }
}

if (!class_exists('block_base')) {
    class block_base {
        public $title;
        public $content;
        public function init() {}
        public function get_content() {}
        public function has_config() {}
        public function applicable_formats() {}
    }
}

if (!class_exists('moodle_url')) {
    class moodle_url {
        public function __construct($url, array $params = null, $anchor = null) {}
        public function __toString() { return ''; }
    }
}

if (!class_exists('context_course')) {
    class context_course {
        public static function instance($courseid, $strictness = MUST_EXIST) {
            return new stdClass();
        }
    }
}

if (!defined('CONTEXT_COURSE')) {
    define('CONTEXT_COURSE', 50);
}

if (!class_exists('navigation_node')) {
    class navigation_node {
        const TYPE_COURSE = 20;
        const TYPE_SETTING = 30;
        public function add($text, $action = null, $type = self::TYPE_SETTING, $shorttext = null, $key = null, $icon = null) {}
        public function find($key, $type) { return new navigation_node(); }
    }
}

if (!class_exists('pix_icon')) {
    class pix_icon {
        public function __construct($pix, $component) {}
    }
}

// Global variables usually present in Moodle scope
global $ADMIN, $settings, $COURSE, $USER;
$ADMIN = new stdClass();
$ADMIN->fulltree = true;
$settings = new class {
    public function add($item) {}
};
$COURSE = new stdClass();
$COURSE->id = 1;
$COURSE->fullname = 'Course Fullname';
$USER = new stdClass();
$USER->id = 1;

global $DB, $OUTPUT, $PAGE;
$DB = new class {
    public function get_record($table, array $conditions, $fields = '*', $strictness = IGNORE_MISSING) {
        return new stdClass();
    }
};
$OUTPUT = new class {
    public function header() { return ''; }
    public function footer() { return ''; }
};
$PAGE = new class {
    public function set_context($context) {}
    public function set_url($url) {}
    public function set_title($title) {}
    public function set_heading($heading) {}
    public function set_pagelayout($layout) {}
};
