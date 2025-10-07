<?php

namespace App\Services;

use App\Models\Project;
use App\Models\OpenAiRequest;
use Exception;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * OpenAI Assistants API Service
 * 
 * Manages persistent AI assistants for projects that can:
 * - Remember conversation history
 * - Access project files and data
 * - Execute tools/functions
 * - Provide contextual project assistance
 */
class OpenAIAssistantService
{
    private OpenAIService $openAIService;

    public function __construct(OpenAIService $openAIService)
    {
        $this->openAIService = $openAIService;
    }

    private function apiKey(): string
    {
        return (string) (config('openai.api_key') ?: env('OPENAI_API_KEY', ''));
    }

    private function baseUri(): string
    {
        return rtrim((string) (config('openai.base_uri') ?: env('OPENAI_BASE_URL', 'https://api.openai.com/v1')), '/');
    }

    /**
     * Create a project-specific assistant
     */
    public function createProjectAssistant(Project $project): array
    {
        $apiKey = $this->apiKey();
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        try {
            $res = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
                'OpenAI-Beta' => 'assistants=v2'
            ])->post($this->baseUri() . '/assistants', [
                'model' => 'gpt-4o',
                'name' => "TaskPilot Assistant for " . $project->name,
                'description' => "AI assistant for project: {$project->name}. Helps with task management, project planning, and team collaboration.",
                'instructions' => $this->buildProjectInstructions($project),
                'tools' => [
                    ['type' => 'code_interpreter'],
                    ['type' => 'file_search'],
                    [
                        'type' => 'function',
                        'function' => [
                            'name' => 'create_task',
                            'description' => 'Create a new task in the project',
                            'parameters' => [
                                'type' => 'object',
                                'properties' => [
                                    'title' => ['type' => 'string', 'description' => 'Task title'],
                                    'description' => ['type' => 'string', 'description' => 'Task description'],
                                    'priority' => ['type' => 'string', 'enum' => ['low', 'medium', 'high']],
                                    'assignee_id' => ['type' => 'integer', 'description' => 'User ID to assign task to']
                                ],
                                'required' => ['title']
                            ]
                        ]
                    ],
                    [
                        'type' => 'function',
                        'function' => [
                            'name' => 'update_task_status',
                            'description' => 'Update task status',
                            'parameters' => [
                                'type' => 'object',
                                'properties' => [
                                    'task_id' => ['type' => 'integer', 'description' => 'Task ID'],
                                    'status' => ['type' => 'string', 'enum' => ['todo', 'inprogress', 'review', 'done']]
                                ],
                                'required' => ['task_id', 'status']
                            ]
                        ]
                    ],
                    [
                        'type' => 'function',
                        'function' => [
                            'name' => 'get_project_analytics',
                            'description' => 'Get project progress and analytics',
                            'parameters' => [
                                'type' => 'object',
                                'properties' => [
                                    'timeframe' => ['type' => 'string', 'enum' => ['week', 'month', 'quarter']]
                                ]
                            ]
                        ]
                    ],
                    [
                        'type' => 'function',
                        'function' => [
                            'name' => 'search_project_data',
                            'description' => 'Search through project tasks, comments, and files',
                            'parameters' => [
                                'type' => 'object',
                                'properties' => [
                                    'query' => ['type' => 'string', 'description' => 'Search query'],
                                    'type' => ['type' => 'string', 'enum' => ['tasks', 'comments', 'files', 'all']]
                                ],
                                'required' => ['query']
                            ]
                        ]
                    ]
                ],
                'temperature' => 0.1,
                'top_p' => 0.1
            ]);

            if (!$res->ok()) {
                Log::error('Failed to create OpenAI assistant', [
                    'status' => $res->status(),
                    'body' => $res->body(),
                    'project_id' => $project->id
                ]);
                throw new Exception('Failed to create assistant: ' . $res->body());
            }

            $assistant = $res->json();

            // Store assistant ID in project metadata
            $project->update([
                'metadata' => array_merge($project->metadata ?? [], [
                    'openai_assistant_id' => $assistant['id'],
                    'assistant_created_at' => now()->toISOString()
                ])
            ]);

            Log::info('Created OpenAI assistant for project', [
                'project_id' => $project->id,
                'assistant_id' => $assistant['id']
            ]);

            return $assistant;

        } catch (Exception $e) {
            Log::error('Error creating OpenAI assistant', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Create a conversation thread
     */
    public function createThread(array $messages = []): array
    {
        $apiKey = $this->apiKey();
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        try {
            $payload = ['messages' => $messages];

            $res = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
                'OpenAI-Beta' => 'assistants=v2'
            ])->post($this->baseUri() . '/threads', $payload);

            if (!$res->ok()) {
                throw new Exception('Failed to create thread: ' . $res->body());
            }

            return $res->json();

        } catch (Exception $e) {
            Log::error('Error creating OpenAI thread', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Add message to thread and run assistant
     */
    public function chatWithAssistant(string $threadId, string $assistantId, string $message): array
    {
        $apiKey = $this->apiKey();
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        $userId = Auth::id();

        try {
            // Add message to thread
            Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
                'OpenAI-Beta' => 'assistants=v2'
            ])->post($this->baseUri() . "/threads/{$threadId}/messages", [
                'role' => 'user',
                'content' => $message
            ]);

            // Create and run the assistant
            $runRes = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
                'OpenAI-Beta' => 'assistants=v2'
            ])->post($this->baseUri() . "/threads/{$threadId}/runs", [
                'assistant_id' => $assistantId,
                'instructions' => 'Please provide helpful, actionable responses based on the project context.'
            ]);

            if (!$runRes->ok()) {
                throw new Exception('Failed to run assistant: ' . $runRes->body());
            }

            $run = $runRes->json();
            $runId = $run['id'];

            // Poll for completion
            $maxAttempts = 30; // 30 seconds max
            $attempt = 0;

            while ($attempt < $maxAttempts) {
                sleep(1);
                $attempt++;

                $statusRes = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $apiKey,
                    'OpenAI-Beta' => 'assistants=v2'
                ])->get($this->baseUri() . "/threads/{$threadId}/runs/{$runId}");

                if (!$statusRes->ok()) {
                    throw new Exception('Failed to get run status');
                }

                $status = $statusRes->json();

                if ($status['status'] === 'completed') {
                    // Get the assistant's response
                    $messagesRes = Http::withHeaders([
                        'Authorization' => 'Bearer ' . $apiKey,
                        'OpenAI-Beta' => 'assistants=v2'
                    ])->get($this->baseUri() . "/threads/{$threadId}/messages", [
                        'order' => 'desc',
                        'limit' => 1
                    ]);

                    if (!$messagesRes->ok()) {
                        throw new Exception('Failed to get messages');
                    }

                    $messages = $messagesRes->json();
                    $latestMessage = $messages['data'][0] ?? null;

                    if ($latestMessage && $latestMessage['role'] === 'assistant') {
                        $response = $latestMessage['content'][0]['text']['value'] ?? 'No response';

                        // Log successful interaction
                        if ($userId) {
                            OpenAiRequest::logRequest(
                                userId: $userId,
                                type: 'assistant_chat',
                                tokens: $status['usage']['total_tokens'] ?? 0,
                                cost: $this->calculateAssistantCost($status['usage']['total_tokens'] ?? 0),
                                model: 'gpt-4o-assistant',
                                prompt: $message,
                                response: substr($response, 0, 1000),
                                successful: true
                            );
                        }

                        return [
                            'response' => $response,
                            'run_id' => $runId,
                            'usage' => $status['usage'] ?? []
                        ];
                    }
                    break;

                } elseif ($status['status'] === 'requires_action') {
                    // Handle function calls
                    return $this->handleFunctionCalls($threadId, $runId, $status);

                } elseif (in_array($status['status'], ['failed', 'cancelled', 'expired'])) {
                    throw new Exception('Assistant run failed: ' . $status['status']);
                }
            }

            throw new Exception('Assistant response timeout');

        } catch (Exception $e) {
            // Log failed interaction
            if ($userId) {
                OpenAiRequest::logRequest(
                    userId: $userId,
                    type: 'assistant_chat',
                    tokens: 0,
                    cost: 0.0,
                    model: 'gpt-4o-assistant',
                    prompt: $message,
                    response: null,
                    successful: false,
                    error: $e->getMessage()
                );
            }

            Log::error('Error in assistant chat', [
                'thread_id' => $threadId,
                'assistant_id' => $assistantId,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Handle function calls from assistant
     */
    private function handleFunctionCalls(string $threadId, string $runId, array $runStatus): array
    {
        $toolCalls = $runStatus['required_action']['submit_tool_outputs']['tool_calls'] ?? [];
        $toolOutputs = [];

        foreach ($toolCalls as $toolCall) {
            $functionName = $toolCall['function']['name'];
            $arguments = json_decode($toolCall['function']['arguments'], true);

            $output = match ($functionName) {
                'create_task' => $this->executeCreateTask($arguments),
                'update_task_status' => $this->executeUpdateTaskStatus($arguments),
                'get_project_analytics' => $this->executeGetProjectAnalytics($arguments),
                'search_project_data' => $this->executeSearchProjectData($arguments),
                default => ['error' => 'Unknown function: ' . $functionName]
            };

            $toolOutputs[] = [
                'tool_call_id' => $toolCall['id'],
                'output' => json_encode($output)
            ];
        }

        // Submit tool outputs
        $apiKey = $this->apiKey();
        $res = Http::withHeaders([
            'Authorization' => 'Bearer ' . $apiKey,
            'Content-Type' => 'application/json',
            'OpenAI-Beta' => 'assistants=v2'
        ])->post($this->baseUri() . "/threads/{$threadId}/runs/{$runId}/submit_tool_outputs", [
            'tool_outputs' => $toolOutputs
        ]);

        if (!$res->ok()) {
            throw new Exception('Failed to submit tool outputs: ' . $res->body());
        }

        return ['status' => 'tool_outputs_submitted'];
    }

    // Function execution methods would go here...
    private function executeCreateTask(array $args): array
    {
        // Implementation for creating tasks
        return ['success' => true, 'message' => 'Task creation functionality would be implemented here'];
    }

    private function executeUpdateTaskStatus(array $args): array
    {
        // Implementation for updating task status
        return ['success' => true, 'message' => 'Task status update functionality would be implemented here'];
    }

    private function executeGetProjectAnalytics(array $args): array
    {
        // Implementation for project analytics
        return ['success' => true, 'message' => 'Project analytics functionality would be implemented here'];
    }

    private function executeSearchProjectData(array $args): array
    {
        // Implementation for searching project data
        return ['success' => true, 'message' => 'Project search functionality would be implemented here'];
    }

    private function buildProjectInstructions(Project $project): string
    {
        return "You are an AI assistant for the TaskPilot project management platform. You're specifically helping with project: '{$project->name}'.

Your capabilities:
- Create and manage tasks
- Update project status
- Analyze project progress
- Search through project data
- Provide project insights and recommendations

Project Context:
- Project Name: {$project->name}
- Description: {$project->description}
 - Team Size: " . $project->members()->count() . " members
- Current Status: Active

Guidelines:
- Be helpful, professional, and project-focused
- Use the available tools to interact with TaskPilot features
- Provide actionable insights and recommendations
- Keep responses concise but informative
- Always consider the project's goals and constraints";
    }

    private function calculateAssistantCost(int $tokens): float
    {
        // Assistant API pricing (approximate)
        return ($tokens / 1000) * 0.01; // $0.01 per 1K tokens
    }
}
