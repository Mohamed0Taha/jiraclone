<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectAssistantService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Throwable;

class ProjectAssistantController extends Controller
{
    public function __construct(private ProjectAssistantService $service)
    {
    }

    /** POST /projects/{project}/assistant/chat */
    public function chat(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);

        $message = (string)$request->input('message', '');
        // Optionally, you could use a real session/user id here
        $sessionId = null;

        try {
            $resp = $this->service->processMessage($project, $message, $sessionId);
            return response()->json($resp);
        } catch (Throwable $e) {
            Log::error('Assistant chat error', ['error' => $e->getMessage()]);
            return response()->json([
                'type' => 'error',
                'message' => "Error: ".$e->getMessage(),
            ], 400);
        }
    }

    /** POST /projects/{project}/assistant/execute */
    public function execute(Request $request, Project $project): JsonResponse
    {
        if (!$this->canModify($project)) {
            return response()->json([
                'type' => 'error',
                'message' => 'You do not have permission to modify this project.',
            ], 403);
        }

        $payload = (array)$request->input('command_data', []);

        try {
            $resp = $this->service->executeCommand($project, $payload);
            return response()->json($resp);
        } catch (Throwable $e) {
            Log::error('Assistant execute error', ['error' => $e->getMessage()]);
            return response()->json([
                'type' => 'error',
                'message' => "Execution failed: ".$e->getMessage(),
            ], 400);
        }
    }

    /** GET /projects/{project}/assistant/suggestions */
    public function suggestions(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);

    // $labels = $this->service->labelsFor($project); // Removed: method does not exist
    $labels = []; // TODO: Implement label fetching if needed
        $todo = $labels['todo']; $inprog = $labels['inprogress']; $rev = $labels['review']; $done = $labels['done'];

        return response()->json([
            'suggestions' => [
                "How many tasks are {$done}?",
                "List overdue tasks",
                "Who is the project owner?",
                "What methodology are we using?",
                "Show tasks assigned to me",
                "Move tasks in {$rev} to {$done}",
                "Delete urgent tasks",
                "Update due date for medium priority to next Friday",
                "Assign unassigned tasks to Alex",
                "Create task Implement login",
                "Set all {$inprog} tasks to {$rev}",
            ],
        ]);
    }

    /** GET /projects/{project}/assistant/test */
    public function test(Request $request, Project $project): JsonResponse
    {
        $this->authorizeView($project);
        return response()->json(['ok' => true, 'project' => $project->only(['id','name'])]);
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

        if ($user->id === (int)$project->user_id) return;

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
        if (!$user) return false;
        if ($user->id === (int)$project->user_id) return true;

        if (method_exists($project, 'members')) {
            return $project->members()->where('users.id', $user->id)->exists();
        }

        return false;
    }
}
