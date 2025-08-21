<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ContactFormMail extends Mailable
{
    use SerializesModels;

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

    public function build()
    {
        return $this->subject("TaskPilot Support: {$this->topicLabel}")
            ->from(config('mail.from.address'), config('mail.from.name'))
            ->replyTo($this->user->email, $this->user->name)
            ->view('emails.contact-ticket');
    }
}
