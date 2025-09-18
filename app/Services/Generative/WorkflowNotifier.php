<?php

namespace App\Services\Generative;

use App\Events\CustomViewDataUpdated;
use App\Models\Project;
use Illuminate\Support\Facades\Log;

class WorkflowNotifier
{
    public function broadcast(
        Project $project,
        string $viewName,
        string $step,
        string $status,
        string $details,
        int $sequence,
        ?\App\Models\User $authUser = null,
        int $totalSteps = 5
    ): void {
        try {
            broadcast(new CustomViewDataUpdated(
                $project->id,
                $viewName,
                'workflow_step',
                [
                    'sequence' => $sequence,
                    'step' => $step,
                    'status' => $status,
                    'details' => $details,
                    'total' => $totalSteps,
                ],
                $authUser
            ));
        } catch (\Throwable $e) {
            Log::debug('WorkflowNotifier broadcast failed', [
                'project_id' => $project->id,
                'view_name' => $viewName,
                'step' => $step,
                'status' => $status,
                'error' => $e->getMessage(),
            ]);
        }
    }
}

