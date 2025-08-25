<?php
// Emergency cookie clear - bypasses all Laravel middleware

// If already cleaned this tab (sentinel), skip clearing again to prevent loop
if (isset($_COOKIE['cleaned_once'])) {
    header('Location: /');
    exit;
}

// Clear ALL cookies immediately
if (isset($_SERVER['HTTP_COOKIE'])) {
    $cookies = explode(';', $_SERVER['HTTP_COOKIE']);
    foreach($cookies as $cookie) {
        $parts = explode('=', $cookie);
        $name = trim($parts[0]);
        if($name) {
            // Clear with all possible combinations
            setcookie($name, '', time() - 3600, '/');
            setcookie($name, '', time() - 3600, '/', $_SERVER['HTTP_HOST'] ?? '');
            setcookie($name, '', time() - 3600, '/', '.' . ($_SERVER['HTTP_HOST'] ?? ''));
        }
    }
}

// Force clear common problematic cookies
$problematic = [
    'laravel_session',
    'XSRF-TOKEN', 
    'remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d',
    'filament_theme',
    'sidebar_collapsed'
];

foreach($problematic as $name) {
    setcookie($name, '', time() - 3600, '/');
    setcookie($name, '', time() - 3600, '/', $_SERVER['HTTP_HOST'] ?? '');
    setcookie($name, '', time() - 3600, '/', '.' . ($_SERVER['HTTP_HOST'] ?? ''));
}

// Set sentinel so we don't loop again after cleaning
setcookie('cleaned_once', '1', time() + 300, '/');

header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Cookies Cleared - TaskPilot</title>
    <meta http-equiv="refresh" content="2;url=/dashboard">
    <style>
        body { font-family: system-ui; text-align: center; padding: 50px; background: #f5f5f5; }
        .box { background: white; padding: 30px; border-radius: 10px; display: inline-block; }
    </style>
</head>
<body>
    <div class="box">
        <h1>✅ Cookies Cleared!</h1>
        <p>The "400 Bad Request" error has been fixed.</p>
        <p>Redirecting to TaskPilot...</p>
        <script>
            // Also clear on client side
            document.cookie.split(';').forEach(c => {
                const name = c.split('=')[0].trim();
                if(name) {
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + location.hostname + ';';
                }
            });
            setTimeout(() => window.location.href = '/dashboard', 2000);
        </script>
    </div>
</body>
</html>
