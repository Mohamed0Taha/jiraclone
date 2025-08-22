<?php

namespace App\Listeners;

use App\Models\EmailLog;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LogEmailSent
{
    /**
     * Handle the event.
     */
    public function handle(MessageSent $event): void
    {
        try {
            $message = $event->message;
            $data = $event->data ?? [];

            // Extract recipient information safely
            $toEmail = 'unknown@example.com';
            $toName = null;

            try {
                $toAddresses = $message->getTo();
                if ($toAddresses && count($toAddresses) > 0) {
                    $firstToAddress = reset($toAddresses);
                    if ($firstToAddress instanceof \Symfony\Component\Mime\Address) {
                        $toEmail = $firstToAddress->getAddress();
                        $toName = $firstToAddress->getName();
                    } else {
                        // Handle array format
                        foreach ($toAddresses as $address => $name) {
                            $toEmail = is_string($address) ? $address : (string) $address;
                            $toName = is_string($name) ? $name : null;
                            break;
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Could not extract recipient info', ['error' => $e->getMessage()]);
            }

            // Get subject safely
            $subject = 'No Subject';
            try {
                $subject = $message->getSubject() ?? 'No Subject';
            } catch (\Exception $e) {
                Log::warning('Could not extract subject', ['error' => $e->getMessage()]);
            }

            // Determine email type based on subject
            $type = $this->determineEmailType($subject, $data);

            // Get current user ID if available
            $userId = Auth::id();

            // If we don't have a user from Auth, try to find from email
            if (! $userId && $toEmail && $toEmail !== 'unknown@example.com') {
                try {
                    $user = \App\Models\User::where('email', $toEmail)->first();
                    $userId = $user?->id;
                } catch (\Exception $e) {
                    // Ignore user lookup errors
                }
            }

            // Get email content safely
            $content = null;
            try {
                $content = $this->extractEmailContent($message);
            } catch (\Exception $e) {
                Log::warning('Could not extract email content', ['error' => $e->getMessage()]);
            }

            // Log the email
            EmailLog::logEmail(
                toEmail: $toEmail,
                subject: $subject,
                type: $type,
                toName: $toName,
                content: $content,
                userId: $userId,
                success: true
            );

            Log::info('Email logged successfully', [
                'to' => $toEmail,
                'subject' => $subject,
                'type' => $type,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to log email in LogEmailSent listener', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Determine email type based on subject and data
     */
    private function determineEmailType(string $subject, array $data = []): string
    {
        $subject = strtolower($subject);

        if (str_contains($subject, 'verify') || str_contains($subject, 'verification')) {
            return 'verification';
        }

        if (str_contains($subject, 'password') || str_contains($subject, 'reset')) {
            return 'password_reset';
        }

        if (str_contains($subject, 'contact') || str_contains($subject, 'support')) {
            return 'contact';
        }

        if (str_contains($subject, 'invitation') || str_contains($subject, 'invite')) {
            return 'invitation';
        }

        if (str_contains($subject, 'project')) {
            return 'project';
        }

        if (str_contains($subject, 'task')) {
            return 'task';
        }

        if (str_contains($subject, 'automation')) {
            return 'automation';
        }

        if (str_contains($subject, 'welcome')) {
            return 'welcome';
        }

        if (str_contains($subject, 'test')) {
            return 'test';
        }

        return 'general';
    }

    /**
     * Extract email content for logging
     */
    private function extractEmailContent($message): ?string
    {
        try {
            $body = $message->getBody();

            if (is_string($body)) {
                // Limit content length for storage
                return substr(strip_tags($body), 0, 1000);
            }

            // Handle multipart messages
            if ($body instanceof \Symfony\Component\Mime\Part\Multipart\AlternativePart) {
                $parts = $body->getParts();
                foreach ($parts as $part) {
                    if ($part->getMediaType() === 'text' && $part->getMediaSubtype() === 'plain') {
                        return substr(strip_tags($part->getBody()), 0, 1000);
                    }
                }
            }

            return null;
        } catch (\Exception $e) {
            Log::warning('Could not extract email content', ['error' => $e->getMessage()]);

            return null;
        }
    }
}
