<?php

namespace App\Listeners;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Jobs\ProcessAutomations;
use App\Services\AutomationEngine;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class TriggerAutomations implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(TaskCreated|TaskUpdated $event): void
    {
        $task = $event->task;
        $project = $task->project;

        // Log the event for debugging
        $eventType = $event instanceof TaskCreated ? 'created' : 'updated';
        Log::info("Task {$eventType} event for task {$task->id} in project {$project->id}");

        // Instead of processing all automations, we'll pass the specific event context
        // This allows the AutomationEngine to be more selective about which automations to run
        ProcessAutomations::dispatch($project, $eventType, $task->id);
    }
}
