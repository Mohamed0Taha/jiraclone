<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AutomationNotification extends Mailable
{
    use SerializesModels;

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
            ->from('taskpilot-bot@taskpilot.us', 'TaskPilot Bot')
            ->text('emails.automation_plain');
    }
}
