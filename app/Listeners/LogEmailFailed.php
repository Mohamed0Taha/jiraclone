<?php

namespace App\Listeners;

use App\Models\EmailLog;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LogEmailFailed
{
    /**
     * Handle the event.
     */
    public function handle($event): void
    {
        try {
            // Handle different types of failed events
            if ($event instanceof JobFailed) {
                $this->handleJobFailed($event);
            }

        } catch (\Exception $e) {
            Log::error('Failed to log failed email', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Handle job failed events that might be email related
     */
    private function handleJobFailed(JobFailed $event): void
    {
        $payload = json_decode($event->payload, true);

        // Check if this is an email-related job
        if (! isset($payload['data']['command']) ||
            ! str_contains($payload['data']['command'], 'Mail\\') &&
            ! str_contains($payload['data']['command'], 'Notification')) {
            return;
        }

        // Try to extract email information from the failed job
        $command = unserialize($payload['data']['command']);

        if (method_exists($command, 'mailable')) {
            $mailable = $command->mailable;

            // Extract basic information
            $toEmail = 'unknown@example.com';
            $subject = 'Failed Email';

            if (isset($mailable->to) && is_array($mailable->to) && count($mailable->to) > 0) {
                $toEmail = $mailable->to[0]['address'] ?? $toEmail;
            }

            if (isset($mailable->subject)) {
                $subject = $mailable->subject;
            }

            EmailLog::logEmail(
                toEmail: $toEmail,
                subject: $subject,
                type: 'failed',
                toName: null,
                content: null,
                userId: Auth::id(),
                success: false,
                error: $event->exception->getMessage() ?? 'Job failed'
            );
        }
    }
}
