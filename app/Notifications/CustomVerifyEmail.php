<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

class CustomVerifyEmail extends Notification
{
    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $minutes  = (int) config('auth.verification.expire', 60);

        // Build a RELATIVE signed URL (host/scheme ignored by the validator)
        $relative = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes($minutes),
            [
                'id'   => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ],
            false // ← CRITICAL: relative signature
        );

        // Prefix with your public host for the email button
        $full = rtrim(config('app.url'), '/') . $relative;

        return (new MailMessage)
            ->subject('Verify Email Address')
            ->greeting('Hello!')
            ->line('Please click the button below to verify your email address.')
            ->action('Verify Email Address', $full)
            ->line('If you’re having trouble clicking the button, copy and paste this URL into your web browser:')
            ->line($full);
    }
}
