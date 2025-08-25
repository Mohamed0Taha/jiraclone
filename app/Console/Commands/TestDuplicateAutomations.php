<?php

namespace App\Console\Commands;

use App\Events\TaskCreated;
use App\Models\Automation;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Console\Command;

class TestDuplicateAutomations extends Command
{
    protected $signature = 'test:duplicate-automations';

    protected $description = 'Test if automations are duplicated when triggered multiple times';

    public function handle()
    {
        $this->info('=== Testing Automation Duplication ===');

        // Find or create a test automation
        $project = Project::first();
        if (! $project) {
            $this->error('No projects found. Please create a project first.');

            return 1;
        }

        // Create a test automation that sends SMS on task creation
        $automation = Automation::create([
            'name' => 'Test Duplication - '.now()->format('H:i:s'),
            'project_id' => $project->id,
            'trigger' => 'task_created',
            'trigger_config' => [],
            'actions' => [
                [
                    'type' => 'SMS',
                    'config' => [
                        'phone_number' => '+1234567890',
                        'message' => 'TEST: Task "{{task.title}}" created at {{current_time}}',
                    ],
                ],
            ],
            'is_active' => true,
        ]);

        $this->info("Created test automation: {$automation->name} (ID: {$automation->id})");

        // Create a test task to trigger the automation
        $user = User::first();
        $task = Task::create([
            'title' => 'Duplication Test Task - '.now()->format('H:i:s'),
            'description' => 'Testing automation duplication',
            'project_id' => $project->id,
            'creator_id' => $user->id,
            'assignee_id' => $user->id,
            'priority' => 'high',
            'status' => 'pending',
            'end_date' => now()->addDays(1),
        ]);

        $this->info("Created test task: {$task->title} (ID: {$task->id})");

        // Fire the TaskCreated event multiple times to simulate rapid events
        $this->info('Firing TaskCreated event 5 times rapidly...');

        for ($i = 1; $i <= 5; $i++) {
            $this->info("Firing event #{$i}");
            TaskCreated::dispatch($task);

            // Small delay between events
            sleep(1);
        }

        $this->info('Events dispatched. Check logs for automation execution details.');

        // Show automation stats
        $automation->refresh();
        $this->info("Automation runs count: {$automation->runs_count}");
        $this->info('Last run at: '.($automation->last_run_at ? $automation->last_run_at->format('Y-m-d H:i:s') : 'Never'));

        // Cleanup
        $this->info('Cleaning up test data...');
        $automation->delete();
        $task->delete();

        $this->info('Test completed!');

        return 0;
    }
}
