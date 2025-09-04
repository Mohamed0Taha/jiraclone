<?php

// Test Laravel Mail with explicit SMTP configuration
require __DIR__ . '/vendor/autoload.php';

use Illuminate\Container\Container;
use Illuminate\Support\Facades\Facade;
use Illuminate\Events\EventServiceProvider;
use Illuminate\Mail\MailServiceProvider;
use Illuminate\View\ViewServiceProvider;
use Illuminate\Filesystem\FilesystemServiceProvider;
use Illuminate\Foundation\Application;

// Create Laravel application container
$app = new Application(realpath(__DIR__));

// Set up service providers
$app->register(new EventServiceProvider($app));
$app->register(new ViewServiceProvider($app));
$app->register(new FilesystemServiceProvider($app));
$app->register(new MailServiceProvider($app));

// Set up configuration
$app['config'] = new \Illuminate\Config\Repository([
    'mail' => [
        'default' => 'smtp',
        'mailers' => [
            'smtp' => [
                'transport' => 'smtp',
                'host' => 'live.smtp.mailtrap.io',
                'port' => 587,
                'encryption' => 'tls',
                'username' => 'api',
                'password' => 'e640f58a598e3813abfbc2ee3f567728',
                'timeout' => 30,
                'local_domain' => env('MAIL_EHLO_DOMAIN'),
            ],
        ],
        'from' => [
            'address' => 'support@taskpilot.us',
            'name' => 'TaskPilot Support',
        ],
    ],
    'view' => [
        'paths' => [__DIR__ . '/resources/views'],
        'compiled' => __DIR__ . '/storage/framework/views',
    ],
    'filesystems' => [
        'default' => 'local',
        'disks' => [
            'local' => [
                'driver' => 'local',
                'root' => __DIR__ . '/storage/app',
            ],
        ],
    ],
]);

// Set up facades
Facade::setFacadeApplication($app);

try {
    echo "Testing Laravel Mail with explicit SMTP configuration...\n";
    
    $mailManager = $app->make('mail.manager');
    $mailer = $mailManager->mailer('smtp');
    
    echo "Created SMTP mailer instance\n";
    
    // Simple raw email test
    $mailer->raw('This is a test email from TaskPilot forwarding system using explicit SMTP.', function ($message) {
        $message->to('taha.elfatih@gmail.com')
                ->subject('TaskPilot Email Forwarding Test - Explicit SMTP');
    });
    
    echo "✅ Email sent successfully with Laravel Mail + explicit SMTP!\n";
    echo "Check your Gmail inbox at taha.elfatih@gmail.com\n";
    
} catch (Exception $e) {
    echo "❌ Email failed: " . $e->getMessage() . "\n";
    echo "Error in: " . $e->getFile() . " on line " . $e->getLine() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

?>
