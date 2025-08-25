<?php

namespace App\Console\Commands;

use App\Models\Automation;
use App\Models\Project;
use App\Models\Task;
use App\Services\TemplateEngine;
use App\Services\TwilioService;
use Illuminate\Console\Command;

class TestSmsWithTemplate extends Command
{
    protected $signature = 'test:sms-template {phone} {--project_id=} {--task_id=}';

    protected $description = 'Test SMS sending with template variable replacement';

    public function handle()
    {
        $phone = $this->argument('phone');
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
            $automation->name = 'Template Test Automation';
            $automation->description = 'Testing template variable replacement';
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

            // Template message with variables
            $templateMessage = "Hello {{user.name}}! Task '{{task.title}}' in project '{{project.name}}' has status '{{task.status}}' and priority '{{task.priority}}'. Created on {{task.created_at_formatted}}. Today is {{date.formatted}}.";

            $this->info('Original template:');
            $this->line($templateMessage);

            // Use TemplateEngine to replace variables
            $templateEngine = new TemplateEngine;
            $finalMessage = $templateEngine->replaceVariables($templateMessage, $automation, $context);

            $this->info("\nAfter template processing:");
            $this->line($finalMessage);

            // Send SMS using TwilioService
            $this->info("\nSending SMS...");
            $twilioService = new TwilioService;

            $result = $twilioService->sendSMS($phone, $finalMessage, [
                'user_id' => $project->user_id,
                'automation_id' => null, // This is a test, no actual automation
            ]);

            if ($result['success']) {
                $this->info('✅ SMS sent successfully!');
                $this->line("Message SID: {$result['message_sid']}");
                $this->line("Status: {$result['status']}");
                $this->line("To: {$result['to']}");
            } else {
                $this->error('❌ Failed to send SMS:');
                $this->line("Error: {$result['error']}");
            }

        } catch (\Exception $e) {
            $this->error('Error: '.$e->getMessage());
        }
    }
}
