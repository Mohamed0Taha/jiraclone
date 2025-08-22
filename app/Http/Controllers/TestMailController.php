<?php

namespace App\Http\Controllers;

use App\Notifications\ContactFormNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

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

            // Test 2: Contact form using Notification approach (same as signup emails)
            $testUser = Auth::user() ?? (object) ['name' => 'Test User', 'email' => 'test@example.com', 'id' => 999];

            Log::info('Testing ContactFormNotification class', [
                'test_user' => $testUser,
                'approach' => 'notification',
            ]);

            Notification::route('mail', 'taha.elfatih@gmail.com')
                ->notify(new ContactFormNotification(
                    $testUser,
                    'Test Topic - Notification',
                    'This is a test message using the Notification approach (same as signup emails).',
                    now()->format('F j, Y \a\t g:i A')
                ));

            Log::info('ContactFormNotification test sent successfully');

            return response()->json([
                'status' => 'success',
                'message' => 'Both test emails sent successfully! (Raw + Notification approach)',
                'config' => [
                    'mailer' => config('mail.default'),
                    'host' => config('mail.mailers.smtp.host'),
                    'port' => config('mail.mailers.smtp.port'),
                    'from' => config('mail.from.address'),
                    'encryption' => config('mail.mailers.smtp.encryption'),
                    'username' => config('mail.mailers.smtp.username'),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Test email failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to send test email: '.$e->getMessage(),
                'config' => [
                    'mailer' => config('mail.default'),
                    'host' => config('mail.mailers.smtp.host'),
                    'port' => config('mail.mailers.smtp.port'),
                    'from' => config('mail.from.address'),
                    'encryption' => config('mail.mailers.smtp.encryption'),
                    'username' => config('mail.mailers.smtp.username'),
                ],
            ], 500);
        }
    }
}
