<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\CustomView;
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
    public function processCustomViewRequest(Project $project, string $message, ?string $sessionId = null, ?int $userId = null, string $viewName = 'default'): array
    {
        try {
            Log::debug('[ProjectViewsService] Processing custom view request', [
                'project_id' => $project->id,
                'message' => $message,
                'session_id' => $sessionId,
                'user_id' => $userId,
                'view_name' => $viewName,
            ]);

            // Check if we have an existing custom view (for update context)
            $existingView = null;
            if ($userId) {
                $existingView = CustomView::getActiveForProject($project->id, $userId, $viewName);
            }

            // Get project context
            $projectContext = $this->getProjectContext($project);
            
            // Build prompt for OpenAI with context awareness
            $prompt = $this->buildCustomViewPrompt($message, $projectContext, $existingView);
            
            // Get OpenAI response
            $aiResponse = $this->openAIService->generateCustomView($prompt);
            
            // Extract HTML and JavaScript from response
            $parsedResponse = $this->parseAIResponse($aiResponse);
            
            // Save to database if user is provided
            $customView = null;
            if ($userId) {
                $metadata = [
                    'prompt' => $message,
                    'session_id' => $sessionId,
                    'generated_at' => now()->toISOString(),
                    'is_update' => $existingView !== null,
                ];
                
                $customView = CustomView::createOrUpdate(
                    $project->id,
                    $userId,
                    $viewName,
                    $parsedResponse['html'],
                    $metadata
                );
                
                Log::info('[ProjectViewsService] Custom view saved', [
                    'custom_view_id' => $customView->id,
                    'project_id' => $project->id,
                    'user_id' => $userId,
                ]);
            }
            
            return [
                'type' => 'spa_generated',
                'message' => $existingView ? 'Updated your custom application!' : 'Generated your custom application!',
                'html' => $parsedResponse['html'],
                'javascript' => $parsedResponse['javascript'] ?? null,
                'success' => true,
                'session_id' => $sessionId,
                'custom_view_id' => $customView?->id,
                'is_update' => $existingView !== null,
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
    private function buildCustomViewPrompt(string $userRequest, array $projectContext, ?CustomView $existingView = null): string
    {
        $contextInfo = $existingView 
            ? "CONTEXT: This is an UPDATE request. The user already has a custom application and wants to modify it."
            : "CONTEXT: This is a NEW generation request. Create a fresh application.";

        $existingContent = $existingView ? "
EXISTING APPLICATION:
The user currently has this application:
```html
" . substr($existingView->html_content, 0, 2000) . "...
```
" : "";

        $prompt = "You are a helpful assistant that creates custom single-page applications (SPAs) for project management.

{$contextInfo}

USER REQUEST: {$userRequest}

{$existingContent}

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
2. Make it responsive and visually appealing with modern design
3. Use modern web technologies (HTML5, CSS3, ES6+ JavaScript)
4. If the user wants live data, use fetch() to get it from the provided endpoints
5. Include proper error handling and loading states
6. Make it functional and interactive with proper event handling
7. Use a professional color scheme and typography
8. Ensure accessibility (proper ARIA labels, semantic HTML)
9. Add CRUD functionality where applicable (forms, buttons, data management)
10. Use CSS Grid/Flexbox for layout and make it mobile-responsive

ENHANCED FEATURES:
- Add local storage persistence for user data/preferences
- Include interactive charts/graphs if relevant (using Chart.js or similar)
- Add drag & drop functionality where appropriate
- Include search/filter capabilities
- Add real-time updates if accessing live data
- Include data export functionality (CSV, JSON)
- Add keyboard shortcuts for power users
- Include tooltips and help text for better UX
- Add form validation and error handling
- Include responsive design with mobile-first approach
- Add smooth animations and transitions
- Include accessibility features (ARIA labels, keyboard navigation)

JAVASCRIPT INTERACTIVITY REQUIREMENTS:
- Use event delegation for dynamic content
- Implement proper error handling with try-catch blocks
- Add loading states and spinners for async operations
- Include data validation on forms
- Add debounced search functionality
- Implement CRUD operations with proper feedback
- Use modern ES6+ features (async/await, destructuring, etc.)
- Add keyboard shortcuts (Ctrl+S for save, Esc to close modals, etc.)
- Include proper cleanup for event listeners
- Add smooth scrolling and focus management

STYLING REQUIREMENTS:
- Use CSS Grid and Flexbox for modern layouts
- Implement a consistent color scheme with CSS custom properties
- Add hover effects and smooth transitions
- Use proper typography hierarchy
- Include responsive breakpoints for mobile/tablet/desktop
- Add shadow effects and modern visual design
- Use semantic HTML5 elements
- Include print stylesheets where relevant

DATA MANAGEMENT:
- Implement local storage for user preferences
- Add data export functionality (CSV, JSON)
- Include data import capabilities where relevant
- Add proper data validation and sanitization
- Implement undo/redo functionality where applicable
- Include auto-save functionality for forms

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

    /**
     * Get existing custom view for a project and user
     */
    public function getCustomView(Project $project, int $userId, string $viewName = 'default'): ?CustomView
    {
        $customView = CustomView::getActiveForProject($project->id, $userId, $viewName);
        
        if ($customView) {
            $customView->updateLastAccessed();
        }
        
        return $customView;
    }

    /**
     * Delete a custom view
     */
    public function deleteCustomView(Project $project, int $userId, string $viewName = 'default'): bool
    {
        $customView = CustomView::getActiveForProject($project->id, $userId, $viewName);
        
        if ($customView) {
            return $customView->delete();
        }
        
        return false;
    }

    /**
     * Get all custom views for a project and user
     */
    public function getUserCustomViews(Project $project, int $userId): array
    {
        return CustomView::where('project_id', $project->id)
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->orderBy('last_accessed_at', 'desc')
            ->get()
            ->map(function ($view) {
                return [
                    'id' => $view->id,
                    'name' => $view->name,
                    'description' => $view->description,
                    'last_accessed_at' => $view->last_accessed_at,
                    'created_at' => $view->created_at,
                    'metadata' => $view->metadata,
                ];
            })
            ->toArray();
    }
}