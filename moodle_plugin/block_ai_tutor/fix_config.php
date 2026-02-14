<?php
$file = '/var/www/html/config.php';
$content = file_get_contents($file);

// Regex to match the line regardless of whitespace
// Matches: $CFG->wwwroot = 'http://localhost:8080';
$content = preg_replace(
    '/^\$CFG->wwwroot\s*=\s*[\'"]http:\/\/localhost:8080[\'"];/m', 
    "\$CFG->wwwroot   = 'http://' . \$_SERVER['HTTP_HOST'];", 
    $content
);

file_put_contents($file, $content);
echo "Config updated.\n";
echo "New content check:\n";
echo substr($content, strpos($content, 'wwwroot') - 10, 100) . "\n";
