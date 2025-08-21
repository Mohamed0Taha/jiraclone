<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class TestMailController extends Controller
{
    public function testEmail(Request $request)
    {
        try {
            Mail::raw('This is a test email to verify mail configuration.', function ($message) {
                $message->from(config('mail.from.address'), config('mail.from.name'))
                        ->to('taha.elfatih@gmail.com')
                        ->subject('Mail Configuration Test');
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Test email sent successfully!',
                'config' => [
                    'mailer' => config('mail.default'),
                    'host' => config('mail.mailers.smtp.host'),
                    'port' => config('mail.mailers.smtp.port'),
                    'from' => config('mail.from.address'),
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
                ]
            ], 500);
        }
    }
}
