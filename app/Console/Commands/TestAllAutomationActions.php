<?php

namespace App\Console\Commands;

use App\Models\Automation;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\AutomationEngine;
use App\Services\TemplateEngine;
use Illuminate\Console\Command;

class TestAllAutomationActions extends Command
{
    protected $signature = 'test:automation-actions {automation_id?}';

    protected $description = 'Test all automation actions with template variables';

    public function handle()
    {
        $automationId = $this->argument('automation_id');

        if ($automationId) {
            $automation = Automation::find($automationId);
            if (! $automation) {
                $this->error("Automation with ID {$automationId} not found");

                return 1;
            }
        } else {
            // Create a test automation with all action types
            $automation = $this->createTestAutomation();
        }

        $this->info("Testing automation: {$automation->name}");
        $this->info("Project: {$automation->project->name}");

        // Create test context
        $testTask = Task::with(['assignee', 'creator'])->where('project_id', $automation->project_id)->whereNotNull('assignee_id')->first();
        if (! $testTask) {
            $testTask = $this->createTestTask($automation->project);
            // Ensure the task is reloaded with relationships
            $testTask = Task::with(['assignee', 'creator'])->find($testTask->id);
        }

        $context = ['task' => $testTask];

        $this->info("\n=== Testing Template Variables ===");
        $this->testTemplateEngine($automation, $context);

        $this->info("\n=== Testing All Actions ===");
        $automationEngine = app(AutomationEngine::class);

        foreach ($automation->actions as $index => $action) {
            $this->info("\n--- Testing Action ".($index + 1).' ---');
            $actionType = $action['type'] ?? $action['name'] ?? 'Unknown';
            $this->info("Action Type: {$actionType}");

            // Display action config with template variables
            $config = $action['config'] ?? $action;
            $this->displayActionConfig($config, $automation, $context);
        }

        return 0;
    }

    private function createTestAutomation(): Automation
    {
        $project = Project::first();
        if (! $project) {
            $this->error('No projects found. Please create a project first.');
            exit(1);
        }

        // Create a test automation with all action types
        $automation = Automation::create([
            'name' => 'Test All Actions - '.now()->format('H:i:s'),
            'project_id' => $project->id,
            'trigger' => 'task_created',
            'trigger_type' => 'task_created',
            'trigger_config' => [],
            'actions' => [
                [
                    'type' => 'Email',
                    'config' => [
                        'to' => 'test@example.com',
                        'subject' => 'Task Alert: {{task.title}}',
                        'message' => 'A new task "{{task.title}}" was created in project "{{project.name}}" with priority {{task.priority}}. Due date: {{task.due_date}}',
                    ],
                ],
                [
                    'type' => 'SMS',
                    'config' => [
                        'phone_number' => '+1234567890',
                        'message' => 'TaskPilot: {{task.title}} assigned to {{task.assignee.name}} in {{project.name}}',
                    ],
                ],
                [
                    'type' => 'Slack',
                    'config' => [
                        'webhook_url' => 'https://hooks.slack.com/services/test',
                        'channel' => '#general',
                        'message' => ':warning: High priority task "{{task.title}}" needs attention in {{project.name}}',
                    ],
                ],
                [
                    'type' => 'Discord',
                    'config' => [
                        'webhook_url' => 'https://discord.com/api/webhooks/test',
                        'message' => '🚨 **{{task.title}}** was created by {{task.creator.name}} on {{current_date}}',
                    ],
                ],
                [
                    'type' => 'Webhook',
                    'config' => [
                        'url' => 'https://example.com/webhook',
                        'method' => 'POST',
                        'payload' => [
                            'task_title' => '{{task.title}}',
                            'project_name' => '{{project.name}}',
                            'assignee' => '{{task.assignee.name}}',
                            'due_date' => '{{task.due_date}}',
                            'priority' => '{{task.priority}}',
                            'description' => '{{task.description}}',
                            'status' => '{{task.status}}',
                        ],
                    ],
                ],
                [
                    'type' => 'Calendar',
                    'config' => [
                        'title' => 'Task Due: {{task.title}}',
                        'description' => 'Task "{{task.title}}" in project {{project.name}} is due on {{task.due_date}}. Assigned to: {{task.assignee.name}}',
                    ],
                ],
            ],
            'is_active' => true,
        ]);

        return $automation;
    }

    private function createTestTask(Project $project): Task
    {
        $user = User::first();

        return Task::create([
            'title' => 'Test Task for Automation - '.now()->format('H:i:s'),
            'description' => 'This is a test task created to test automation template variables',
            'project_id' => $project->id,
            'creator_id' => $user->id,
            'assignee_id' => $user->id,
            'priority' => 'high',
            'status' => 'pending',
            'end_date' => now()->addDays(3),
        ]);
    }

    private function testTemplateEngine(Automation $automation, array $context): void
    {
        $templateEngine = app(TemplateEngine::class);

        $testTemplates = [
            '{{task.title}}' => 'Task Title',
            '{{task.description}}' => 'Task Description',
            '{{task.priority}}' => 'Task Priority',
            '{{task.status}}' => 'Task Status',
            '{{task.due_date}}' => 'Task Due Date',
            '{{task.assignee.name}}' => 'Assignee Name',
            '{{task.assignee.email}}' => 'Assignee Email',
            '{{task.creator.name}}' => 'Creator Name',
            '{{project.name}}' => 'Project Name',
            '{{project.description}}' => 'Project Description',
            '{{automation.name}}' => 'Automation Name',
            '{{user.name}}' => 'Current User Name',
            '{{current_date}}' => 'Current Date',
            '{{current_time}}' => 'Current Time',
        ];

        $this->table(
            ['Template Variable', 'Description', 'Replaced Value'],
            collect($testTemplates)->map(function ($description, $template) use ($templateEngine, $automation, $context) {
                $replaced = $templateEngine->replaceVariables($template, $automation, $context);

                return [$template, $description, $replaced];
            })->toArray()
        );
    }

    private function displayActionConfig(array $config, Automation $automation, array $context): void
    {
        $templateEngine = app(TemplateEngine::class);

        foreach ($config as $key => $value) {
            if (is_string($value) && strpos($value, '{{') !== false) {
                $replaced = $templateEngine->replaceVariables($value, $automation, $context);
                $this->line("  {$key}: {$value} → {$replaced}");
            } elseif (is_array($value)) {
                $this->line("  {$key}:");
                $this->displayNestedConfig($value, $automation, $context, '    ');
            } else {
                $this->line("  {$key}: {$value}");
            }
        }
    }

    private function displayNestedConfig(array $config, Automation $automation, array $context, string $indent = ''): void
    {
        $templateEngine = app(TemplateEngine::class);

        foreach ($config as $key => $value) {
            if (is_string($value) && strpos($value, '{{') !== false) {
                $replaced = $templateEngine->replaceVariables($value, $automation, $context);
                $this->line("{$indent}{$key}: {$value} → {$replaced}");
            } elseif (is_array($value)) {
                $this->line("{$indent}{$key}:");
                $this->displayNestedConfig($value, $automation, $context, $indent.'  ');
            } else {
                $this->line("{$indent}{$key}: {$value}");
            }
        }
    }
}
