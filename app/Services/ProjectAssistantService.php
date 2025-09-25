<?php

namespace App\Services;

use App\Agents\ProjectAssistantAgent;
use App\Models\Project;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProjectAssistantService
{
    public function __construct(
        private ProjectAssistantAgent $agent,
        private CommandExecutionService $commandExecutor
    ) {
    }

    public function processMessage(Project $project, string $message, ?string $sessionId = null): array
    {
        try {
            Log::debug('[ProjectAssistantService] delegated to agent', [
                'project_id' => $project->id,
                'session_id' => $sessionId,
            ]);

            return $this->agent->handle($project, $message, $sessionId)->toArray();
        } catch (Throwable $e) {
            Log::error('[ProjectAssistantService] agent failure', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return [
                'type' => 'error',
                'message' => 'An unexpected error occurred. Please try again.',
                'requires_confirmation' => false,
            ];
        }
    }

    public function executeCommand(Project $project, array $plan): array
    {
        return $this->commandExecutor->execute($project, $plan);
    }
}
