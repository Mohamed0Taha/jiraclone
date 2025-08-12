<?php

namespace App\Listeners;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Jobs\ProcessAutomations;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class TriggerAutomations implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(TaskCreated|TaskUpdated $event): void
    {
        // Queue automation processing for the project
        ProcessAutomations::dispatch($event->task->project);
    }
}
