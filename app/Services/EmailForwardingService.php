<?php

namespace App\Services;

use App\Mail\ForwardedEmail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailForwardingService
{
    /**
     * Forward email from support@taskpilot.us to your Gmail
     */
    public static function forwardSupportEmail(
        string $subject,
        string $content,
        string $fromEmail,
        array $headers = []
    ): bool {
        try {
            $targetEmail = 'taha.elfatih@gmail.com';
            
            // Try Mailtrap API first (more reliable)
            $mailtrapApi = new MailtrapApiService();
            if ($mailtrapApi->forwardEmail($subject, $content, $fromEmail, $targetEmail, $headers)) {
                Log::info('Email forwarded successfully via Mailtrap API');
                return true;
            }
            
            // Fallback to SMTP
            Log::info('Mailtrap API failed, using SMTP fallback', [
                'original_subject' => $subject,
                'from' => $fromEmail,
                'to' => $targetEmail,
            ]);

            Mail::raw("FORWARDED EMAIL\n\nOriginal Subject: $subject\nOriginal From: $fromEmail\nForwarded: " . now()->format('F j, Y \a\t g:i A') . "\n\n---\n\n$content", function ($message) use ($targetEmail, $subject) {
                $message->to($targetEmail)
                        ->subject('[FORWARDED] ' . $subject);
            });

            Log::info('Email forwarded successfully via SMTP', [
                'original_subject' => $subject,
                'from' => $fromEmail,
                'to' => $targetEmail,
            ]);

            // Enable email logging if needed
            // \App\Models\EmailLog::logEmail(
            //     toEmail: $targetEmail,
            //     subject: '[FORWARDED] ' . $subject,
            //     type: 'forwarded',
            //     toName: 'Taha Elfatih',
            //     content: substr($content, 0, 500),
            //     success: true
            // );

            return true;

        } catch (\Exception $e) {
            Log::error('Email forwarding failed', [
                'original_subject' => $subject,
                'from' => $fromEmail,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return false;
        }
    }

    /**
     * Check if an email should be forwarded
     */
    public static function shouldForward(string $toEmail): bool
    {
        $forwardingRules = [
            'support@taskpilot.us',
            'help@taskpilot.us',
            'contact@taskpilot.us',
        ];

        return in_array(strtolower($toEmail), $forwardingRules);
    }
}
