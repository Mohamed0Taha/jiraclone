<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\AssistantManagerService;
use App\Services\ProjectAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProjectAssistantController extends Controller
{
    public function __construct(
        private ProjectAssistantService $service,
        private AssistantManagerService $assistantManager
    ) {}

    /** POST /projects/{project}/assistant/chat */
    public function chat(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);

        $user = $request->user();
        $message = (string) $request->input('message', '');
        // Optionally, you could use a real session/user id here
        $sessionId = null;

        if (! $this->canModify($project)) {
            return response()->json([
                'type' => 'error',
                'message' => 'You do not have permission to modify this project.',
            ], 403);
        }

        // Check if user should see overlay (free tier)
        $shouldShowOverlay = $user->shouldShowOverlay('ai_chat');

        if ($shouldShowOverlay) {
            // For free users, return a generic response with overlay flag
            return response()->json([
                'type' => 'message',
                'content' => 'I\'d be happy to help you with your project! I can provide insights, suggestions, and assistance with your tasks.',
                'show_overlay' => true,
                'overlay_feature' => 'ai_chat',
                'upgrade_url' => route('billing.show'),
                'usage' => $user->getUsageSummary()['ai_chat'] ?? null,
            ]);
        }

        try {
            $resp = $this->service->processMessage($project, $message, $sessionId);

            // Increment usage on successful response
            $user->incrementAiChatUsage();

            return response()->json($resp);
        } catch (Throwable $e) {
            Log::error('Assistant chat error', ['error' => $e->getMessage()]);

            return response()->json([
                'type' => 'error',
                'message' => 'Error: '.$e->getMessage(),
            ], 400);
        }
    }

    /** GET /projects/{project}/assistant/suggestions */
    public function suggestions(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);

        // Define common task status labels
        $labels = [
            'todo' => 'To Do',
            'inprogress' => 'In Progress',
            'review' => 'Review',
            'done' => 'Done',
        ];

        $todo = $labels['todo'];
        $inprog = $labels['inprogress'];
        $rev = $labels['review'];
        $done = $labels['done'];

        return response()->json([
            'suggestions' => [
                "How many tasks are {$done}?",
                'List overdue tasks',
                'Who is the project owner?',
                'What methodology are we using?',
                'Show tasks assigned to me',
                "Move tasks in {$rev} to {$done}",
                'Delete urgent tasks',
                'Update due date for medium priority to next Friday',
                'Assign unassigned tasks to team members',
                'Create task for code review',
                "Set all {$inprog} tasks to {$rev}",
                'Show project timeline',
                'List high priority tasks',
                'Generate weekly progress report',
            ],
        ]);
    }

    /** POST /projects/{project}/assistant/execute */
    public function execute(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);

        $user = $request->user();
        $commandData = $request->input('command_data', []);

        if (! $this->canModify($project)) {
            return response()->json([
                'type' => 'error',
                'message' => 'You do not have permission to modify this project.',
            ], 403);
        }

        // Check if user should see overlay (free tier)
        $shouldShowOverlay = $user->shouldShowOverlay('ai_chat');

        if ($shouldShowOverlay) {
            return response()->json([
                'type' => 'error',
                'message' => 'Command execution is available for paid plans only.',
                'show_overlay' => true,
                'overlay_feature' => 'ai_chat',
                'upgrade_url' => route('billing.show'),
            ], 402);
        }

        try {
            $resp = $this->service->executeCommand($project, $commandData);

            // Increment usage on successful execution
            $user->incrementAiChatUsage();

            return response()->json($resp);
        } catch (Throwable $e) {
            Log::error('Assistant command execution error', [
                'error' => $e->getMessage(),
                'command_data' => $commandData,
            ]);

            return response()->json([
                'type' => 'error',
                'message' => 'Execution failed: '.$e->getMessage(),
            ], 400);
        }
    }

    /** GET /projects/{project}/assistant/test */
    public function test(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);

        return response()->json(['ok' => true, 'project' => $project->only(['id', 'name'])]);
    }

    /*
    |--------------------------------------------------------------------------
    | Permissions
    |--------------------------------------------------------------------------
    */

    private function authorizeView(Project $project): void
    {
        $user = Auth::user();
        abort_unless($user, 401);

        if ($user->id === (int) $project->user_id) {
            return;
        }

        if (method_exists($project, 'members')) {
            $isMember = $project->members()->where('users.id', $user->id)->exists();
            abort_unless($isMember, 403);

            return;
        }

        abort_unless(false, 403);
    }

    private function canModify(Project $project): bool
    {
        $user = Auth::user();
        if (! $user) {
            return false;
        }
        if ($user->id === (int) $project->user_id) {
            return true;
        }

        if (method_exists($project, 'members')) {
            return $project->members()->where('users.id', $user->id)->exists();
        }

        return false;
    }

    /** GET /projects/{project}/assistant/capabilities */
    public function getCapabilities(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);

        $capabilities = $this->assistantManager->getAssistantCapabilities($project);

        return response()->json([
            'success' => true,
            'capabilities' => $capabilities,
        ]);
    }

    /** POST /projects/{project}/assistant/toggle-enhancement */
    public function toggleEnhancement(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);

        if (!$this->canModify($project)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to modify this project.',
            ], 403);
        }

        $enabled = $request->boolean('enabled', true);
        
        // Check subscription for AI enhancement
        $user = $request->user();
        if ($enabled && $user->shouldShowOverlay('ai_chat')) {
            return response()->json([
                'success' => false,
                'message' => 'AI Enhancement requires a premium subscription.',
                'show_overlay' => true,
                'upgrade_url' => route('billing.show'),
            ], 402);
        }

        try {
            $this->assistantManager->toggleAIEnhancement($project, $enabled);

            return response()->json([
                'success' => true,
                'message' => $enabled ? 'AI Enhancement enabled successfully.' : 'AI Enhancement disabled.',
                'ai_enhanced' => $enabled,
            ]);

        } catch (Throwable $e) {
            Log::error('Failed to toggle AI enhancement', [
                'project_id' => $project->id,
                'enabled' => $enabled,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to toggle AI enhancement: ' . $e->getMessage(),
            ], 500);
        }
    }
}
