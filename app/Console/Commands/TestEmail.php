<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\CustomVerifyEmail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:test {--type=basic}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test email sending with Mailtrap production settings';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $type = $this->option('type');

        $this->info('🚀 Testing TaskPilot Email Configuration');
        $this->info('📧 Using: '.config('mail.mailers.smtp.host'));
        $this->info('👤 From: '.config('mail.from.address'));

        try {
            if ($type === 'basic') {
                $this->testBasicEmail();
            } elseif ($type === 'verification') {
                $this->testVerificationEmail();
            }

            $this->info('✅ Email sent successfully!');
            $this->info('📬 Check your Mailtrap inbox at: https://mailtrap.io/inboxes');

        } catch (\Exception $e) {
            $this->error('❌ Error sending email: '.$e->getMessage());
            $this->error('🔍 Details: '.$e->getTraceAsString());
        }
    }

    private function testBasicEmail()
    {
        $user = User::first();
        $testEmail = $user ? $user->email : 'test@example.com';

        Mail::raw('🎉 This is a test email from TaskPilot local development using Mailtrap production settings!', function ($message) use ($testEmail) {
            $message->to($testEmail)
                ->subject('TaskPilot - Production Email Test')
                ->from(config('mail.from.address'), config('mail.from.name'));
        });

        $this->info("📨 Basic test email sent to: $testEmail");
    }

    private function testVerificationEmail()
    {
        $user = User::first();
        if (! $user) {
            $this->error('❌ No user found. Please register a user first.');

            return;
        }

        $user->notify(new CustomVerifyEmail);
        $this->info("📨 Verification email sent to: {$user->email}");
    }
}
