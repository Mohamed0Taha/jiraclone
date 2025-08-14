<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectAssistantService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class ProjectAssistantController extends Controller
{
    public function __construct(
        private ProjectAssistantService $assistantService
    ) {}

    /**
     * Send a message to the project assistant
     */
    public function chat(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $request->validate([
            'message' => 'required|string|max:1000',
            'conversation_history' => 'array|max:20',
            'conversation_history.*.role' => 'required|in:user,assistant',
            'conversation_history.*.content' => 'required|string|max:2000',
        ]);

        try {
            $response = $this->assistantService->processMessage(
                $project,
                $request->input('message'),
                $request->input('conversation_history', [])
            );

            return response()->json([
                'success' => true,
                'response' => $response,
                'timestamp' => now()->toISOString(),
            ]);
        } catch (\Exception $e) {
            Log::error('Project Assistant Error', [
                'project_id' => $project->id,
                'user_id' => $request->user()?->id,
                'message' => $request->input('message'),
                'error' => $e->getMessage(),
            ]);

            // Graceful fallback derived from project data
            $fallback = $this->assistantService->fallbackAnswer($project, (string) $request->input('message'));
            return response()->json([
                'success' => true,
                'response' => $fallback,
                'timestamp' => now()->toISOString(),
                'warning' => 'OpenAI unavailable, served deterministic summary.',
            ], 200);
        }
    }

    /**
     * Get conversation suggestions based on project context
     */
    public function suggestions(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $suggestions = [
            "What are the key deliverables for this project?",
            "Show me the project timeline and milestones",
            "What tasks are currently overdue?",
            "Who are the team members working on this project?",
            "What's the current project status?",
            "What are the main risks and challenges?",
            "Can you summarize the recent task activities?",
            "What's needed to complete the next phase?",
        ];

        return response()->json([
            'success' => true,
            'suggestions' => $suggestions,
        ]);
    }

    /**
     * Clear conversation history (if needed for privacy)
     */
    public function clearHistory(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json([
            'success' => true,
            'message' => 'Conversation history cleared successfully.',
        ]);
    }

    /**
     * Test the assistant functionality
     */
    public function test(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $result = $this->assistantService->testAssistant($project);

        return response()->json($result);
    }
}
