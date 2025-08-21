<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ContactFormNotification extends Notification
{
    public $user;
    public $topicLabel;
    public $message;
    public $submittedAt;

    public function __construct($user, $topicLabel, $message, $submittedAt)
    {
        $this->user = $user;
        $this->topicLabel = $topicLabel;
        $this->message = $message;
        $this->submittedAt = $submittedAt;
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->from(config('mail.from.address'), config('mail.from.name'))
            ->replyTo($this->user->email, $this->user->name)
            ->subject("TaskPilot Support: {$this->topicLabel}")
            ->greeting("New Support Request: {$this->topicLabel}")
            ->line("**From:** {$this->user->name} ({$this->user->email})")
            ->line("**User ID:** #{$this->user->id}")
            ->line("**Topic:** {$this->topicLabel}")
            ->line("**Submitted:** {$this->submittedAt}")
            ->line('') // Empty line
            ->line("**Message:**")
            ->line($this->message)
            ->line('') // Empty line
            ->line('This message was sent through the TaskPilot contact form.')
            ->line('You can reply directly to this email to respond to the user.');
    }
}
