<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectViewsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProjectViewsController extends Controller
{
    private ProjectViewsService $projectViewsService;

    public function __construct(ProjectViewsService $projectViewsService)
    {
        $this->projectViewsService = $projectViewsService;
    }

    /**
     * Process chat message for custom views and generate SPA
     */
    public function chat(Request $request, Project $project): JsonResponse
    {
        try {
            $request->validate([
                'message' => 'required|string|max:2000',
                'session_id' => 'nullable|string',
            ]);

            Log::info('[ProjectViewsController] Processing custom view chat', [
                'project_id' => $project->id,
                'message' => $request->input('message'),
                'user_id' => auth()->id(),
            ]);

            // Process the message through ProjectViewsService
            $response = $this->projectViewsService->processCustomViewRequest(
                $project,
                $request->input('message'),
                $request->input('session_id')
            );

            return response()->json($response);

        } catch (\Exception $e) {
            Log::error('[ProjectViewsController] Error processing chat', [
                'error' => $e->getMessage(),
                'project_id' => $project->id,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'type' => 'error',
                'message' => 'I encountered an error processing your request. Please try again.',
                'html' => null,
                'success' => false,
            ], 500);
        }
    }

    /**
     * Clear the working area content
     */
    public function clearWorkingArea(Request $request, Project $project): JsonResponse
    {
        try {
            Log::info('[ProjectViewsController] Clearing working area', [
                'project_id' => $project->id,
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'type' => 'success',
                'message' => 'Working area cleared successfully.',
                'success' => true,
            ]);

        } catch (\Exception $e) {
            Log::error('[ProjectViewsController] Error clearing working area', [
                'error' => $e->getMessage(),
                'project_id' => $project->id,
            ]);

            return response()->json([
                'type' => 'error',
                'message' => 'Failed to clear working area.',
                'success' => false,
            ], 500);
        }
    }
}