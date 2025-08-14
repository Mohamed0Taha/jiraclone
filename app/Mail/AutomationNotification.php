<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AutomationNotification extends Mailable
{
    use Queueable, SerializesModels;

    public string $subjectLine;
    public string $contentText;

    public function __construct(string $subjectLine, string $contentText)
    {
        $this->subjectLine = $subjectLine;
        $this->contentText = $contentText;
    }

    public function build()
    {
        return $this->subject($this->subjectLine)
            ->text('emails.automation_plain');
    }
}
