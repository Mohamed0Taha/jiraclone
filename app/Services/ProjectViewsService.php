<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class ProjectViewsService
{
    private OpenAIService $openAIService;

    public function __construct(OpenAIService $openAIService)
    {
        $this->openAIService = $openAIService;
    }

    /**
     * Process custom view request and generate SPA
     */
    public function processCustomViewRequest(Project $project, string $message, ?string $sessionId = null): array
    {
        try {
            Log::debug('[ProjectViewsService] Processing custom view request', [
                'project_id' => $project->id,
                'message' => $message,
                'session_id' => $sessionId,
            ]);

            // Get project context
            $projectContext = $this->getProjectContext($project);
            
            // Build prompt for OpenAI
            $prompt = $this->buildCustomViewPrompt($message, $projectContext);
            
            // Get OpenAI response
            $aiResponse = $this->openAIService->generateCustomView($prompt);
            
            // Extract HTML and JavaScript from response
            $parsedResponse = $this->parseAIResponse($aiResponse);
            
            return [
                'type' => 'spa_generated',
                'message' => 'Generated custom SPA application',
                'html' => $parsedResponse['html'],
                'javascript' => $parsedResponse['javascript'] ?? null,
                'success' => true,
                'session_id' => $sessionId,
            ];

        } catch (\Exception $e) {
            Log::error('[ProjectViewsService] Error processing request', [
                'error' => $e->getMessage(),
                'project_id' => $project->id,
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'type' => 'error',
                'message' => 'I encountered an error generating your custom application. Please try again with a different request.',
                'html' => null,
                'success' => false,
            ];
        }
    }

    /**
     * Get project and tasks data for context
     */
    private function getProjectContext(Project $project): array
    {
        // Get project basic info
        $projectData = [
            'id' => $project->id,
            'name' => $project->name,
            'description' => $project->description,
            'start_date' => $project->start_date,
            'end_date' => $project->end_date,
            'meta' => $project->meta ?? [],
        ];

        // Get tasks data
        $tasks = Task::where('project_id', $project->id)
            ->with(['creator:id,name', 'assignee:id,name'])
            ->get()
            ->map(function ($task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'start_date' => $task->start_date,
                    'end_date' => $task->end_date,
                    'creator' => $task->creator ? $task->creator->name : null,
                    'assignee' => $task->assignee ? $task->assignee->name : null,
                    'milestone' => $task->milestone ?? false,
                ];
            })
            ->toArray();

        // Get project members
        $members = $project->members()
            ->select('users.id', 'users.name', 'users.email')
            ->get()
            ->toArray();

        return [
            'project' => $projectData,
            'tasks' => $tasks,
            'members' => $members,
            'task_count' => count($tasks),
            'tasks_by_status' => collect($tasks)->groupBy('status')->map->count()->toArray(),
        ];
    }

    /**
     * Build prompt for OpenAI to generate custom SPA
     */
    private function buildCustomViewPrompt(string $userRequest, array $projectContext): string
    {
        $prompt = "You are a helpful assistant that creates custom single-page applications (SPAs) for project management.

USER REQUEST: {$userRequest}

PROJECT CONTEXT:
- Project Name: {$projectContext['project']['name']}
- Project Description: {$projectContext['project']['description']}
- Total Tasks: {$projectContext['task_count']}
- Team Members: " . json_encode(array_column($projectContext['members'], 'name')) . "

AVAILABLE DATA:
You have access to live project data through these endpoints (you can use fetch() to get live data):
- Tasks: /projects/{$projectContext['project']['id']}/tasks (returns task data)
- Project info: /projects/{$projectContext['project']['id']} (returns project data)

TASK DATA STRUCTURE:
Each task has: id, title, description, status (todo/inprogress/review/done), priority (low/medium/high/urgent), start_date, end_date, creator, assignee, milestone

REQUIREMENTS:
1. Create a complete HTML structure with embedded CSS and JavaScript
2. Make it responsive and visually appealing
3. Use modern web technologies (HTML5, CSS3, ES6+ JavaScript)
4. If the user wants live data, use fetch() to get it from the provided endpoints
5. Include proper error handling and loading states
6. Make it functional and interactive
7. Use a professional color scheme and typography
8. Ensure accessibility (proper ARIA labels, semantic HTML)

RESPONSE FORMAT:
Return ONLY the complete HTML code including <style> and <script> tags. Do not include any explanations or markdown formatting.

EXAMPLES OF WHAT YOU CAN CREATE:
- Expense tracker with categorization and charts
- Vendor/contact phonebook with search and filtering
- Project wiki with editable sections
- Task analytics dashboard with charts
- Team workload overview
- Milestone timeline visualization
- Budget tracking with expense categories
- Time tracking interface
- Resource allocation planner
- Risk assessment tracker

Create a complete, functional application based on the user's request.";

        return $prompt;
    }

    /**
     * Parse AI response to extract HTML and JavaScript
     */
    private function parseAIResponse(string $response): array
    {
        // Clean up the response - remove markdown formatting if present
        $response = preg_replace('/```html\s*/i', '', $response);
        $response = preg_replace('/```\s*$/', '', $response);
        $response = trim($response);

        // Ensure we have valid HTML
        if (!str_contains(strtolower($response), '<html>') && !str_contains(strtolower($response), '<!doctype')) {
            // Wrap in basic HTML structure if not present
            $response = "<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Custom Application</title>
</head>
<body>
{$response}
</body>
</html>";
        }

        return [
            'html' => $response,
            'javascript' => null, // JavaScript will be embedded in HTML
        ];
    }
}