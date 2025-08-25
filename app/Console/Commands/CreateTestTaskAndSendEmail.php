<?php

namespace App\Console\Commands;

use App\Mail\AutomationNotification;
use App\Models\Automation;
use App\Models\Project;
use App\Models\Task;
use App\Services\TemplateEngine;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class CreateTestTaskAndSendEmail extends Command
{
    protected $signature = 'email:test-with-task {email}';

    protected $description = 'Create a test task and send email with proper template variables';

    public function handle()
    {
        $email = $this->argument('email');

        try {
            // Get project
            $project = Project::first();
            if (! $project) {
                $this->error('No project found');

                return;
            }

            // Create a test task
            $task = new Task;
            $task->title = 'Email Template Test Task';
            $task->description = 'This is a test task created for email template testing';
            $task->status = 'in_progress';
            $task->priority = 'high';
            $task->project_id = $project->id;
            $task->creator_id = $project->user_id; // Use creator_id instead of user_id
            $task->end_date = Carbon::now()->addDays(3); // Use end_date instead of due_date
            $task->save();

            $this->info("Created test task: {$task->title} (ID: {$task->id})");

            // Create mock automation
            $automation = new Automation;
            $automation->name = 'Email Test Automation with Task Context';
            $automation->description = 'Testing email template with proper task context';
            $automation->project = $project;

            // Set up context with the created task
            $context = ['task' => $task];

            // Template email content
            $subject = '{{project.name}} - {{task.title}} Update';
            $body = "Hello {{user.name}},\n\n✅ Task Status Update:\n\n📋 Task: {{task.title}}\n🏗️ Project: {{project.name}}\n📊 Status: {{task.status}}\n⚡ Priority: {{task.priority}}\n📅 Due Date: {{task.due_date_formatted}}\n🕒 Created: {{task.created_at_formatted}}\n\n📝 Description: {{task.description}}\n\nThis email was sent on {{date.formatted}}.\n\nBest regards,\nTaskPilot Automation System";

            // Process templates using TemplateEngine
            $templateEngine = new TemplateEngine;
            $processedSubject = $templateEngine->replaceVariables($subject, $automation, $context);
            $processedBody = $templateEngine->replaceVariables($body, $automation, $context);

            $this->info("\n=== Template Processing Results ===");
            $this->info('Subject: '.$processedSubject);
            $this->info("\nBody:");
            $this->line($processedBody);

            // Send email
            $this->info("\n=== Sending Email ===");
            Mail::to($email)->send(new AutomationNotification($processedSubject, $processedBody));

            $this->info("✅ Email sent successfully to: {$email}");
            $this->info('🗑️ Cleaning up test task...');

            // Clean up the test task
            $task->delete();
            $this->info('✅ Test task deleted');

        } catch (\Exception $e) {
            $this->error('Error: '.$e->getMessage());
            $this->error('Stack trace: '.$e->getTraceAsString());
        }
    }
}
