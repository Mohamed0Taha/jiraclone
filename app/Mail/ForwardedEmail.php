<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ForwardedEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $originalSubject;
    public $originalContent;
    public $originalFrom;
    public $originalHeaders;

    public function __construct(
        string $originalSubject,
        string $originalContent,
        string $originalFrom,
        array $originalHeaders = []
    ) {
        $this->originalSubject = $originalSubject;
        $this->originalContent = $originalContent;
        $this->originalFrom = $originalFrom;
        $this->originalHeaders = $originalHeaders;
    }

    public function build()
    {
        return $this->to('taha.elfatih@gmail.com')
                    ->subject('[FORWARDED] ' . $this->originalSubject)
                    ->view('emails.forwarded')
                    ->with([
                        'originalSubject' => $this->originalSubject,
                        'originalContent' => $this->originalContent,
                        'originalFrom' => $this->originalFrom,
                        'originalHeaders' => $this->originalHeaders
                    ]);
    }
}
