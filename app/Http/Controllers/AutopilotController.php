<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\AutopilotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class AutopilotController extends Controller
{
    public function __construct(
        private AutopilotService $autopilotService
    ) {}

    /**
     * Start autopilot for a project
     * POST /projects/{project}/autopilot/start
     */
    public function start(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);

        if (!$this->canModify($project)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to manage this project.',
            ], 403);
        }

        // Check subscription for autopilot feature
        $user = $request->user();
        if ($user->shouldShowOverlay('ai_autopilot')) {
            return response()->json([
                'success' => false,
                'message' => 'AI Autopilot requires a premium subscription.',
                'show_overlay' => true,
                'upgrade_url' => route('billing.show'),
            ], 402);
        }

        try {
            $result = $this->autopilotService->startAutopilot($project);

            if ($result['success']) {
                Log::info('Autopilot started successfully', [
                    'project_id' => $project->id,
                    'user_id' => $user->id
                ]);
            }

            return response()->json($result);

        } catch (Throwable $e) {
            Log::error('Failed to start autopilot', [
                'project_id' => $project->id,
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to start autopilot: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Stop autopilot for a project
     * POST /projects/{project}/autopilot/stop
     */
    public function stop(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);

        if (!$this->canModify($project)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to manage this project.',
            ], 403);
        }

        try {
            $result = $this->autopilotService->stopAutopilot($project);

            return response()->json($result);

        } catch (Throwable $e) {
            Log::error('Failed to stop autopilot', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to stop autopilot: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get autopilot status for a project
     * GET /projects/{project}/autopilot/status
     */
    public function status(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);

        try {
            $status = $this->autopilotService->getAutopilotStatus($project);
            $canManage = $this->canModify($project);

            // Return status with permission hint for UI
            return response()->json(array_merge($status, [
                'can_manage' => $canManage,
            ]));

        } catch (Throwable $e) {
            Log::error('Failed to get autopilot status', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get autopilot status: ' . $e->getMessage(),
                'enabled' => false,
            ], 500);
        }
    }

    /**
     * Execute a specific autopilot action
     * POST /projects/{project}/autopilot/execute
     */
    public function execute(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);

        if (!$this->canModify($project)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to manage this project.',
            ], 403);
        }

        $request->validate([
            'action_type' => 'required|string|in:analyze,optimize_priorities,assign_tasks,request_updates,optimize_timeline,break_down_tasks'
        ]);

        try {
            $result = $this->autopilotService->executeAutopilotAction(
                $project, 
                $request->input('action_type')
            );

            return response()->json($result);

        } catch (Throwable $e) {
            Log::error('Failed to execute autopilot action', [
                'project_id' => $project->id,
                'action_type' => $request->input('action_type'),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to execute action: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check if user can view the project
     */
    private function authorizeView(Project $project): void
    {
        $user = request()->user();
        
        if (!$user) {
            abort(401, 'Unauthorized');
        }

        // Check if user owns the project or is a member
        // Project relation is `members()`, not `users()`
        if ($user->id !== (int) $project->user_id &&
            !$project->members()->where('users.id', $user->id)->exists()) {
            abort(403, 'Access denied');
        }
    }

    /**
     * Check if user can modify the project
     */
    private function canModify(Project $project): bool
    {
        $user = request()->user();

        if (!$user) {
            return false;
        }

        // Allow project owner
        if ($user->id === (int) $project->user_id) {
            return true;
        }

        // Allow platform admins
        if (property_exists($user, 'is_admin') && $user->is_admin) {
            return true;
        }

        // Allow project admins (members with role=admin)
        return $project->members()
            ->where('users.id', $user->id)
            ->wherePivot('role', 'admin')
            ->exists();
    }
}
