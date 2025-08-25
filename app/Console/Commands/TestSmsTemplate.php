<?php

namespace App\Console\Commands;

use App\Models\Automation;
use App\Services\TemplateEngine;
use App\Services\TwilioService;
use Illuminate\Console\Command;

class TestSmsTemplate extends Command
{
    protected $signature = 'sms:test-template {phone} {--message=}';

    protected $description = 'Test SMS with template variables';

    public function handle()
    {
        $phone = $this->argument('phone');
        $customMessage = $this->option('message');

        // Get first automation for testing
        $automation = Automation::first();
        if (! $automation) {
            $this->error('No automations found in database');

            return;
        }

        // Get first task from the project
        $task = $automation->project->tasks()->first();
        $context = $task ? ['task' => $task] : [];

        // Default template message or custom message
        $message = $customMessage ?: 'Hello {{user.name}}! Task "{{task.title}}" in project {{project.name}} has priority {{task.priority}} and status {{task.status}}. Created on {{date.today}}.';

        $this->info('Testing SMS Template Engine');
        $this->info("Phone: {$phone}");
        $this->info("Automation: {$automation->name}");
        $this->info("Project: {$automation->project->name}");

        if ($task) {
            $this->info("Test Task: {$task->title}");
        } else {
            $this->warn('No tasks found - some variables may not be replaced');
        }

        // Process template
        $templateEngine = new TemplateEngine;
        $processedMessage = $templateEngine->replaceVariables($message, $automation, $context);

        $this->line("\nOriginal Template:");
        $this->comment($message);

        $this->line("\nProcessed Message:");
        $this->info($processedMessage);

        // Send SMS
        $this->line("\nSending SMS...");

        try {
            $twilioService = app(TwilioService::class);
            $result = $twilioService->sendSMS($phone, $processedMessage, [
                'automation_id' => $automation->id,
            ]);

            if ($result['success']) {
                $this->info('✅ SMS sent successfully!');
                $this->info("Message SID: {$result['message_sid']}");
                $this->info("Status: {$result['status']}");
            } else {
                $this->error('❌ SMS failed to send:');
                $this->error("Error: {$result['error']}");
            }

        } catch (\Exception $e) {
            $this->error('❌ Exception occurred:');
            $this->error($e->getMessage());
        }
    }
}
