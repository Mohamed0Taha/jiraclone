<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BroadcastEmailMailable extends Mailable
{
    use Queueable, SerializesModels;

    public string $subjectLine;
    public string $bodyMessage;
    public User $recipient;

    public function __construct(string $subjectLine, string $bodyMessage, User $recipient)
    {
        $this->subjectLine = $subjectLine;
        $this->bodyMessage = $bodyMessage;
        $this->recipient = $recipient;
    }

    public function build(): self
    {
        return $this->from('people@taskpilot.us', 'TaskPilot Team')
            ->subject($this->subjectLine)
            ->view('emails.broadcast')
            ->with([
                'bodyMessage' => $this->bodyMessage,
                'user' => $this->recipient,
            ]);
    }
}
