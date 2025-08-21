<?php

use Illuminate\Support\Facades\Mail;
use App\Notifications\CustomVerifyEmail;
use App\Models\User;

Route::get('/test-email-production', function () {
    try {
        // Get a test user or create one
        $user = User::first();
        if (!$user) {
            $user = User::factory()->make([
                'name' => 'Test User',
                'email' => 'test@example.com'
            ]);
        }

        // Test basic email
        Mail::raw('This is a test email from TaskPilot local development using production settings.', function ($message) use ($user) {
            $message->to($user->email)
                   ->subject('TaskPilot - Production Email Test')
                   ->from(config('mail.from.address'), config('mail.from.name'));
        });

        return response()->json([
            'success' => true,
            'message' => 'Test email sent successfully!',
            'mail_config' => [
                'mailer' => config('mail.default'),
                'host' => config('mail.mailers.smtp.host'),
                'port' => config('mail.mailers.smtp.port'),
                'username' => config('mail.mailers.smtp.username'),
                'encryption' => config('mail.mailers.smtp.encryption'),
                'from_address' => config('mail.from.address'),
                'from_name' => config('mail.from.name'),
            ]
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

Route::get('/test-verification-email', function () {
    try {
        $user = User::first();
        if (!$user) {
            return response()->json(['error' => 'No user found. Please register a user first.'], 404);
        }

        // Send verification email
        $user->notify(new CustomVerifyEmail());

        return response()->json([
            'success' => true,
            'message' => 'Verification email sent successfully!',
            'user_email' => $user->email
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});
