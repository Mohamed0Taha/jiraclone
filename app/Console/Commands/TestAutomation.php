<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Services\AutomationEngine;
use Illuminate\Console\Command;

class TestAutomation extends Command
{
    protected $signature = 'automation:test {project_id?}';

    protected $description = 'Test automation workflow for a project';

    public function handle()
    {
        $projectId = $this->argument('project_id');

        if ($projectId) {
            $project = Project::find($projectId);
            if (! $project) {
                $this->error("Project with ID {$projectId} not found.");

                return;
            }
        } else {
            $project = Project::first();
            if (! $project) {
                $this->error('No projects found.');

                return;
            }
        }

        $this->info("Testing automations for project: {$project->name}");

        // Show active automations
        $automations = $project->automations()->where('is_active', true)->get();
        $this->info('Found '.$automations->count().' active automations:');

        foreach ($automations as $automation) {
            $this->line("  - {$automation->name} (trigger: {$automation->trigger})");
        }

        // Test a task update
        $task = $project->tasks()->first();
        if ($task) {
            $this->info("\nTesting with task: {$task->title}");
            $this->info("Current status: {$task->status}");

            // Change status to trigger automation
            $originalStatus = $task->status;
            $task->status = 'inprogress';
            $task->save();
            $this->info('Changed status to: inprogress');

            $task->status = 'done';
            $task->save();
            $this->info('Changed status to: done');

            // Process automations
            $engine = new AutomationEngine;
            $this->info("\nProcessing automations...");
            $engine->processProjectAutomations($project);

            $this->info('Check your logs and email for results!');
        } else {
            $this->error('No tasks found in project.');
        }
    }
}
