<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskUpdated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $task;

    public $changes;

    /**
     * Create a new event instance.
     */
    public function __construct(Task $task, array $changes = [])
    {
        $this->task = $task;
        $this->changes = $changes;
    }
}
