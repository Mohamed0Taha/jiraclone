<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CustomViewDataUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $projectId;
    public $viewName;
    public $dataKey;
    public $data;
    public $user;

    /**
     * Create a new event instance.
     */
    public function __construct($projectId, $viewName, $dataKey, $data, $user = null)
    {
        $this->projectId = $projectId;
        $this->viewName = $viewName;
        $this->dataKey = $dataKey;
        $this->data = $data;
        $this->user = $user;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('custom-view.' . $this->projectId . '.' . $this->viewName),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'custom-view-data-updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'project_id' => $this->projectId,
            'view_name' => $this->viewName,
            'data_key' => $this->dataKey,
            'data' => $this->data,
            'user' => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ] : null,
            'timestamp' => now()->toISOString(),
        ];
    }
}
