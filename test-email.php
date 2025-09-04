<?php

require 'vendor/autoload.php';

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Bootstrap\LoadEnvironmentVariables;
use Illuminate\Foundation\Bootstrap\LoadConfiguration;
use Illuminate\Mail\MailManager;
use Illuminate\Config\Repository as Config;
use Illuminate\Container\Container;

// Bootstrap Laravel minimal setup
$app = new Application(realpath(__DIR__));
$app->singleton('app', Application::class);

// Load environment variables
(new LoadEnvironmentVariables())->bootstrap($app);

// Load basic configuration
$config = new Config([
    'mail' => [
        'default' => 'smtp',
        'mailers' => [
            'smtp' => [
                'transport' => 'smtp',
                'host' => env('MAIL_HOST'),
                'port' => env('MAIL_PORT'),
                'encryption' => env('MAIL_ENCRYPTION'),
                'username' => env('MAIL_USERNAME'),
                'password' => env('MAIL_PASSWORD'),
                'timeout' => null,
            ],
        ],
        'from' => [
            'address' => env('MAIL_FROM_ADDRESS'),
            'name' => env('MAIL_FROM_NAME'),
        ],
    ],
]);

$app->instance('config', $config);

// Create mail manager
$mailManager = new MailManager($app);

try {
    echo "Testing email configuration...\n";
    echo "MAIL_HOST: " . env('MAIL_HOST') . "\n";
    echo "MAIL_PORT: " . env('MAIL_PORT') . "\n";
    echo "MAIL_USERNAME: " . env('MAIL_USERNAME') . "\n";
    echo "MAIL_FROM_ADDRESS: " . env('MAIL_FROM_ADDRESS') . "\n";
    echo "MAIL_ENCRYPTION: " . env('MAIL_ENCRYPTION') . "\n";
    
    $mailer = $mailManager->mailer();
    
    // Simple test
    $message = $mailer->raw('This is a test email from TaskPilot forwarding system.', function ($msg) {
        $msg->to('taha.elfatih@gmail.com')
            ->subject('TaskPilot Email Forwarding Test');
    });
    
    echo "✅ Email sent successfully!\n";
    
} catch (Exception $e) {
    echo "❌ Email failed: " . $e->getMessage() . "\n";
    echo "Error details: " . $e->getTraceAsString() . "\n";
}

?>
