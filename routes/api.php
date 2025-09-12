<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;
use App\Models\Project;
use App\Services\GenerativeUIService;
use App\Services\OpenAIService;

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

// AI SDK compatible chat route for SPA generation
Route::middleware('auth:sanctum')->post('/chat', function (Request $request) {
    try {
        $messages = $request->input('messages', []);
        
        // Extract project context from request body (sent by useChat body parameter)
        $projectId = $request->input('projectId') ?? null;
        $viewName = $request->input('viewName') ?? 'default';
        $currentComponentCode = $request->input('currentComponentCode') ?? null;
        $projectContext = $request->input('projectContext') ?? null;
        
        if (!$projectId) {
            return response()->json(['error' => 'Project ID is required'], 400);
        }
        
        $project = Project::find($projectId);
        if (!$project) {
            return response()->json(['error' => 'Project not found'], 404);
        }
        
        // Get the latest user message
        $lastMessage = end($messages);
        $userMessage = $lastMessage['content'] ?? '';
        
        if (empty($userMessage)) {
            return response()->json(['error' => 'Message content is required'], 400);
        }
        
        // Build conversation history from messages array
        $conversationHistory = array_map(function($msg) {
            return [
                'role' => $msg['role'],
                'content' => $msg['content'],
                'timestamp' => $msg['timestamp'] ?? now()->toISOString()
            ];
        }, $messages);
        
        // Initialize services
        $openAIService = app(OpenAIService::class);
        $generativeUIService = new GenerativeUIService($openAIService);
        
        // Process the request
        $result = $generativeUIService->processCustomViewRequest(
            $project,
            $userMessage,
            null, // sessionId
            $request->user()->id,
            $viewName,
            $conversationHistory,
            $projectContext,
            $currentComponentCode
        );
        
        // Create the response message in AI SDK UIMessage format
        $responseMessage = [
            'id' => 'msg_' . uniqid(),
            'role' => 'assistant',
            'content' => $result['success'] ? $result['message'] : 'Failed to generate component',
            'createdAt' => now()->toISOString(),
        ];
        
        // Add custom data for successful component generation
        if ($result['success']) {
            $responseMessage['experimental_data'] = [
                'type' => 'spa_generated',
                'component_code' => $result['component_code'],
                'custom_view_id' => $result['custom_view_id'] ?? null
            ];
        }
        
        // Return as a text/plain streaming response for AI SDK compatibility
        return response()->stream(function () use ($responseMessage, $result) {
            // Send generation progress updates
            if ($result['success']) {
                // Stage 1: Analysis
                echo "data: " . json_encode([
                    'id' => 'progress_1',
                    'role' => 'assistant',
                    'content' => 'Analyzing your requirements...',
                    'createdAt' => now()->toISOString(),
                    'experimental_data' => ['generation_stage' => 1]
                ]) . "\n\n";
                
                // Stage 2: Generation
                echo "data: " . json_encode([
                    'id' => 'progress_2',
                    'role' => 'assistant',
                    'content' => 'Generating React component...',
                    'createdAt' => now()->toISOString(),
                    'experimental_data' => ['generation_stage' => 2]
                ]) . "\n\n";
                
                // Stage 3: Optimization
                echo "data: " . json_encode([
                    'id' => 'progress_3',
                    'role' => 'assistant',
                    'content' => 'Optimizing and validating...',
                    'createdAt' => now()->toISOString(),
                    'experimental_data' => ['generation_stage' => 3]
                ]) . "\n\n";
                
                // Stage 4: Final result
                echo "data: " . json_encode([
                    'id' => 'progress_4',
                    'role' => 'assistant',
                    'content' => 'Finalizing custom view...',
                    'createdAt' => now()->toISOString(),
                    'experimental_data' => ['generation_stage' => 4]
                ]) . "\n\n";
            }
            
            // Send the final response
            echo "data: " . json_encode($responseMessage) . "\n\n";
            echo "data: [DONE]\n\n";
        }, 200, [
            'Content-Type' => 'text/plain',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
        ]);
        
    } catch (\Exception $e) {
        Log::error('Chat API error', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'error' => 'Internal server error'
        ], 500);
    }
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
// Disabled for now: controller not present in repo, causes route:list to fail
// Route::middleware(['auth:sanctum'])->group(function () {
//     Route::post('/dashboard/chat', [DashboardChatController::class, 'chat']);
// });

// Project Data API
// Disabled for now: controller not present in repo, causes route:list to fail
// Route::middleware(['auth:sanctum'])->group(function () {
//     Route::get('/project/{id}/tasks', [ProjectDataController::class, 'getTasks']);
//     Route::get('/project/{id}/dashboard-data', [ProjectDataController::class, 'getDashboardData']);
// });

// Custom Views API routes moved to web.php for proper session auth
