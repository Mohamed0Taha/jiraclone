<?php

namespace App\Console\Commands;

use App\Models\Automation;
use App\Models\Task;
use App\Services\TemplateEngine;
use Illuminate\Console\Command;

class TestTemplateEngine extends Command
{
    protected $signature = 'template:test {automation_id?}';

    protected $description = 'Test the template engine with sample data';

    public function handle()
    {
        $automationId = $this->argument('automation_id');

        if ($automationId) {
            $automation = Automation::find($automationId);
            if (! $automation) {
                $this->error("Automation with ID {$automationId} not found");

                return;
            }
        } else {
            $automation = Automation::first();
            if (! $automation) {
                $this->error('No automations found in database');

                return;
            }
        }

        // Create sample context with task data
        $task = $automation->project->tasks()->first();
        $context = [];

        if ($task) {
            $context['task'] = $task;
        }

        $templateEngine = new TemplateEngine;

        // Test templates
        $templates = [
            "Hello {{user.name}}, task '{{task.title}}' was created in project '{{project.name}}'",
            'Task {{task.title}} has priority {{task.priority}} and status {{task.status}}',
            'Project {{project.name}} has {{project.tasks_count}} tasks total',
            'Current date: {{date.today}} at {{date.time}}',
            'Automation {{automation.name}} was triggered',
        ];

        $this->info('Testing Template Engine');
        $this->info("Automation: {$automation->name}");
        $this->info("Project: {$automation->project->name}");

        if ($task) {
            $this->info("Test Task: {$task->title}");
        } else {
            $this->warn('No tasks found in project for testing');
        }

        $this->info("\n--- Template Test Results ---");

        foreach ($templates as $template) {
            $result = $templateEngine->replaceVariables($template, $automation, $context);

            $this->line("\nTemplate: ".$template);
            $this->info('Result: '.$result);

            // Check if any variables were not replaced
            if (preg_match('/\{\{[^}]+\}\}/', $result)) {
                $this->warn('⚠️  Some variables were not replaced!');
            } else {
                $this->comment('✅ All variables replaced successfully');
            }
        }

        // Show available variables
        $this->info("\n--- Available Template Variables ---");
        $variables = $templateEngine->getAvailableVariables();

        foreach ($variables as $category => $vars) {
            $this->comment("\n{$category}:");
            foreach ($vars as $var => $description) {
                $this->line("  {{$category}.{$var}} - {$description}");
            }
        }
    }
}
