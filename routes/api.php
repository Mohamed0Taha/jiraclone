<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;
use App\Models\Project;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Test endpoint
Route::get('/test-dashboard', function () {
    return response()->json([
        'success' => true,
        'message' => 'Dashboard API is working',
        'timestamp' => now()->toISOString(),
    ]);
});

// Dashboard Chat API - LLM Integration
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/dashboard/chat', [DashboardChatController::class, 'chat']);
});

// Project Data API
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/project/{id}/tasks', [ProjectDataController::class, 'getTasks']);
    Route::get('/project/{id}/dashboard-data', [ProjectDataController::class, 'getDashboardData']);
});

// Custom Views API - Properly separated from web routes to avoid Inertia middleware interference
// Using web authentication since the frontend uses session-based auth
Route::middleware(['auth'])->prefix('projects/{project}')->group(function () {
    // Get existing custom view
    Route::get('/custom-views/get', function (Request $request, Project $project) {
        try {
            // Ensure user has access to the project
            if (!$request->user()->can('view', $project)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to project',
                ], 403);
            }

            $viewName = $request->query('view_name', 'default');
            $userId = $request->user()->id;
            
            $projectViewsService = app(\App\Services\ProjectViewsService::class);
            $customView = $projectViewsService->getCustomView($project, $userId, $viewName);
            
            if ($customView) {
                return response()->json([
                    'success' => true,
                    'html' => $customView->html_content,
                    'custom_view_id' => $customView->id,
                ], 200, [
                    'Content-Type' => 'application/json',
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'No custom view found',
                ], 200, [
                    'Content-Type' => 'application/json',
                ]);
            }
        } catch (\Exception $e) {
            Log::error('API Custom view load error', [
                'project_id' => $project->id,
                'user_id' => $request->user()->id ?? null,
                'view_name' => $request->query('view_name', 'default'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error loading custom view: ' . $e->getMessage(),
            ], 500, [
                'Content-Type' => 'application/json',
            ]);
        }
    });

    // Delete custom view
    Route::delete('/custom-views/delete', function (Request $request, Project $project) {
        try {
            // Ensure user has access to the project
            if (!$request->user()->can('view', $project)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to project',
                ], 403);
            }

            $viewName = $request->query('view_name', 'default');
            $userId = $request->user()->id;
            
            $projectViewsService = app(\App\Services\ProjectViewsService::class);
            $deleted = $projectViewsService->deleteCustomView($project, $userId, $viewName);
            
            return response()->json([
                'success' => $deleted,
                'message' => $deleted ? 'Custom view deleted successfully' : 'Custom view not found',
            ], 200, [
                'Content-Type' => 'application/json',
            ]);
        } catch (\Exception $e) {
            Log::error('API Custom view delete error', [
                'project_id' => $project->id,
                'user_id' => $request->user()->id ?? null,
                'view_name' => $request->query('view_name', 'default'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error deleting custom view: ' . $e->getMessage(),
            ], 500, [
                'Content-Type' => 'application/json',
            ]);
        }
    });

    // Custom view SPA generation chat
    Route::post('/custom-views/chat', function (Request $request, Project $project) {
        try {
            // Ensure user has access to the project
            if (!$request->user()->can('view', $project)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access to project',
                ], 403);
            }

            $userId = $request->user()->id;
            $message = $request->input('message', '');
            $conversationHistory = $request->input('conversation_history', []);
            
            if (empty($message)) {
                return response()->json([
                    'type' => 'error',
                    'message' => 'Message cannot be empty.',
                    'success' => false,
                ], 400, [
                    'Content-Type' => 'application/json',
                ]);
            }
            
            $projectViewsService = app(\App\Services\ProjectViewsService::class);
            $response = $projectViewsService->processCustomViewRequest(
                $project, 
                $message, 
                null, // sessionId
                $userId,
                'default' // viewName
            );
            
            return response()->json($response, 200, [
                'Content-Type' => 'application/json',
            ]);
        } catch (\Exception $e) {
            Log::error('API Custom view chat error', [
                'project_id' => $project->id,
                'user_id' => $request->user()->id ?? null,
                'message' => $request->input('message', ''),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'type' => 'error',
                'message' => 'I encountered an error generating your custom application. Please try again with a different request.',
                'success' => false,
            ], 500, [
                'Content-Type' => 'application/json',
            ]);
        }
    });
});
