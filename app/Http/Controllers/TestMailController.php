<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class TestMailController extends Controller
{
    public function testEmail(Request $request)
    {
        try {
            // Test 1: Simple raw email
            Mail::raw('This is a test email to verify mail configuration.', function ($message) {
                $message->from(config('mail.from.address'), config('mail.from.name'))
                        ->to('taha.elfatih@gmail.com')
                        ->subject('Mail Configuration Test - Raw');
            });

            // Test 2: Contact form template test
            $testUser = Auth::user() ?? (object) ['name' => 'Test User', 'email' => 'test@example.com', 'id' => 999];
            
            Mail::send('emails.contact-ticket', [
                'user' => $testUser,
                'topicLabel' => 'Test Topic',
                'message' => 'This is a test message to verify the contact form email template works correctly.',
                'submittedAt' => now()->format('F j, Y \a\t g:i A'),
            ], function ($mail) use ($testUser) {
                $mail->from(config('mail.from.address'), config('mail.from.name'))
                     ->to('taha.elfatih@gmail.com')
                     ->subject("TaskPilot Support Test: Template Test")
                     ->replyTo($testUser->email, $testUser->name);
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Both test emails sent successfully!',
                'config' => [
                    'mailer' => config('mail.default'),
                    'host' => config('mail.mailers.smtp.host'),
                    'port' => config('mail.mailers.smtp.port'),
                    'from' => config('mail.from.address'),
                    'encryption' => config('mail.mailers.smtp.encryption'),
                    'username' => config('mail.mailers.smtp.username'),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Test email failed: ' . $e->getMessage());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to send test email: ' . $e->getMessage(),
                'config' => [
                    'mailer' => config('mail.default'),
                    'host' => config('mail.mailers.smtp.host'),
                    'port' => config('mail.mailers.smtp.port'),
                    'from' => config('mail.from.address'),
                    'encryption' => config('mail.mailers.smtp.encryption'),
                    'username' => config('mail.mailers.smtp.username'),
                ]
            ], 500);
        }
    }
}
