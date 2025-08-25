<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\TemplateEngine;
use Illuminate\Console\Command;

class DebugTaskAssignee extends Command
{
    protected $signature = 'debug:task-assignee';

    protected $description = 'Debug task assignee relationship and template replacement';

    public function handle()
    {
        $this->info('=== Debugging Task Assignee ===');

        // Get first user and project
        $user = User::first();
        $project = Project::first();

        if (! $user || ! $project) {
            $this->error('Need at least one user and one project');

            return;
        }

        $this->info("User: {$user->name} (ID: {$user->id})");
        $this->info("Project: {$project->name} (ID: {$project->id})");

        // Find or create a test task with assignee
        $task = Task::where('title', 'Debug Assignee Test')->first();

        if (! $task) {
            $this->info('Creating test task...');
            $task = new Task;
            $task->title = 'Debug Assignee Test';
            $task->description = 'Test task for debugging assignee';
            $task->project_id = $project->id;
            $task->creator_id = $user->id;
            $task->assignee_id = $user->id;
            $task->status = 'pending';
            $task->priority = 'high';
            $task->end_date = now()->addDays(3);
            $task->save();

            $this->info("Created task ID: {$task->id}");
        }

        // Reload task with relationships
        $task = Task::with(['assignee', 'creator'])->find($task->id);

        $this->info("\n=== Task Details ===");
        $this->info("ID: {$task->id}");
        $this->info("Title: {$task->title}");
        $this->info("Creator ID: {$task->creator_id}");
        $this->info("Assignee ID: {$task->assignee_id}");

        $this->info("\n=== Relationships ===");
        $this->info('Has creator: '.($task->creator ? 'Yes' : 'No'));
        if ($task->creator) {
            $this->info("Creator name: {$task->creator->name}");
        }

        $this->info('Has assignee: '.($task->assignee ? 'Yes' : 'No'));
        if ($task->assignee) {
            $this->info("Assignee name: {$task->assignee->name}");
        }

        // Test template engine
        $this->info("\n=== Template Engine Test ===");
        $templateEngine = new TemplateEngine;

        // Create dummy automation
        $automation = (object) [
            'name' => 'Test Automation',
            'project' => $project,
        ];

        $context = ['task' => $task];

        $testVariables = [
            '{{task.assignee.name}}' => 'Task assignee name',
            '{{task.assignee.email}}' => 'Task assignee email',
            '{{task.creator.name}}' => 'Task creator name',
        ];

        foreach ($testVariables as $variable => $description) {
            $result = $templateEngine->replaceVariables($variable, $automation, $context);
            $this->info("{$variable} → {$result}");
        }
    }
}
