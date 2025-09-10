<?php

namespace App\Http\Controllers;

use App\Http\Requests\DashboardChatRequest;
use App\Services\LLMDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class DashboardChatController extends Controller
{
    protected $llmService;

    public function __construct(LLMDashboardService $llmService)
    {
        $this->llmService = $llmService;
    }

    /**
     * Process user chat prompt and generate dashboard specification
     */
    public function processChat(DashboardChatRequest $request): JsonResponse
    {
        try {
            $prompt = $request->input('prompt');
            $projectId = $request->input('project_id');
            $conversationHistory = $request->input('conversation_history', []);

            Log::info('Dashboard chat request', [
                'project_id' => $projectId,
                'prompt' => $prompt,
                'history_count' => count($conversationHistory)
            ]);

            // Generate dashboard specification using LLM
            $dashboardSpec = $this->llmService->generateDashboardSpecification(
                $prompt,
                $projectId,
                $conversationHistory
            );

            return response()->json([
                'success' => true,
                'dashboard_specification' => $dashboardSpec,
                'message' => 'Dashboard specification generated successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Dashboard chat error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to generate dashboard specification',
                'details' => $e->getMessage()
            ], 500);
        }
    }
}
