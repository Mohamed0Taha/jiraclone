<?php

namespace App\Console\Commands;

use App\Models\EmailLog;
use App\Models\User;
use Illuminate\Console\Command;

class CreateSampleEmailLogs extends Command
{
    protected $signature = 'email:create-samples';

    protected $description = 'Create sample email logs for testing the dashboard';

    public function handle()
    {
        $this->info('Creating sample email logs...');

        // Get some users for realistic data
        $users = User::limit(3)->get();
        $userIds = $users->pluck('id')->toArray();

        // Create various types of email logs
        $sampleEmails = [
            [
                'to_email' => 'user1@example.com',
                'to_name' => 'John Doe',
                'subject' => 'Welcome to TaskPilot!',
                'type' => 'welcome',
                'content' => 'Welcome to TaskPilot! We\'re excited to have you on board.',
                'user_id' => $userIds[0] ?? null,
                'sent_successfully' => true,
                'created_at' => now()->subHours(2),
            ],
            [
                'to_email' => 'user2@example.com',
                'to_name' => 'Jane Smith',
                'subject' => 'Please verify your email address',
                'type' => 'verification',
                'content' => 'Click the link below to verify your email address.',
                'user_id' => $userIds[1] ?? null,
                'sent_successfully' => true,
                'created_at' => now()->subHours(4),
            ],
            [
                'to_email' => 'admin@taskpilot.us',
                'to_name' => 'TaskPilot Admin',
                'subject' => 'TaskPilot Support: Bug Report',
                'type' => 'contact',
                'content' => 'User reported a bug in the task creation feature.',
                'user_id' => $userIds[2] ?? null,
                'sent_successfully' => true,
                'created_at' => now()->subHours(1),
            ],
            [
                'to_email' => 'colleague@company.com',
                'to_name' => 'Bob Wilson',
                'subject' => 'You\'ve been invited to join a project!',
                'type' => 'invitation',
                'content' => 'You have been invited to collaborate on the new marketing project.',
                'user_id' => $userIds[0] ?? null,
                'sent_successfully' => true,
                'created_at' => now()->subMinutes(30),
            ],
            [
                'to_email' => 'user3@example.com',
                'to_name' => 'Alice Brown',
                'subject' => 'Task Due Reminder: Complete website design',
                'type' => 'automation',
                'content' => 'This is a reminder that your task is due tomorrow.',
                'user_id' => $userIds[1] ?? null,
                'sent_successfully' => true,
                'created_at' => now()->subMinutes(15),
            ],
            [
                'to_email' => 'failed@example.com',
                'to_name' => 'Failed User',
                'subject' => 'Password Reset Request',
                'type' => 'password_reset',
                'content' => null,
                'user_id' => null,
                'sent_successfully' => false,
                'error_message' => 'SMTP connection failed',
                'created_at' => now()->subMinutes(5),
            ],
        ];

        foreach ($sampleEmails as $emailData) {
            EmailLog::create($emailData);
            $this->line("✓ Created email log: {$emailData['subject']}");
        }

        $this->info("\n🎉 Successfully created ".count($sampleEmails).' sample email logs!');
        $this->info('You can now view them in the admin dashboard at /admin/dashboard');
        $this->info('Or view detailed logs at /admin/email-logs');

        return 0;
    }
}
