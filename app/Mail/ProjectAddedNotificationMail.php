<?php

namespace App\Mail;

use App\Models\Project;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProjectAddedNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $project;

    public $user;

    public $addedBy;

    public function __construct(Project $project, User $user, User $addedBy)
    {
        $this->project = $project;
        $this->user = $user;
        $this->addedBy = $addedBy;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You\'ve been added to a project!',
            from: new \Illuminate\Mail\Mailables\Address('noreply@taskpilot.us', 'TaskPilot'),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.project-added-notification',
            with: [
                'project' => $this->project,
                'user' => $this->user,
                'addedBy' => $this->addedBy,
                'projectUrl' => route('projects.show', $this->project),
                'dashboardUrl' => route('projects.index'),
            ],
        );
    }
}
