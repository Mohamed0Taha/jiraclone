<?php

// Test email forwarding with raw PHP mail - to isolate Laravel issues
function testSimpleForwarding() {
    // Include Laravel's autoloader only
    require_once __DIR__ . '/vendor/autoload.php';
    
    $to = 'taha.elfatih@gmail.com';
    $subject = '[FORWARDED] Test Forward';
    $message = "FORWARDED EMAIL\n\nOriginal Subject: Test Forward\nOriginal From: test@example.com\n\n---\n\nThis is a test email to verify forwarding works";
    
    $headers = [
        'From: TaskPilot Support <support@taskpilot.us>',
        'Reply-To: support@taskpilot.us',
        'X-Mailer: TaskPilot Email Forwarder',
        'Content-Type: text/plain; charset=UTF-8'
    ];
    
    echo "Sending test email...\n";
    echo "To: $to\n";
    echo "Subject: $subject\n";
    echo "From: support@taskpilot.us\n\n";
    
    $success = mail($to, $subject, $message, implode("\r\n", $headers));
    
    if ($success) {
        echo "✅ Email sent successfully with PHP mail()!\n";
        echo "Check your Gmail inbox at taha.elfatih@gmail.com\n";
    } else {
        echo "❌ Failed to send email with PHP mail()\n";
        echo "This might indicate a server-level mail configuration issue\n";
    }
    
    return $success;
}

testSimpleForwarding();

?>
