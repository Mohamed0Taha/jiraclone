<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

class SetupEmailForwarding extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:setup-forwarding 
                            {--from=support@taskpilot.us : Email to forward from}
                            {--to=taha.elfatih@gmail.com : Email to forward to}
                            {--test : Run a test forward}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Set up automatic email forwarding from support@ to Gmail';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Setting up Email Forwarding for TaskPilot');
        $this->line('');

        $fromEmail = $this->option('from');
        $toEmail = $this->option('to');

        // Display current configuration
        $this->info("Current Configuration:");
        $this->line("From: {$fromEmail}");
        $this->line("To: {$toEmail}");
        $this->line("Mail Host: " . config('mail.mailers.smtp.host'));
        $this->line("Mail Port: " . config('mail.mailers.smtp.port'));
        $this->line('');

        // Check if test mode
        if ($this->option('test')) {
            $this->info('🧪 Running test email forward...');
            
            $success = Artisan::call('email:forward', [
                'from' => 'test@example.com',
                'subject' => 'Test Email Forward - ' . now()->format('Y-m-d H:i:s'),
                'content' => 'This is a test email to verify forwarding is working correctly.',
                '--to' => $toEmail
            ]);

            if ($success === 0) {
                $this->info('✅ Test email sent successfully!');
                $this->info("Check {$toEmail} for the forwarded test email.");
            } else {
                $this->error('❌ Test email failed. Check your mail configuration.');
            }
            return;
        }

        // Create webhook/API endpoint script
        $this->info('📝 Creating email forwarding webhook...');
        $this->createWebhook($fromEmail, $toEmail);

        // Create bash script for CLI forwarding
        $this->info('📝 Creating CLI forwarding script...');
        $this->createBashScript($fromEmail, $toEmail);

        $this->info('');
        $this->info('✅ Email forwarding setup complete!');
        $this->line('');
        $this->info('📋 Available commands:');
        $this->line('• php artisan email:forward "sender@example.com" "Subject" "Content"');
        $this->line('• ./scripts/forward-email.sh "sender@example.com" "Subject" "Content"');
        $this->line('• curl -X POST http://your-domain.com/api/forward-email (see webhook route)');
        $this->line('');
        $this->info('🧪 Test the setup:');
        $this->line('php artisan email:setup-forwarding --test');
    }

    private function createWebhook($from, $to)
    {
        $webhookRoute = "
// Email Forwarding Webhook Route
Route::post('/api/forward-email', function (Request \$request) {
    \$request->validate([
        'from' => 'required|email',
        'subject' => 'required|string',
        'content' => 'required|string',
    ]);

    \$success = App\\Services\\EmailForwardingService::forwardSupportEmail(
        subject: \$request->subject,
        content: \$request->content,
        fromEmail: \$request->from,
        headers: \$request->headers ?? []
    );

    return response()->json([
        'success' => \$success,
        'message' => \$success ? 'Email forwarded successfully' : 'Failed to forward email'
    ]);
});";

        $this->line("Webhook route created. Add this to your routes/api.php:");
        $this->line($webhookRoute);
    }

    private function createBashScript($from, $to)
    {
        $scriptContent = "#!/bin/bash

# Email Forwarding Script for TaskPilot
# Usage: ./forward-email.sh \"sender@example.com\" \"Subject\" \"Content\"

FROM_EMAIL=\"\$1\"
SUBJECT=\"\$2\"
CONTENT=\"\$3\"
TO_EMAIL=\"{$to}\"

if [ -z \"\$FROM_EMAIL\" ] || [ -z \"\$SUBJECT\" ] || [ -z \"\$CONTENT\" ]; then
    echo \"Usage: \$0 <from_email> <subject> <content>\"
    echo \"Example: \$0 'user@example.com' 'Help Request' 'I need help with...'\"
    exit 1
fi

echo \"🔄 Forwarding email from: \$FROM_EMAIL\"
echo \"📧 Subject: \$SUBJECT\"
echo \"📬 To: \$TO_EMAIL\"

# Use Laravel Artisan command
php artisan email:forward \"\$FROM_EMAIL\" \"\$SUBJECT\" \"\$CONTENT\" --to=\"\$TO_EMAIL\"

if [ \$? -eq 0 ]; then
    echo \"✅ Email forwarded successfully!\"
else
    echo \"❌ Failed to forward email\"
    exit 1
fi
";

        File::put(base_path('scripts/forward-email.sh'), $scriptContent);
        chmod(base_path('scripts/forward-email.sh'), 0755);
        
        $this->info('Created: scripts/forward-email.sh');
    }
}
