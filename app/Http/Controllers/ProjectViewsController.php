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

            Log::info('[ProjectViewsController] Getting custom view', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
            ]);

            $customView = $this->projectViewsService->getCustomView($project, $userId, $viewName);

            Log::info('[ProjectViewsController] Service returned:', [
                'customView' => $customView ? get_class($customView) : 'null',
                'is_array' => is_array($customView),
                'type' => gettype($customView),
                'value' => $customView, // Add full value for debugging
            ]);

            if (!$customView) {
                return response()->json([
                    'success' => false,
                    'message' => 'No custom view found'
                ]);
            }

            // Defensive programming: ensure we have a CustomView object
            if (!($customView instanceof \App\Models\CustomView)) {
                Log::error('[ProjectViewsController] Expected CustomView model, got: ' . gettype($customView));
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid custom view data structure'
                ], 500);
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
     * List project's custom views (shared across users)
     */
    public function listCustomViews(Request $request, Project $project): JsonResponse
    {
        try {
            // Check authorization
            $this->authorize('view', $project);
            
            $userId = auth()->id();
            $customViews = $this->projectViewsService->getAllCustomViews($project, $userId);

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

    /**
     * Save custom view component
     */
    public function saveCustomView(Request $request, Project $project): JsonResponse
    {
        try {
            $this->authorize('view', $project);
            
            $request->validate([
                'view_name' => 'required|string|max:255',
                'component_code' => 'required|string',
                'custom_view_id' => 'nullable|integer',
            ]);

            $viewName = $request->input('view_name');
            $componentCode = $request->input('component_code');
            $customViewId = $request->input('custom_view_id');
            $userId = auth()->id();

            // Use GenerativeUIService for saving
            $generativeUIService = app(\App\Services\GenerativeUIService::class);
            $result = $generativeUIService->saveCustomView($project, $userId, $viewName, $componentCode, $customViewId);

            return response()->json([
                'success' => true,
                'message' => 'Custom micro-application saved successfully',
                'customViewId' => $result['custom_view_id'],
                'data' => $result
            ]);

        } catch (\Exception $e) {
            Log::error('[ProjectViewsController] Error saving custom view', [
                'error' => $e->getMessage(),
                'project_id' => $project->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error saving custom view: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Save component data (for form data, user inputs, etc.)
     */
    public function saveComponentData(Request $request, Project $project): JsonResponse
    {
        try {
            \Log::info('SaveComponentData API called', [
                'project_id' => $project->id,
                'user_id' => auth()->id(),
                'request_data' => $request->all()
            ]);

            $this->authorize('view', $project);
            
            $request->validate([
                'view_name' => 'required|string|max:255',
                'data_key' => 'required|string|max:255',
                'data' => 'required',
            ]);

            $viewName = $request->input('view_name');
            $dataKey = $request->input('data_key');
            $data = $request->input('data');
            $userId = auth()->id();

            \Log::info('Calling GenerativeUIService saveComponentData', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
                'data_key' => $dataKey
            ]);

            $generativeUIService = app(\App\Services\GenerativeUIService::class);
            $result = $generativeUIService->saveComponentData($project, $userId, $viewName, $dataKey, $data);

            \Log::info('GenerativeUIService result', [
                'success' => $result['success'] ?? false,
                'message' => $result['message'] ?? 'No message'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Component data saved successfully',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            \Log::error('[ProjectViewsController] Error saving component data', [
                'error' => $e->getMessage(),
                'project_id' => $project->id,
                'user_id' => auth()->id(),
                'stack_trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error saving component data: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Load component data
     */
    public function loadComponentData(Request $request, Project $project): JsonResponse
    {
        try {
            $this->authorize('view', $project);
            
            $request->validate([
                'view_name' => 'nullable|string|max:255',
                'data_key' => 'nullable|string|max:255',
            ]);

            $viewName = $request->query('view_name', 'default');
            $dataKey = $request->query('data_key', 'default');
            $userId = auth()->id();

            $generativeUIService = app(\App\Services\GenerativeUIService::class);
            $result = $generativeUIService->loadComponentData($project, $userId, $viewName, $dataKey);

            return response()->json([
                'success' => true,
                'data' => $result
            ]);

        } catch (\Exception $e) {
            Log::error('[ProjectViewsController] Error loading component data', [
                'error' => $e->getMessage(),
                'project_id' => $project->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error loading component data: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function pinMicroApp(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $validated = $request->validate([
            'view_name' => 'required|string|max:255',
            'original_name' => 'nullable|string|max:255',
            'app_key' => 'required|string|max:255',
            'state' => 'nullable',
        ]);

        $meta = $project->meta ?? [];
        $pins = $meta['custom_view_pins'] ?? [];

        if (!empty($validated['original_name']) && $validated['original_name'] !== $validated['view_name']) {
            unset($pins[$validated['original_name']]);
        }

        $pins[$validated['view_name']] = [
            'app_key' => $validated['app_key'],
            'state' => $validated['state'] ?? null,
            'updated_at' => now()->toIso8601String(),
            'updated_by' => auth()->id(),
        ];

        $meta['custom_view_pins'] = $pins;
        $project->meta = $meta;
        $project->save();

        return response()->json([
            'success' => true,
            'message' => 'Micro app pinned successfully.',
            'pins' => $pins,
        ]);
    }

    public function unpinMicroApp(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $validated = $request->validate([
            'view_name' => 'required|string|max:255',
            'original_name' => 'nullable|string|max:255',
        ]);

        $meta = $project->meta ?? [];
        $pins = $meta['custom_view_pins'] ?? [];

        $keysToRemove = array_unique(array_filter([
            $validated['view_name'],
            $validated['original_name'] ?? null,
        ]));

        $changed = false;
        foreach ($keysToRemove as $key) {
            if (array_key_exists($key, $pins)) {
                unset($pins[$key]);
                $changed = true;
            }
        }

        if ($changed) {
            $meta['custom_view_pins'] = $pins;
            $project->meta = $meta;
            $project->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Micro app unpinned successfully.',
            'pins' => $pins,
        ]);
    }
}
