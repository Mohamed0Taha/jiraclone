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
        $minutes = (int) config('auth.verification.expire', 60);

        $relative = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes($minutes),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ],
            false
        );

        $full = rtrim(config('app.url'), '/') . $relative;

        return (new MailMessage)
            ->from('noreply@taskpilot.us', 'TaskPilot')
            ->subject('Verify Email Address')
            ->greeting('Hello!')
            ->line('Please click the button below to verify your email address.')
            ->action('Verify Email Address', $full)
            ->line('If you are having trouble, copy and paste this URL:')
            ->line($full);
    }
}
