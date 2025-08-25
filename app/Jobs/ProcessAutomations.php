<?php

namespace App\Jobs;

use App\Models\Project;
use App\Services\AutomationEngine;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessAutomations implements ShouldQueue
{
    use Queueable;

    public $project;

    public $eventType;

    public $taskId;

    /**
     * Create a new job instance.
     */
    public function __construct(?Project $project = null, ?string $eventType = null, ?int $taskId = null)
    {
        $this->project = $project;
        $this->eventType = $eventType;
        $this->taskId = $taskId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $automationEngine = new AutomationEngine;

        if ($this->project) {
            // Process automations for a specific project with event context
            if ($this->eventType && $this->taskId) {
                Log::info("Processing automations for project: {$this->project->name}, event: {$this->eventType}, task: {$this->taskId}");
                $automationEngine->processProjectAutomationsWithContext(
                    $this->project,
                    $this->eventType,
                    $this->taskId
                );
            } else {
                // Fallback to original behavior for manual triggers
                Log::info("Processing automations for project: {$this->project->name}");
                $automationEngine->processProjectAutomations($this->project);
            }
        } else {
            // Process automations for all projects
            Log::info('Processing automations for all projects');
            $projects = Project::whereHas('automations', function ($query) {
                $query->where('is_active', true);
            })->get();

            foreach ($projects as $project) {
                $automationEngine->processProjectAutomations($project);
            }
        }
    }
}
