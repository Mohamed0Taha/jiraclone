<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestEmailSending extends Command
{
    protected $signature = 'test:send-email {user-id?}';

    protected $description = 'Test sending verification email';

    public function handle()
    {
        $userId = $this->argument('user-id') ?? 9;

        $user = User::find($userId);

        if (! $user) {
            $this->error("User with ID {$userId} not found.");

            return;
        }

        $this->info("Testing email sending for: {$user->email}");

        try {
            // Test simple email first
            $this->info('1. Testing simple email...');
            Mail::raw('This is a test email from TaskPilot', function ($message) use ($user) {
                $message->to($user->email)
                    ->subject('Test Email - TaskPilot');
            });
            $this->info('Simple email sent successfully!');

            // Test verification email
            $this->info('2. Testing verification email...');
            $user->sendEmailVerificationNotification();
            $this->info('Verification email sent successfully!');

        } catch (\Exception $e) {
            $this->error('Error sending email: '.$e->getMessage());
            $this->error('Stack trace: '.$e->getTraceAsString());
        }

        $this->info("\nEmail sending test completed. Check your Mailtrap inbox.");
    }
}
