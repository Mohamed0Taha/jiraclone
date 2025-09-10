<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectViewsService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProjectViewsController extends Controller
{
    use AuthorizesRequests;
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
            // Check authorization
            $this->authorize('view', $project);
            
            $request->validate([
                'message' => 'required|string|max:2000',
                'session_id' => 'nullable|string',
                'view_name' => 'nullable|string|max:255',
            ]);

            $viewName = $request->input('view_name', 'default');
            $userId = auth()->id();

            Log::info('[ProjectViewsController] Processing custom view chat', [
                'project_id' => $project->id,
                'message' => $request->input('message'),
                'user_id' => $userId,
                'view_name' => $viewName,
            ]);

            // Process the message through ProjectViewsService
            $response = $this->projectViewsService->processCustomViewRequest(
                $project,
                $request->input('message'),
                $request->input('session_id'),
                $userId,
                $viewName
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
            // Check authorization
            $this->authorize('view', $project);
            
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

    /**
     * Get existing custom view
     */
    public function getCustomView(Request $request, Project $project): JsonResponse
    {
        try {
            // Check authorization
            $this->authorize('view', $project);
            
            $request->validate([
                'view_name' => 'nullable|string|max:255',
            ]);

            $viewName = $request->input('view_name', 'default');
            $userId = auth()->id();

            $customView = $this->projectViewsService->getCustomView($project, $userId, $viewName);

            if (!$customView) {
                return response()->json([
                    'type' => 'empty',
                    'message' => 'No custom view found.',
                    'html' => null,
                    'success' => true,
                ]);
            }

            return response()->json([
                'type' => 'custom_view_loaded',
                'message' => 'Custom view loaded successfully.',
                'html' => $customView->html_content,
                'custom_view_id' => $customView->id,
                'metadata' => $customView->metadata,
                'success' => true,
            ]);

        } catch (\Exception $e) {
            Log::error('[ProjectViewsController] Error getting custom view', [
                'error' => $e->getMessage(),
                'project_id' => $project->id,
            ]);

            return response()->json([
                'type' => 'error',
                'message' => 'Failed to load custom view.',
                'success' => false,
            ], 500);
        }
    }

    /**
     * Delete custom view
     */
    public function deleteCustomView(Request $request, Project $project): JsonResponse
    {
        try {
            // Check authorization
            $this->authorize('view', $project);
            
            $request->validate([
                'view_name' => 'nullable|string|max:255',
            ]);

            $viewName = $request->input('view_name', 'default');
            $userId = auth()->id();

            $deleted = $this->projectViewsService->deleteCustomView($project, $userId, $viewName);

            if ($deleted) {
                return response()->json([
                    'type' => 'success',
                    'message' => 'Custom view deleted successfully.',
                    'success' => true,
                ]);
            } else {
                return response()->json([
                    'type' => 'error',
                    'message' => 'Custom view not found.',
                    'success' => false,
                ], 404);
            }

        } catch (\Exception $e) {
            Log::error('[ProjectViewsController] Error deleting custom view', [
                'error' => $e->getMessage(),
                'project_id' => $project->id,
            ]);

            return response()->json([
                'type' => 'error',
                'message' => 'Failed to delete custom view.',
                'success' => false,
            ], 500);
        }
    }

    /**
     * List user's custom views
     */
    public function listCustomViews(Request $request, Project $project): JsonResponse
    {
        try {
            // Check authorization
            $this->authorize('view', $project);
            
            $userId = auth()->id();
            $customViews = $this->projectViewsService->getUserCustomViews($project, $userId);

            return response()->json([
                'type' => 'success',
                'custom_views' => $customViews,
                'success' => true,
            ]);

        } catch (\Exception $e) {
            Log::error('[ProjectViewsController] Error listing custom views', [
                'error' => $e->getMessage(),
                'project_id' => $project->id,
            ]);

            return response()->json([
                'type' => 'error',
                'message' => 'Failed to list custom views.',
                'success' => false,
            ], 500);
        }
    }
}