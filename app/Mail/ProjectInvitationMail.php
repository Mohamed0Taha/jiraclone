<?php

namespace App\Mail;

use App\Models\ProjectInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProjectInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $invitation;

    public function __construct(ProjectInvitation $invitation)
    {
        $this->invitation = $invitation;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You\'ve been invited to join a project!',
            from: new \Illuminate\Mail\Mailables\Address('noreply@taskpilot.us', 'TaskPilot'),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.project-invitation',
            with: [
                'invitation' => $this->invitation,
                'project' => $this->invitation->project,
                'inviter' => $this->invitation->inviter,
                'acceptUrl' => route('projects.invitation.accept', $this->invitation->token),
            ],
        );
    }
}
