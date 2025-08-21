<?php

namespace App\Console\Commands;

use App\Jobs\ProcessAutomations;
use App\Models\Project;
use Illuminate\Console\Command;

class RunAutomations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'automations:run {--project= : Run automations for a specific project ID}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run automation workflows for all projects or a specific project';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $projectId = $this->option('project');

        if ($projectId) {
            $project = Project::find($projectId);

            if (! $project) {
                $this->error("Project with ID {$projectId} not found.");

                return 1;
            }

            $this->info("Processing automations for project: {$project->name}");
            ProcessAutomations::dispatch($project);
        } else {
            $this->info('Processing automations for all projects');
            ProcessAutomations::dispatch();
        }

        $this->info('Automation processing job queued successfully.');

        return 0;
    }
}
