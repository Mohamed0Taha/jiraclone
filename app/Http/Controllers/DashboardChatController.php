<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use OpenAI\Laravel\Facades\OpenAI;

class DashboardChatController extends Controller
{
    /**
     * Handle chat messages for dynamic view generation
     */
    public function chat(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'message' => 'required|string|max:1000',
                'endpoint' => 'required|url',
                'context' => 'nullable|array',
            ]);

            $message = $request->input('message');
            $endpoint = $request->input('endpoint');
            $context = $request->input('context', []);

            // Create system prompt for dynamic view generation
            $systemPrompt = $this->buildSystemPrompt($endpoint, $context);

            // Call OpenAI API
            $response = OpenAI::chat()->create([
                'model' => 'gpt-3.5-turbo',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $systemPrompt
                    ],
                    [
                        'role' => 'user',
                        'content' => $message
                    ]
                ],
                'max_tokens' => 1500,
                'temperature' => 0.7,
            ]);

            $reply = $response->choices[0]->message->content;

            // Try to extract view configuration if present
            $viewConfig = $this->extractViewConfig($reply);

            return response()->json([
                'success' => true,
                'message' => $reply,
                'view_config' => $viewConfig,
                'endpoint' => $endpoint,
                'timestamp' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to process chat message',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Build system prompt for the LLM
     */
    private function buildSystemPrompt(string $endpoint, array $context): string
    {
        return "You are an AI assistant that helps users create dynamic views for project management data.

CONTEXT:
- You have access to project data via this API endpoint: {$endpoint}
- The endpoint returns JSON data with project information, tasks, and metadata
- Users can ask you to create different views or analyses of this data

CAPABILITIES:
1. Analyze project data from the provided endpoint
2. Create custom views (charts, tables, dashboards)
3. Generate insights and reports
4. Suggest data visualizations
5. Help with filtering and organizing data

RESPONSE FORMAT:
When creating a view, structure your response as follows:
1. A natural language explanation of what you're creating
2. If generating a view config, include a JSON block with this structure:
```json
{
  \"type\": \"chart|table|dashboard|custom\",
  \"title\": \"View Title\",
  \"description\": \"Brief description\",
  \"config\": {
    \"dataSource\": \"endpoint_url\",
    \"visualization\": \"specific_chart_type\",
    \"filters\": {},
    \"groupBy\": \"field_name\",
    \"sortBy\": \"field_name\",
    \"limit\": 10
  }
}
```

GUIDELINES:
- Always reference the actual endpoint for data fetching
- Suggest specific visualizations based on the data structure
- Keep responses helpful and actionable
- Ask clarifying questions when needed

Additional context provided: " . json_encode($context);
    }

    /**
     * Extract view configuration from LLM response
     */
    private function extractViewConfig(string $response): ?array
    {
        // Look for JSON blocks in the response
        if (preg_match('/```json\s*(.*?)\s*```/s', $response, $matches)) {
            try {
                $config = json_decode($matches[1], true);
                if (json_last_error() === JSON_ERROR_NONE && isset($config['type'])) {
                    return $config;
                }
            } catch (\Exception $e) {
                // Invalid JSON, return null
            }
        }
        
        return null;
    }
}