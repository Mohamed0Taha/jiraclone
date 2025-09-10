<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

class LLMDashboardService
{
    protected string $apiKey;
    protected string $apiUrl;
    protected string $model;

    public function __construct()
    {
        $this->apiKey = config('openai.api_key', env('OPENAI_API_KEY'));
        $this->apiUrl = config('openai.api_url', 'https://api.openai.com/v1/chat/completions');
        $this->model = config('openai.model', 'gpt-3.5-turbo');
    }

    /**
     * Generate a dashboard specification based on user prompt and project data
     */
    public function generateDashboardSpec(string $userPrompt, array $projectData = []): array
    {
        try {
            $systemPrompt = $this->buildSystemPrompt($projectData);
            
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json'
            ])->timeout(30)->post($this->apiUrl, [
                'model' => $this->model,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $systemPrompt
                    ],
                    [
                        'role' => 'user',
                        'content' => $userPrompt
                    ]
                ],
                'temperature' => 0.3,
                'max_tokens' => 2000
            ]);

            if (!$response->successful()) {
                throw new \Exception('LLM API request failed: ' . $response->body());
            }

            $responseData = $response->json();
            $dashboardSpec = $this->parseLLMResponse($responseData);

            return [
                'success' => true,
                'dashboard_spec' => $dashboardSpec,
                'metadata' => [
                    'model_used' => $this->model,
                    'prompt_tokens' => $responseData['usage']['prompt_tokens'] ?? 0,
                    'completion_tokens' => $responseData['usage']['completion_tokens'] ?? 0,
                    'total_tokens' => $responseData['usage']['total_tokens'] ?? 0
                ]
            ];

        } catch (\Exception $e) {
            Log::error('LLM Dashboard Service Error', [
                'error' => $e->getMessage(),
                'user_prompt' => $userPrompt
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'fallback_spec' => $this->getFallbackDashboardSpec()
            ];
        }
    }

    private function buildSystemPrompt(array $projectData): string
    {
        $basePrompt = "You are a dashboard generation AI. Your job is to create JSON specifications for dashboards based on user requests and available project data.

AVAILABLE DATA STRUCTURE:
";

        if (!empty($projectData)) {
            $basePrompt .= "Project Data Available:\n";
            $basePrompt .= "- Tasks: " . count($projectData['tasks'] ?? []) . " total\n";
            $basePrompt .= "- Analytics: task status, priority distribution, assignee workload\n";
            $basePrompt .= "- Trends: completion trends, overdue tasks, recent activity\n\n";
        }

        $basePrompt .= "RESPONSE FORMAT:
You must respond with ONLY a valid JSON object that follows this exact structure:

{
  \"dashboard\": {
    \"title\": \"Dashboard Title\",
    \"description\": \"Brief description\",
    \"layout\": {
      \"columns\": 2,
      \"rows\": 3
    },
    \"widgets\": [
      {
        \"id\": \"widget_1\",
        \"type\": \"chart\",
        \"title\": \"Widget Title\",
        \"position\": { \"row\": 1, \"col\": 1, \"span\": { \"rows\": 1, \"cols\": 1 } },
        \"config\": {
          \"chart_type\": \"bar|line|pie|doughnut|scatter\",
          \"data_source\": \"tasks|analytics|trends\",
          \"data_field\": \"specific_field_name\",
          \"options\": {}
        }
      }
    ],
    \"filters\": [
      {
        \"id\": \"filter_1\",
        \"type\": \"select|date|text\",
        \"label\": \"Filter Label\",
        \"field\": \"field_name\",
        \"options\": []
      }
    ]
  }
}

WIDGET TYPES:
- chart: Bar, line, pie, doughnut, scatter charts
- metric: Single number displays
- table: Data tables with sorting/filtering
- progress: Progress bars and completion indicators
- timeline: Activity timelines
- heatmap: Calendar/grid heatmaps

CHART TYPES:
- bar: For comparing categories
- line: For trends over time
- pie/doughnut: For parts of a whole
- scatter: For correlations

Always include practical, useful widgets based on the user's request and available data.";

        return $basePrompt;
    }

    private function parseLLMResponse(array $responseData): array
    {
        $content = $responseData['choices'][0]['message']['content'] ?? '';
        
        // Clean up the response (remove markdown code blocks if present)
        $content = preg_replace('/```json\s*/', '', $content);
        $content = preg_replace('/```\s*$/', '', $content);
        $content = trim($content);

        try {
            $decoded = json_decode($content, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception('Invalid JSON in LLM response: ' . json_last_error_msg());
            }

            // Validate the dashboard structure
            if (!isset($decoded['dashboard'])) {
                throw new \Exception('Missing dashboard key in LLM response');
            }

            $dashboard = $decoded['dashboard'];
            
            // Ensure required fields
            if (!isset($dashboard['title']) || !isset($dashboard['widgets'])) {
                throw new \Exception('Missing required dashboard fields (title, widgets)');
            }

            // Validate widgets
            foreach ($dashboard['widgets'] as $widget) {
                if (!isset($widget['id'], $widget['type'], $widget['title'])) {
                    throw new \Exception('Invalid widget structure');
                }
            }

            return $dashboard;

        } catch (\Exception $e) {
            Log::warning('Failed to parse LLM response', [
                'error' => $e->getMessage(),
                'raw_content' => $content
            ]);
            
            return $this->getFallbackDashboardSpec();
        }
    }

    private function getFallbackDashboardSpec(): array
    {
        return [
            'title' => 'Project Overview',
            'description' => 'Basic project dashboard',
            'layout' => [
                'columns' => 2,
                'rows' => 2
            ],
            'widgets' => [
                [
                    'id' => 'task_status',
                    'type' => 'chart',
                    'title' => 'Task Status Distribution',
                    'position' => ['row' => 1, 'col' => 1, 'span' => ['rows' => 1, 'cols' => 1]],
                    'config' => [
                        'chart_type' => 'doughnut',
                        'data_source' => 'analytics',
                        'data_field' => 'task_status_distribution'
                    ]
                ],
                [
                    'id' => 'priority_breakdown',
                    'type' => 'chart',
                    'title' => 'Priority Breakdown',
                    'position' => ['row' => 1, 'col' => 2, 'span' => ['rows' => 1, 'cols' => 1]],
                    'config' => [
                        'chart_type' => 'bar',
                        'data_source' => 'analytics',
                        'data_field' => 'priority_distribution'
                    ]
                ],
                [
                    'id' => 'recent_activity',
                    'type' => 'table',
                    'title' => 'Recent Activity',
                    'position' => ['row' => 2, 'col' => 1, 'span' => ['rows' => 1, 'cols' => 2]],
                    'config' => [
                        'data_source' => 'analytics',
                        'data_field' => 'recent_activity'
                    ]
                ]
            ],
            'filters' => []
        ];
    }

    /**
     * Validate a dashboard specification
     */
    public function validateDashboardSpec(array $spec): array
    {
        $errors = [];

        if (!isset($spec['title'])) {
            $errors[] = 'Dashboard title is required';
        }

        if (!isset($spec['widgets']) || !is_array($spec['widgets'])) {
            $errors[] = 'Dashboard must have widgets array';
        } else {
            foreach ($spec['widgets'] as $index => $widget) {
                if (!isset($widget['id'])) {
                    $errors[] = "Widget at index {$index} missing id";
                }
                if (!isset($widget['type'])) {
                    $errors[] = "Widget at index {$index} missing type";
                }
                if (!isset($widget['title'])) {
                    $errors[] = "Widget at index {$index} missing title";
                }
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
}
