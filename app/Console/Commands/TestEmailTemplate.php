<?php

namespace App\Console\Commands;

use App\Mail\AutomationNotification;
use App\Models\Automation;
use App\Models\Project;
use App\Models\Task;
use App\Services\TemplateEngine;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class TestEmailTemplate extends Command
{
    protected $signature = 'test:email-template {email} {--project_id=} {--task_id=}';

    protected $description = 'Test email sending with template variable replacement';

    public function handle()
    {
        $email = $this->argument('email');
        $projectId = $this->option('project_id');
        $taskId = $this->option('task_id');

        try {
            // Get project and task for context
            if ($projectId) {
                $project = Project::find($projectId);
                if (! $project) {
                    $this->error("Project with ID {$projectId} not found");

                    return;
                }
            } else {
                $project = Project::first();
                if (! $project) {
                    $this->error('No projects found');

                    return;
                }
            }

            // Create a mock automation for the project
            $automation = new Automation;
            $automation->name = 'Template Test Email Automation';
            $automation->description = 'Testing template variable replacement in emails';
            $automation->project = $project;

            // Get task for context if specified
            $context = [];
            if ($taskId) {
                $task = Task::find($taskId);
                if ($task && $task->project_id == $project->id) {
                    $context['task'] = $task;
                    $this->info("Using task: {$task->title}");
                } else {
                    $this->warn("Task not found or doesn't belong to project");
                }
            } else {
                $task = $project->tasks()->first();
                if ($task) {
                    $context['task'] = $task;
                    $this->info("Using first task from project: {$task->title}");
                }
            }

            // Template email content with variables
            $subject = '{{project.name}} - Task Update for {{user.name}}';
            $body = "Hello {{user.name}},\n\nThis is an automated notification from {{automation.name}}.\n\nTask: {{task.title}}\nProject: {{project.name}}\nStatus: {{task.status}}\nPriority: {{task.priority}}\nCreated: {{task.created_at_formatted}}\n\nToday is {{date.formatted}}.\n\nBest regards,\nTaskPilot Automation System";

            $this->info('Original subject:');
            $this->line($subject);

            $this->info("\nOriginal body:");
            $this->line($body);

            // Use TemplateEngine to replace variables
            $templateEngine = new TemplateEngine;
            $processedSubject = $templateEngine->replaceVariables($subject, $automation, $context);
            $processedBody = $templateEngine->replaceVariables($body, $automation, $context);

            $this->info("\nAfter template processing:");
            $this->info('Subject: '.$processedSubject);
            $this->info("\nBody:");
            $this->line($processedBody);

            // Send email
            $this->info("\nSending email to: {$email}");

            Mail::to($email)->send(new AutomationNotification($processedSubject, $processedBody));

            $this->info('✅ Email sent successfully!');

        } catch (\Exception $e) {
            $this->error('Error: '.$e->getMessage());
            $this->error('Stack trace: '.$e->getTraceAsString());
        }
    }
}
