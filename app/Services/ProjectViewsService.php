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

            // Try LLM generation; if it fails, fall back to a local template so UX still works
            $fallbackUsed = false;
            try {
                $aiResponse = $this->openAIService->generateCustomView($prompt);
                // Extract HTML and JavaScript from response
                $parsedResponse = $this->parseAIResponse($aiResponse);
            } catch (\Throwable $genEx) {
                $fallbackUsed = true;
                Log::warning('[ProjectViewsService] OpenAI generation failed, using fallback', [
                    'project_id' => $project->id,
                    'user_id' => $userId,
                    'view_name' => $viewName,
                    'error' => $genEx->getMessage(),
                ]);

                $fallbackHtml = $this->buildFallbackHtml($message, $projectContext, $existingView);
                $parsedResponse = [
                    'html' => $fallbackHtml,
                    'javascript' => null,
                ];
            }
            
            // Save to database if user is provided
            $customView = null;
            if ($userId) {
                $metadata = [
                    'prompt' => $message,
                    'session_id' => $sessionId,
                    'generated_at' => now()->toISOString(),
                    'is_update' => $existingView !== null,
                    'fallback_used' => $fallbackUsed,
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
                'message' => ($existingView ? 'Updated your custom application!' : 'Generated your custom application!') . ($fallbackUsed ? ' (local template)' : ''),
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

            // As a last resort (unexpected failure elsewhere), still return a minimal fallback so UI isn't blocked
            $html = $this->buildFallbackHtml($message ?? 'Custom app', ['project' => ['id' => $project->id, 'name' => $project->name], 'members' => [], 'tasks' => [], 'task_count' => 0], null);
            return [
                'type' => 'spa_generated',
                'message' => 'Generated a minimal application (offline fallback).',
                'html' => $html,
                'javascript' => null,
                'success' => true,
                'session_id' => $sessionId ?? null,
                'custom_view_id' => null,
                'is_update' => false,
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

        /**
         * Local fallback HTML in case LLM generation is unavailable.
         * Simple, self-contained SPA with CRUD list and optional notes.
         */
        private function buildFallbackHtml(string $userRequest, array $projectContext, ?CustomView $existingView = null): string
        {
                $projectName = e($projectContext['project']['name'] ?? 'Project');
                $title = htmlspecialchars(ucfirst($userRequest ?: 'Custom Application'), ENT_QUOTES, 'UTF-8');

                // Basic responsive SPA with a list manager and notes widget
                return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{$title} — {$projectName}</title>
    <style>
        :root { --bg:#0b1020; --panel:#121a33; --muted:#9aa4c2; --text:#e6ecff; --primary:#7c5cff; --accent:#26c6da; }
        *{box-sizing:border-box} html,body{height:100%} body{margin:0;background:linear-gradient(180deg,#0b1020,#0e1630);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji"}
        .container{max-width:1100px;margin:24px auto;padding:24px}
        .hero{background:linear-gradient(135deg,rgba(124,92,255,.15),rgba(38,198,218,.15));border:1px solid rgba(124,92,255,.25);box-shadow: 0 10px 30px rgba(0,0,0,.25);border-radius:16px;padding:24px}
        .hero h1{margin:0 0 6px 0;font-size:26px}
        .hero p{margin:0;color:var(--muted)}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
        @media (max-width:800px){.grid{grid-template-columns:1fr}}
        .card{background:var(--panel);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px}
        .card h2{margin:0 0 10px;font-size:16px;color:#cfd8ff}
        .row{display:flex;gap:8px}
        input,textarea,button{border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#0e152b;color:var(--text)}
        input,textarea{padding:10px;width:100%}
        button{padding:10px 14px;background:linear-gradient(135deg,var(--primary),#5e3df7);border:none;cursor:pointer;color:white;font-weight:600}
        button.secondary{background:#0e152b}
        .list{margin-top:10px;display:flex;flex-direction:column;gap:8px}
        .item{display:flex;align-items:center;justify-content:space-between;background:#0e152b;border:1px solid rgba(255,255,255,.08);padding:10px;border-radius:10px}
        .muted{color:var(--muted);font-size:12px}
        .pill{display:inline-block;padding:4px 8px;border-radius:999px;background:rgba(124,92,255,.15);border:1px solid rgba(124,92,255,.35);color:#cfd8ff;font-size:12px}
    </style>
    <script>
        // Minimal SPA state
        const state = {
            items: JSON.parse(localStorage.getItem('cv_items')||'[]'),
            notes: JSON.parse(localStorage.getItem('cv_notes')||'[]')
        };
        function save(){ localStorage.setItem('cv_items', JSON.stringify(state.items)); localStorage.setItem('cv_notes', JSON.stringify(state.notes)); }
        function addItem(){ const input = document.getElementById('newItem'); const v = (input.value||'').trim(); if(!v) return; state.items.push({ id: Date.now(), title: v }); input.value=''; render(); save(); }
        function delItem(id){ state.items = state.items.filter(i=>i.id!==id); render(); save(); }
        function addNote(){ const ta = document.getElementById('newNote'); const v = (ta.value||'').trim(); if(!v) return; state.notes.push({ id: Date.now(), text: v }); ta.value=''; render(); save(); }
        function delNote(id){ state.notes = state.notes.filter(n=>n.id!==id); render(); save(); }
        function exportJSON(){
            const blob = new Blob([JSON.stringify({items:state.items, notes:state.notes}, null, 2)], {type:'application/json'});
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='custom-view-data.json'; a.click(); URL.revokeObjectURL(a.href);
        }
        function render(){
            const list = document.getElementById('list'); list.innerHTML = state.items.map(i=>`<div class="item"><span>\${i.title}</span><div class="row"><button class="secondary" onclick="delItem(\${i.id})">Delete</button></div></div>`).join('') || '<div class="muted">No items yet</div>';
            const notes = document.getElementById('notes'); notes.innerHTML = state.notes.map(n=>`<div class="item"><span>\${n.text}</span><div class="row"><button class="secondary" onclick="delNote(\${n.id})">Delete</button></div></div>`).join('') || '<div class="muted">No notes yet</div>';
        }
        window.addEventListener('DOMContentLoaded', render);
    </script>
</head>
<body>
    <div class="container">
        <div class="hero">
            <h1>{$title}</h1>
            <p>Project: <span class="pill">{$projectName}</span></p>
        </div>

        <div class="grid">
            <div class="card">
                <h2>Items</h2>
                <div class="row">
                    <input id="newItem" placeholder="Add an item (e.g., 'Create wiki page')" />
                    <button onclick="addItem()">Add</button>
                </div>
                <div id="list" class="list" aria-live="polite"></div>
            </div>

            <div class="card">
                <h2>Notes</h2>
                <div class="row">
                    <textarea id="newNote" placeholder="Quick note..."></textarea>
                    <button onclick="addNote()">Save</button>
                </div>
                <div id="notes" class="list" aria-live="polite"></div>
                <div class="row" style="margin-top:8px">
                    <button class="secondary" onclick="exportJSON()">Export JSON</button>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
HTML;
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