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
    private ComponentLibraryService $componentLibrary;

    public function __construct(OpenAIService $openAIService, ComponentLibraryService $componentLibrary)
    {
        $this->openAIService = $openAIService;
        $this->componentLibrary = $componentLibrary;
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

            // STEP 1: Analyze the user request to determine components needed
            $analysis = $this->componentLibrary->analyzeRequest($message);
            
            Log::debug('[ProjectViewsService] Component analysis completed', [
                'components' => $analysis['components'],
                'input_types' => $analysis['input_types'],
                'output_types' => $analysis['output_types']
            ]);

            // Check if we have an existing custom view (for update context)
            $existingView = null;
            if ($userId) {
                $existingView = CustomView::getActiveForProject($project->id, $userId, $viewName);
            }

            // Get project context
            $projectContext = $this->getProjectContext($project);
            
            // STEP 2: Build enhanced prompt with component guidance
            $prompt = $this->buildEnhancedCustomViewPrompt($message, $projectContext, $analysis, $existingView);

            // Try LLM generation; if it fails, fall back to component templates
            $fallbackUsed = false;
            try {
                $aiResponse = $this->openAIService->generateCustomView($prompt);
                // Extract HTML and JavaScript from response
                $parsedResponse = $this->parseAIResponse($aiResponse);
            } catch (\Throwable $genEx) {
                $fallbackUsed = true;
                Log::warning('[ProjectViewsService] OpenAI generation failed, using component templates', [
                    'project_id' => $project->id,
                    'user_id' => $userId,
                    'view_name' => $viewName,
                    'error' => $genEx->getMessage(),
                ]);

                // STEP 3: Generate from component templates if AI fails
                $fallbackHtml = $this->buildComponentBasedFallback($message, $projectContext, $analysis, $existingView);
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
            $html = $this->buildComponentBasedFallback($message ?? 'Custom app', ['project' => ['id' => $project->id, 'name' => $project->name], 'members' => [], 'tasks' => [], 'task_count' => 0], ['components' => ['basic_form', 'data_table'], 'input_types' => ['text_input'], 'output_types' => ['data_display'], 'analysis' => 'Basic application'], null);
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
     * Build enhanced prompt for OpenAI with component guidance
     */
    private function buildEnhancedCustomViewPrompt(string $userRequest, array $projectContext, array $analysis, ?CustomView $existingView = null): string
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

        $componentGuidance = "
COMPONENT ANALYSIS:
Based on the user request, I've identified these required components:
- Components needed: " . implode(', ', $analysis['components']) . "
- Input types: " . implode(', ', $analysis['input_types']) . "
- Output types: " . implode(', ', $analysis['output_types']) . "
- Analysis: " . $analysis['analysis'] . "

IMPORTANT: You MUST include ALL the identified components and ensure they are fully functional with working JavaScript.";

        $prompt = "You are an expert web developer who creates functional, beautiful single-page applications.

{$contextInfo}

USER REQUEST: {$userRequest}

{$existingContent}

{$componentGuidance}

PROJECT CONTEXT:
- Project Name: {$projectContext['project']['name']}
- Project Description: {$projectContext['project']['description']}
- Total Tasks: {$projectContext['task_count']}
- Team Members: " . json_encode(array_column($projectContext['members'], 'name')) . "

CRITICAL REQUIREMENTS:
1. Create a complete HTML document with embedded CSS and JavaScript
2. EVERY button, form, and interactive element MUST have working JavaScript functionality
3. Use the project data context where relevant
4. Include ALL components identified in the analysis above
5. Make it responsive and visually appealing with modern design
6. Add proper error handling and loading states
7. Include accessibility features (ARIA labels, semantic HTML)
8. Add local storage persistence where appropriate
9. Include search/filter capabilities for data displays
10. Add keyboard shortcuts for power users

SPECIFIC COMPONENT REQUIREMENTS:
";

        // Add specific requirements for each component type
        foreach ($analysis['components'] as $component) {
            switch ($component) {
                case 'basic_form':
                    $prompt .= "- BASIC FORM: Must have working form submission, validation, and result display\n";
                    break;
                case 'contact_form':
                    $prompt .= "- CONTACT FORM: Must validate email, show loading states, and confirmation messages\n";
                    break;
                case 'search_form':
                    $prompt .= "- SEARCH FORM: Must filter results in real-time, support multiple filters\n";
                    break;
                case 'data_table':
                    $prompt .= "- DATA TABLE: Must have sorting, searching, pagination, and CRUD operations\n";
                    break;
                case 'calculator':
                    $prompt .= "- CALCULATOR: Must perform all arithmetic operations with proper error handling\n";
                    break;
                case 'counter':
                    $prompt .= "- COUNTER: Must increment/decrement, save state, and support presets\n";
                    break;
                case 'timer':
                    $prompt .= "- TIMER: Must start/stop/reset, show proper time format, and support presets\n";
                    break;
                case 'bar_chart':
                    $prompt .= "- CHART: Must display data visually, support updates, and be responsive\n";
                    break;
                case 'tabs':
                    $prompt .= "- TABS: Must switch content properly with smooth transitions\n";
                    break;
                case 'card_list':
                    $prompt .= "- CARD LIST: Must support adding, editing, deleting cards with search\n";
                    break;
                case 'dashboard_grid':
                    $prompt .= "- DASHBOARD: Must show stats with animations and export capability\n";
                    break;
            }
        }

        $prompt .= "
CSS REQUIREMENTS:
- Use modern CSS with custom properties (CSS variables)
- Implement responsive design with CSS Grid and Flexbox
- Add smooth transitions and hover effects
- Include loading states and success/error messages
- Use a professional color scheme

JAVASCRIPT REQUIREMENTS:
- Write clean, modern ES6+ JavaScript
- Add event listeners for ALL interactive elements
- Implement proper error handling with try-catch blocks
- Use async/await for any network requests
- Add debouncing for search inputs
- Include keyboard navigation support
- Persist data to localStorage where appropriate

ACCESSIBILITY REQUIREMENTS:
- Use semantic HTML elements
- Add ARIA labels and roles
- Ensure keyboard navigation works
- Include focus indicators
- Use proper heading hierarchy

You must respond with ONLY the complete HTML code including embedded CSS and JavaScript. No explanations, no markdown formatting - just the working HTML code.";

        return $prompt;
    }

    /**
     * Build component-based fallback when AI generation fails
     */
    private function buildComponentBasedFallback(string $userRequest, array $projectContext, array $analysis, ?CustomView $existingView = null): string
    {
        $title = $this->extractTitleFromRequest($userRequest) ?: 'Custom Application';
        
        $html = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>' . htmlspecialchars($title) . '</title>
    <style>
' . $this->getComponentLibraryCSS() . '
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>' . htmlspecialchars($title) . '</h1>
            <p>Generated for: <strong>' . htmlspecialchars($projectContext['project']['name']) . '</strong></p>
        </header>
        <main>';

        // Add each identified component
        foreach ($analysis['components'] as $component) {
            $template = $this->componentLibrary->getComponentTemplate($component);
            $html .= $this->customizeComponentTemplate($template, $userRequest, $projectContext);
        }

        $html .= '
        </main>
        <footer>
            <p><small>Built with component library • ' . count($analysis['components']) . ' components active</small></p>
        </footer>
    </div>
    
    <script>
        // Global utilities
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        function showToast(message, type = "info") {
            const toast = document.createElement("div");
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                background: ${type === "success" ? "#2ecc71" : type === "error" ? "#e74c3c" : "#3498db"};
                color: white;
                border-radius: 8px;
                z-index: 10000;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => toast.style.transform = "translateX(0)", 100);
            setTimeout(() => {
                toast.style.transform = "translateX(100%)";
                setTimeout(() => document.body.removeChild(toast), 300);
            }, 3000);
        }
        
        // Initialize components
        document.addEventListener("DOMContentLoaded", function() {
            console.log("Custom application initialized with components:", ' . json_encode($analysis['components']) . ');
            showToast("Application loaded successfully!", "success");
        });
    </script>
</body>
</html>';

        return $html;
    }

    /**
     * Customize component template with user-specific data
     */
    private function customizeComponentTemplate(string $template, string $userRequest, array $projectContext): string
    {
        $replacements = [
            '{{ FORM_TITLE }}' => $this->extractTitleFromRequest($userRequest) . ' Form',
            '{{ TABLE_TITLE }}' => $projectContext['project']['name'] . ' Data',
            '{{ CALCULATOR_TITLE }}' => 'Calculator',
            '{{ COUNTER_TITLE }}' => 'Counter',
            '{{ TIMER_TITLE }}' => 'Timer',
            '{{ CHART_TITLE }}' => $projectContext['project']['name'] . ' Analytics',
            '{{ DASHBOARD_TITLE }}' => $projectContext['project']['name'] . ' Dashboard',
            '{{ LIST_TITLE }}' => $projectContext['project']['name'] . ' Items',
            '{{ SEARCH_TITLE }}' => 'Search ' . $projectContext['project']['name'],
            '{{ FIELD1_LABEL }}' => 'Title',
            '{{ FIELD2_LABEL }}' => 'Description',
            '{{ SUBMIT_LABEL }}' => 'Submit',
            '{{ SEARCH_PLACEHOLDER }}' => 'Search...',
            '{{ OPTION1 }}' => 'Option 1',
            '{{ OPTION2 }}' => 'Option 2',
            '{{ COLUMN1 }}' => 'Name',
            '{{ COLUMN2 }}' => 'Status',
            '{{ COLUMN3 }}' => 'Date',
            '{{ TAB1_TITLE }}' => 'Overview',
            '{{ TAB2_TITLE }}' => 'Details',
            '{{ TAB3_TITLE }}' => 'Settings',
            '{{ TAB1_CONTENT }}' => 'Overview content goes here.',
            '{{ TAB2_CONTENT }}' => 'Detailed information goes here.',
            '{{ TAB3_CONTENT }}' => 'Settings and preferences go here.',
            '{{ STAT1_LABEL }}' => 'Total Tasks',
            '{{ STAT2_LABEL }}' => 'Completed',
            '{{ STAT3_LABEL }}' => 'In Progress',
            '{{ STAT4_LABEL }}' => 'Team Members'
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    /**
     * Extract title from user request
     */
    private function extractTitleFromRequest(string $request): string
    {
        // Simple heuristics to extract a title
        if (preg_match('/(?:create|build|make)\s+(?:a|an)?\s*([^.!?]+)/i', $request, $matches)) {
            return ucwords(trim($matches[1]));
        }
        
        if (preg_match('/([^.!?]+?)(?:\s+(?:app|application|tool|system))/i', $request, $matches)) {
            return ucwords(trim($matches[1]));
        }

        return 'Custom Application';
    }

    /**
     * Get component library CSS
     */
    private function getComponentLibraryCSS(): string
    {
        $cssPath = resource_path('css/component-library.css');
        if (file_exists($cssPath)) {
            return file_get_contents($cssPath);
        }
        
        // Fallback basic CSS
        return '
        :root {
            --primary-color: #3498db;
            --secondary-color: #2c3e50;
            --success-color: #2ecc71;
            --danger-color: #e74c3c;
            --border-radius: 8px;
            --box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f6fa;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: white;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
        }
        
        main > div {
            margin-bottom: 30px;
        }
        ';
    }
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
     * Determine the appropriate template type based on user request
     */
    private function determineTemplateType(string $userRequest): string
    {
        $request = strtolower($userRequest);
        
        // Analytics and reporting
        if (preg_match('/\b(analytics|dashboard|chart|graph|report|metrics|statistics|data|visualization)\b/', $request)) {
            return 'analytics';
        }
        
        // Task and project management
        if (preg_match('/\b(task|kanban|board|workflow|project|milestone|timeline|gantt)\b/', $request)) {
            return 'project_management';
        }
        
        // Financial and expense tracking
        if (preg_match('/\b(expense|budget|finance|cost|money|invoice|payment|tracker)\b/', $request)) {
            return 'expense_tracker';
        }
        
        // Contact and team management
        if (preg_match('/\b(contact|team|member|user|person|phonebook|directory)\b/', $request)) {
            return 'contact_manager';
        }
        
        // Time tracking and scheduling
        if (preg_match('/\b(time|schedule|calendar|booking|appointment|tracking)\b/', $request)) {
            return 'time_tracker';
        }
        
        // Document and knowledge management
        if (preg_match('/\b(wiki|document|knowledge|article|content|blog|note)\b/', $request)) {
            return 'document_manager';
        }
        
        // Inventory and resource management
        if (preg_match('/\b(inventory|resource|asset|equipment|stock|warehouse)\b/', $request)) {
            return 'inventory_manager';
        }
        
        // Default to general purpose application
        return 'general_purpose';
    }

    /**
     * Enhanced fallback HTML generation with intelligent template selection
     * Creates sophisticated, fully-functional SPAs with comprehensive CRUD capabilities
     */
    private function buildFallbackHtml(string $userRequest, array $projectContext, ?CustomView $existingView = null): string
    {
        $projectName = e($projectContext['project']['name'] ?? 'Project');
        $projectId = $projectContext['project']['id'] ?? 0;
        $title = htmlspecialchars(ucfirst($userRequest ?: 'Custom Application'), ENT_QUOTES, 'UTF-8');
        $templateType = $this->determineTemplateType($userRequest);
        
        // Build context data for JavaScript
        $contextData = [
            'project' => $projectContext['project'],
            'tasks' => $projectContext['tasks'] ?? [],
            'members' => $projectContext['members'] ?? [],
            'taskCount' => $projectContext['task_count'] ?? 0,
            'tasksByStatus' => $projectContext['tasks_by_status'] ?? []
        ];
        $contextJson = htmlspecialchars(json_encode($contextData), ENT_QUOTES, 'UTF-8');

        // Get template-specific content
        $templateContent = $this->getTemplateContent($templateType, $userRequest, $projectContext);

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{$title} - Advanced project management application">
    <title>{$title} — {$projectName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        {$this->getEnhancedCSS()}
    </style>
</head>
<body>
    <div id="app">
        <div class="app-header">
            <div class="header-content">
                <div class="header-left">
                    <h1 class="app-title">{$title}</h1>
                    <div class="breadcrumb">
                        <span class="project-name">{$projectName}</span>
                        <span class="separator">•</span>
                        <span class="view-type">{$templateType}</span>
                    </div>
                </div>
                <div class="header-right">
                    <button class="btn btn-secondary" onclick="appManager.toggleTheme()">
                        <span class="icon">🌙</span>
                    </button>
                    <button class="btn btn-secondary" onclick="appManager.showHelp()">
                        <span class="icon">❓</span>
                    </button>
                    <button class="btn btn-primary" onclick="appManager.exportData()">
                        <span class="icon">📁</span> Export
                    </button>
                </div>
            </div>
        </div>

        <div class="app-container">
            <div class="sidebar">
                <nav class="nav-menu">
                    <div class="nav-section">
                        <h3>Quick Actions</h3>
                        <button class="nav-item" onclick="appManager.showCreateModal()">
                            <span class="icon">➕</span> Add New
                        </button>
                        <button class="nav-item" onclick="appManager.refreshData()">
                            <span class="icon">🔄</span> Refresh
                        </button>
                        <button class="nav-item" onclick="appManager.showSearch()">
                            <span class="icon">🔍</span> Search
                        </button>
                    </div>
                    <div class="nav-section">
                        <h3>Views</h3>
                        <button class="nav-item active" onclick="appManager.switchView('main')">
                            <span class="icon">📊</span> Main View
                        </button>
                        <button class="nav-item" onclick="appManager.switchView('analytics')">
                            <span class="icon">📈</span> Analytics
                        </button>
                        <button class="nav-item" onclick="appManager.switchView('settings')">
                            <span class="icon">⚙️</span> Settings
                        </button>
                    </div>
                </nav>
                
                <div class="sidebar-footer">
                    <div class="project-stats">
                        <div class="stat">
                            <span class="stat-label">Items</span>
                            <span class="stat-value" id="total-items">0</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Active</span>
                            <span class="stat-value" id="active-items">0</span>
                        </div>
                    </div>
                </div>
            </div>

            <main class="main-content">
                {$templateContent}
            </main>
        </div>
    </div>

    <!-- Modals -->
    <div id="create-modal" class="modal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Create New Item</h2>
                <button class="close-btn" onclick="appManager.closeModal('create-modal')">&times;</button>
            </div>
            <div class="modal-body">
                <form id="create-form">
                    <div class="form-group">
                        <label for="item-title">Title</label>
                        <input type="text" id="item-title" name="title" required>
                    </div>
                    <div class="form-group">
                        <label for="item-description">Description</label>
                        <textarea id="item-description" name="description" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="item-category">Category</label>
                        <select id="item-category" name="category">
                            <option value="general">General</option>
                            <option value="task">Task</option>
                            <option value="note">Note</option>
                            <option value="expense">Expense</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="item-priority">Priority</label>
                        <select id="item-priority" name="priority">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="appManager.closeModal('create-modal')">Cancel</button>
                <button class="btn btn-primary" onclick="appManager.createItem()">Create</button>
            </div>
        </div>
    </div>

    <div id="help-modal" class="modal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Help & Shortcuts</h2>
                <button class="close-btn" onclick="appManager.closeModal('help-modal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="help-section">
                    <h3>Keyboard Shortcuts</h3>
                    <ul class="shortcut-list">
                        <li><kbd>Ctrl</kbd> + <kbd>N</kbd> - Create new item</li>
                        <li><kbd>Ctrl</kbd> + <kbd>S</kbd> - Save current work</li>
                        <li><kbd>Ctrl</kbd> + <kbd>F</kbd> - Search</li>
                        <li><kbd>Ctrl</kbd> + <kbd>E</kbd> - Export data</li>
                        <li><kbd>Esc</kbd> - Close modals</li>
                    </ul>
                </div>
                <div class="help-section">
                    <h3>Features</h3>
                    <ul>
                        <li>✨ Real-time data synchronization</li>
                        <li>💾 Auto-save functionality</li>
                        <li>📱 Mobile-responsive design</li>
                        <li>🔍 Advanced search and filtering</li>
                        <li>📊 Data visualization charts</li>
                        <li>📁 Import/Export capabilities</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <div id="notification-container"></div>

    <script>
        // Global context data
        window.PROJECT_CONTEXT = {$contextJson};
        
        {$this->getEnhancedJavaScript($templateType)}
    </script>
</body>
</html>
HTML;
    }

    /**
     * Get template-specific content based on template type
     */
    private function getTemplateContent(string $templateType, string $userRequest, array $projectContext): string
    {
        switch ($templateType) {
            case 'analytics':
                return $this->getAnalyticsTemplate($projectContext);
            case 'expense_tracker':
                return $this->getExpenseTrackerTemplate($projectContext);
            case 'contact_manager':
                return $this->getContactManagerTemplate($projectContext);
            case 'time_tracker':
                return $this->getTimeTrackerTemplate($projectContext);
            case 'document_manager':
                return $this->getDocumentManagerTemplate($projectContext);
            case 'inventory_manager':
                return $this->getInventoryManagerTemplate($projectContext);
            case 'project_management':
                return $this->getProjectManagementTemplate($projectContext);
            default:
                return $this->getGeneralPurposeTemplate($projectContext);
        }
    }

    /**
     * Analytics dashboard template with charts and data visualization
     */
    private function getAnalyticsTemplate(array $projectContext): string
    {
        return <<<HTML
<div class="view-container">
    <div class="view-header">
        <div class="view-title">
            <h2>📊 Analytics Dashboard</h2>
            <p>Comprehensive project analytics and data insights</p>
        </div>
        <div class="view-actions">
            <button class="btn btn-secondary" onclick="analyticsManager.refreshCharts()">
                <span class="icon">🔄</span> Refresh
            </button>
            <button class="btn btn-primary" onclick="analyticsManager.exportReport()">
                <span class="icon">📋</span> Export Report
            </button>
        </div>
    </div>

    <div class="analytics-grid">
        <div class="card summary-card">
            <h3>Project Overview</h3>
            <div class="summary-stats">
                <div class="stat-item">
                    <div class="stat-value" id="total-tasks">0</div>
                    <div class="stat-label">Total Tasks</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="completed-tasks">0</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="in-progress-tasks">0</div>
                    <div class="stat-label">In Progress</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="team-members">0</div>
                    <div class="stat-label">Team Members</div>
                </div>
            </div>
        </div>

        <div class="card chart-card">
            <h3>Task Status Distribution</h3>
            <canvas id="status-chart" width="400" height="200"></canvas>
        </div>

        <div class="card chart-card">
            <h3>Priority Breakdown</h3>
            <canvas id="priority-chart" width="400" height="200"></canvas>
        </div>

        <div class="card timeline-card">
            <h3>Recent Activity</h3>
            <div id="activity-timeline" class="timeline">
                <!-- Activity items will be populated here -->
            </div>
        </div>

        <div class="card performance-card">
            <h3>Team Performance</h3>
            <div id="team-performance" class="performance-grid">
                <!-- Team performance metrics will be populated here -->
            </div>
        </div>

        <div class="card insights-card">
            <h3>AI Insights</h3>
            <div id="ai-insights" class="insights-list">
                <div class="insight-item">
                    <span class="insight-icon">💡</span>
                    <span class="insight-text">Analyzing project data...</span>
                </div>
            </div>
        </div>
    </div>
</div>
HTML;
    }

    /**
     * Expense tracker template for financial management
     */
    private function getExpenseTrackerTemplate(array $projectContext): string
    {
        return <<<HTML
<div class="view-container">
    <div class="view-header">
        <div class="view-title">
            <h2>💰 Expense Tracker</h2>
            <p>Manage project expenses and budget tracking</p>
        </div>
        <div class="view-actions">
            <button class="btn btn-primary" onclick="expenseManager.addExpense()">
                <span class="icon">➕</span> Add Expense
            </button>
            <button class="btn btn-secondary" onclick="expenseManager.generateReport()">
                <span class="icon">📊</span> Generate Report
            </button>
        </div>
    </div>

    <div class="expense-dashboard">
        <div class="expense-summary">
            <div class="summary-card total">
                <h3>Total Budget</h3>
                <div class="amount" id="total-budget">$0.00</div>
            </div>
            <div class="summary-card spent">
                <h3>Total Spent</h3>
                <div class="amount" id="total-spent">$0.00</div>
            </div>
            <div class="summary-card remaining">
                <h3>Remaining</h3>
                <div class="amount" id="remaining-budget">$0.00</div>
            </div>
        </div>

        <div class="expense-content">
            <div class="left-panel">
                <div class="card">
                    <h3>Expenses by Category</h3>
                    <canvas id="expense-chart" width="300" height="300"></canvas>
                </div>
                
                <div class="card">
                    <h3>Quick Add Expense</h3>
                    <form id="quick-expense-form" class="quick-form">
                        <input type="text" placeholder="Description" id="expense-description" required>
                        <input type="number" placeholder="Amount" id="expense-amount" step="0.01" required>
                        <select id="expense-category" required>
                            <option value="">Select Category</option>
                            <option value="office">Office Supplies</option>
                            <option value="travel">Travel</option>
                            <option value="software">Software</option>
                            <option value="marketing">Marketing</option>
                            <option value="misc">Miscellaneous</option>
                        </select>
                        <button type="submit" class="btn btn-primary">Add Expense</button>
                    </form>
                </div>
            </div>

            <div class="right-panel">
                <div class="card expense-list-card">
                    <div class="card-header">
                        <h3>Recent Expenses</h3>
                        <div class="filter-controls">
                            <input type="text" placeholder="Search expenses..." id="expense-search">
                            <select id="category-filter">
                                <option value="">All Categories</option>
                                <option value="office">Office Supplies</option>
                                <option value="travel">Travel</option>
                                <option value="software">Software</option>
                                <option value="marketing">Marketing</option>
                                <option value="misc">Miscellaneous</option>
                            </select>
                        </div>
                    </div>
                    <div id="expense-list" class="expense-list">
                        <!-- Expense items will be populated here -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
HTML;
    }

    /**
     * Contact manager template for team and client management
     */
    private function getContactManagerTemplate(array $projectContext): string
    {
        return <<<HTML
<div class="view-container">
    <div class="view-header">
        <div class="view-title">
            <h2>👥 Contact Manager</h2>
            <p>Manage team members and project contacts</p>
        </div>
        <div class="view-actions">
            <button class="btn btn-primary" onclick="contactManager.addContact()">
                <span class="icon">➕</span> Add Contact
            </button>
            <button class="btn btn-secondary" onclick="contactManager.importContacts()">
                <span class="icon">📁</span> Import
            </button>
        </div>
    </div>

    <div class="contact-dashboard">
        <div class="contact-sidebar">
            <div class="search-box">
                <input type="text" placeholder="Search contacts..." id="contact-search">
            </div>
            
            <div class="filter-section">
                <h4>Filter by Role</h4>
                <label><input type="checkbox" value="team" checked> Team Members</label>
                <label><input type="checkbox" value="client" checked> Clients</label>
                <label><input type="checkbox" value="vendor" checked> Vendors</label>
                <label><input type="checkbox" value="stakeholder" checked> Stakeholders</label>
            </div>
            
            <div class="quick-stats">
                <h4>Quick Stats</h4>
                <div class="stat-item">
                    <span class="label">Total Contacts:</span>
                    <span class="value" id="total-contacts">0</span>
                </div>
                <div class="stat-item">
                    <span class="label">Team Members:</span>
                    <span class="value" id="team-count">0</span>
                </div>
                <div class="stat-item">
                    <span class="label">Clients:</span>
                    <span class="value" id="client-count">0</span>
                </div>
            </div>
        </div>

        <div class="contact-main">
            <div class="contact-grid" id="contact-grid">
                <!-- Contact cards will be populated here -->
            </div>
        </div>

        <div class="contact-details" id="contact-details" style="display: none;">
            <div class="details-header">
                <h3 id="contact-name">Contact Details</h3>
                <button class="close-btn" onclick="contactManager.closeDetails()">&times;</button>
            </div>
            <div class="details-content" id="contact-details-content">
                <!-- Contact details will be populated here -->
            </div>
        </div>
    </div>
</div>
HTML;
    }

    /**
     * General purpose template for flexible use cases
     */
    private function getGeneralPurposeTemplate(array $projectContext): string
    {
        return <<<HTML
<div class="view-container">
    <div class="view-header">
        <div class="view-title">
            <h2>⚡ Multi-Purpose Manager</h2>
            <p>Flexible data management and organization tool</p>
        </div>
        <div class="view-actions">
            <button class="btn btn-primary" onclick="dataManager.createItem()">
                <span class="icon">➕</span> Create Item
            </button>
            <button class="btn btn-secondary" onclick="dataManager.bulkActions()">
                <span class="icon">📦</span> Bulk Actions
            </button>
        </div>
    </div>

    <div class="general-dashboard">
        <div class="toolbar">
            <div class="search-filter">
                <input type="text" placeholder="Search items..." id="global-search">
                <select id="category-filter">
                    <option value="">All Categories</option>
                    <option value="task">Tasks</option>
                    <option value="note">Notes</option>
                    <option value="document">Documents</option>
                    <option value="resource">Resources</option>
                </select>
                <select id="status-filter">
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="archived">Archived</option>
                </select>
            </div>
            
            <div class="view-toggles">
                <button class="toggle-btn active" onclick="dataManager.switchView('grid')" data-view="grid">
                    <span class="icon">⊞</span>
                </button>
                <button class="toggle-btn" onclick="dataManager.switchView('list')" data-view="list">
                    <span class="icon">☰</span>
                </button>
                <button class="toggle-btn" onclick="dataManager.switchView('kanban')" data-view="kanban">
                    <span class="icon">📋</span>
                </button>
            </div>
        </div>

        <div class="content-area">
            <div id="grid-view" class="data-grid">
                <!-- Grid items will be populated here -->
            </div>
            
            <div id="list-view" class="data-list" style="display: none;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="select-all"></th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="data-table-body">
                        <!-- Table rows will be populated here -->
                    </tbody>
                </table>
            </div>
            
            <div id="kanban-view" class="kanban-board" style="display: none;">
                <div class="kanban-column" data-status="pending">
                    <h3>Pending</h3>
                    <div class="kanban-items" id="pending-items"></div>
                </div>
                <div class="kanban-column" data-status="active">
                    <h3>Active</h3>
                    <div class="kanban-items" id="active-items"></div>
                </div>
                <div class="kanban-column" data-status="completed">
                    <h3>Completed</h3>
                    <div class="kanban-items" id="completed-items"></div>
                </div>
            </div>
        </div>
    </div>
</div>
HTML;
    }

    /**
     * Additional template methods for other types...
     */
    private function getTimeTrackerTemplate(array $projectContext): string
    {
        return $this->getGeneralPurposeTemplate($projectContext); // Simplified for now
    }
    
    private function getDocumentManagerTemplate(array $projectContext): string
    {
        return $this->getGeneralPurposeTemplate($projectContext); // Simplified for now
    }
    
    private function getInventoryManagerTemplate(array $projectContext): string
    {
        return $this->getGeneralPurposeTemplate($projectContext); // Simplified for now
    }
    
    private function getProjectManagementTemplate(array $projectContext): string
    {
        return $this->getGeneralPurposeTemplate($projectContext); // Simplified for now
    }

    /**
     * Enhanced CSS for professional, responsive design
     */
    private function getEnhancedCSS(): string
    {
        return <<<CSS
/* CSS Custom Properties for Theme Management */
:root {
    --primary-50: #f0f9ff;
    --primary-100: #e0f2fe;
    --primary-200: #bae6fd;
    --primary-500: #0ea5e9;
    --primary-600: #0284c7;
    --primary-700: #0369a1;
    --primary-900: #0c4a6e;
    
    --gray-50: #f9fafb;
    --gray-100: #f3f4f6;
    --gray-200: #e5e7eb;
    --gray-300: #d1d5db;
    --gray-400: #9ca3af;
    --gray-500: #6b7280;
    --gray-600: #4b5563;
    --gray-700: #374151;
    --gray-800: #1f2937;
    --gray-900: #111827;
    
    --success-500: #10b981;
    --warning-500: #f59e0b;
    --error-500: #ef4444;
    
    --bg-primary: #ffffff;
    --bg-secondary: #f9fafb;
    --bg-tertiary: #f3f4f6;
    --text-primary: #111827;
    --text-secondary: #6b7280;
    --text-muted: #9ca3af;
    --border-color: #e5e7eb;
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

[data-theme="dark"] {
    --bg-primary: #111827;
    --bg-secondary: #1f2937;
    --bg-tertiary: #374151;
    --text-primary: #f9fafb;
    --text-secondary: #d1d5db;
    --text-muted: #9ca3af;
    --border-color: #374151;
}

/* Base Styles */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    font-size: 16px;
    scroll-behavior: smooth;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    line-height: 1.6;
    transition: background-color 0.3s ease, color 0.3s ease;
}

/* Layout Structure */
#app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.app-header {
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    padding: 1rem 0;
    box-shadow: var(--shadow-sm);
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-left .app-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
}

.breadcrumb {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.separator {
    margin: 0 0.5rem;
}

.header-right {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.app-container {
    flex: 1;
    display: flex;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

/* Sidebar */
.sidebar {
    width: 280px;
    background: var(--bg-primary);
    border-right: 1px solid var(--border-color);
    padding: 1.5rem;
    overflow-y: auto;
    max-height: calc(100vh - 80px);
}

.nav-menu .nav-section {
    margin-bottom: 2rem;
}

.nav-section h3 {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
}

.nav-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.875rem;
    border-radius: 0.5rem;
    cursor: pointer;
    margin-bottom: 0.25rem;
    transition: all 0.2s ease;
}

.nav-item:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.nav-item.active {
    background: var(--primary-500);
    color: white;
}

.nav-item .icon {
    margin-right: 0.75rem;
    font-size: 1rem;
}

.sidebar-footer {
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
}

.project-stats {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
}

.stat {
    text-align: center;
}

.stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    display: block;
}

.stat-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
}

/* Main Content */
.main-content {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    max-height: calc(100vh - 80px);
}

.view-container {
    max-width: 100%;
}

.view-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.view-title h2 {
    font-size: 1.875rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.view-title p {
    color: var(--text-secondary);
    font-size: 1rem;
}

.view-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

/* Cards */
.card {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.2s ease;
}

.card:hover {
    box-shadow: var(--shadow-md);
}

.card h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 1rem;
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25;
    border-radius: 0.5rem;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    white-space: nowrap;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-primary {
    background: var(--primary-500);
    color: white;
    border-color: var(--primary-500);
}

.btn-primary:hover:not(:disabled) {
    background: var(--primary-600);
    border-color: var(--primary-600);
}

.btn-secondary {
    background: var(--bg-primary);
    color: var(--text-secondary);
    border-color: var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.btn .icon {
    font-size: 1rem;
}

/* Forms */
.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.875rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgb(14 165 233 / 0.1);
}

/* Modals */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
}

.modal.active {
    opacity: 1;
    visibility: visible;
}

.modal-content {
    background: var(--bg-primary);
    border-radius: 0.75rem;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-xl);
    transform: scale(0.9);
    transition: transform 0.3s ease;
}

.modal.active .modal-content {
    transform: scale(1);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
}

.close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
}

.close-btn:hover {
    color: var(--text-primary);
    background: var(--bg-tertiary);
}

.modal-body {
    padding: 1.5rem;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1.5rem;
    border-top: 1px solid var(--border-color);
}

/* Analytics Specific */
.analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
}

.summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
}

.stat-item {
    text-align: center;
    padding: 1rem;
    border-radius: 0.5rem;
    background: var(--bg-tertiary);
}

.stat-item .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--primary-500);
    display: block;
}

.stat-item .stat-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
}

/* Expense Tracker Specific */
.expense-dashboard {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.expense-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
}

.summary-card {
    text-align: center;
    padding: 2rem 1.5rem;
    border-radius: 0.75rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
}

.summary-card h3 {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
}

.summary-card .amount {
    font-size: 2.5rem;
    font-weight: 700;
}

.summary-card.total .amount { color: var(--primary-500); }
.summary-card.spent .amount { color: var(--error-500); }
.summary-card.remaining .amount { color: var(--success-500); }

.expense-content {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 2rem;
}

/* Contact Manager Specific */
.contact-dashboard {
    display: grid;
    grid-template-columns: 280px 1fr 320px;
    gap: 2rem;
    height: calc(100vh - 200px);
}

.contact-sidebar {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    padding: 1.5rem;
}

.search-box input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
}

.filter-section {
    margin-bottom: 2rem;
}

.filter-section h4 {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: var(--text-primary);
}

.filter-section label {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
    cursor: pointer;
}

.filter-section input[type="checkbox"] {
    margin-right: 0.5rem;
    width: auto;
}

.contact-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
    overflow-y: auto;
    padding: 1rem;
}

/* General Purpose Specific */
.general-dashboard {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
}

.search-filter {
    display: flex;
    gap: 1rem;
    align-items: center;
}

.search-filter input,
.search-filter select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    font-size: 0.875rem;
}

.view-toggles {
    display: flex;
    gap: 0.25rem;
}

.toggle-btn {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-secondary);
    border-radius: 0.375rem;
    cursor: pointer;
}

.toggle-btn.active {
    background: var(--primary-500);
    color: white;
    border-color: var(--primary-500);
}

.data-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--bg-primary);
    border-radius: 0.75rem;
    overflow: hidden;
    border: 1px solid var(--border-color);
}

.data-table th,
.data-table td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}

.data-table th {
    background: var(--bg-tertiary);
    font-weight: 600;
    color: var(--text-primary);
}

.kanban-board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
}

.kanban-column {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    padding: 1rem;
}

.kanban-column h3 {
    text-align: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
}

/* Notifications */
#notification-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1100;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.notification {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    padding: 1rem;
    box-shadow: var(--shadow-lg);
    max-width: 400px;
    animation: slideIn 0.3s ease;
}

.notification.success { border-left: 4px solid var(--success-500); }
.notification.warning { border-left: 4px solid var(--warning-500); }
.notification.error { border-left: 4px solid var(--error-500); }

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

/* Responsive Design */
@media (max-width: 1024px) {
    .app-container {
        flex-direction: column;
    }
    
    .sidebar {
        width: 100%;
        max-height: none;
        border-right: none;
        border-bottom: 1px solid var(--border-color);
    }
    
    .contact-dashboard {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr auto;
    }
    
    .expense-content {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .header-content {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
    }
    
    .header-right {
        width: 100%;
        justify-content: flex-end;
    }
    
    .toolbar {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
    }
    
    .search-filter {
        flex-wrap: wrap;
    }
    
    .analytics-grid {
        grid-template-columns: 1fr;
    }
}

/* Print Styles */
@media print {
    .sidebar,
    .header-right,
    .view-actions {
        display: none;
    }
    
    .main-content {
        padding: 0;
    }
    
    .card {
        break-inside: avoid;
        margin-bottom: 1rem;
    }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

/* Focus styles for keyboard navigation */
.btn:focus,
.nav-item:focus,
input:focus,
textarea:focus,
select:focus {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
    :root {
        --border-color: #000000;
        --text-secondary: #000000;
    }
    
    [data-theme="dark"] {
        --border-color: #ffffff;
        --text-secondary: #ffffff;
    }
}
CSS;
    }

    /**
     * Enhanced JavaScript for rich interactivity and functionality
     */
    private function getEnhancedJavaScript(string $templateType): string
    {
        return <<<JS
// Enhanced Application Manager with comprehensive functionality
class ApplicationManager {
    constructor() {
        this.data = {
            items: JSON.parse(localStorage.getItem('app_items') || '[]'),
            settings: JSON.parse(localStorage.getItem('app_settings') || '{}'),
            filters: { category: '', status: '', search: '' },
            currentView: 'grid',
            theme: localStorage.getItem('app_theme') || 'light'
        };
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.loadProjectData();
        this.applyTheme();
        this.initializeTemplate();
        this.setupKeyboardShortcuts();
        this.startAutoSave();
    }

    setupEventListeners() {
        // Modal handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(e);
        });

        // Search and filter handlers
        const searchInputs = document.querySelectorAll('[id$="-search"]');
        searchInputs.forEach(input => {
            input.addEventListener('input', this.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        });
    }

    async loadProjectData() {
        try {
            const projectContext = window.PROJECT_CONTEXT;
            if (projectContext) {
                this.projectData = projectContext;
                this.updateStats();
                this.renderData();
            }
        } catch (error) {
            console.error('Error loading project data:', error);
            this.showNotification('Failed to load project data', 'error');
        }
    }

    updateStats() {
        const totalItems = this.data.items.length;
        const activeItems = this.data.items.filter(item => item.status === 'active').length;
        
        this.updateElement('total-items', totalItems);
        this.updateElement('active-items', activeItems);
        this.updateElement('total-tasks', this.projectData?.tasks?.length || 0);
        this.updateElement('completed-tasks', 
            this.projectData?.tasks?.filter(t => t.status === 'done').length || 0);
        this.updateElement('in-progress-tasks', 
            this.projectData?.tasks?.filter(t => t.status === 'inprogress').length || 0);
        this.updateElement('team-members', this.projectData?.members?.length || 0);
    }

    renderData() {
        const filteredItems = this.getFilteredItems();
        
        switch (this.data.currentView) {
            case 'grid':
                this.renderGridView(filteredItems);
                break;
            case 'list':
                this.renderListView(filteredItems);
                break;
            case 'kanban':
                this.renderKanbanView(filteredItems);
                break;
        }
    }

    getFilteredItems() {
        return this.data.items.filter(item => {
            const matchesSearch = !this.data.filters.search || 
                item.title.toLowerCase().includes(this.data.filters.search.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(this.data.filters.search.toLowerCase()));
            const matchesCategory = !this.data.filters.category || item.category === this.data.filters.category;
            const matchesStatus = !this.data.filters.status || item.status === this.data.filters.status;
            
            return matchesSearch && matchesCategory && matchesStatus;
        });
    }

    renderGridView(items) {
        const container = document.getElementById('grid-view');
        if (!container) return;

        container.innerHTML = items.map(item => `
            <div class="card item-card" data-id="\${item.id}">
                <div class="item-header">
                    <h4>\${this.escapeHtml(item.title)}</h4>
                    <div class="item-actions">
                        <button class="btn-icon" onclick="appManager.editItem(\${item.id})" title="Edit">
                            <span class="icon">✏️</span>
                        </button>
                        <button class="btn-icon" onclick="appManager.deleteItem(\${item.id})" title="Delete">
                            <span class="icon">🗑️</span>
                        </button>
                    </div>
                </div>
                <p class="item-description">\${this.escapeHtml(item.description || '')}</p>
                <div class="item-meta">
                    <span class="category-badge \${item.category}">\${item.category}</span>
                    <span class="status-badge \${item.status}">\${item.status}</span>
                    <span class="priority-badge \${item.priority}">\${item.priority}</span>
                </div>
                <div class="item-footer">
                    <span class="created-date">\${this.formatDate(item.createdAt)}</span>
                </div>
            </div>
        `).join('') || '<div class="empty-state">No items found. Create your first item!</div>';
    }

    renderListView(items) {
        const tbody = document.getElementById('data-table-body');
        if (!tbody) return;

        tbody.innerHTML = items.map(item => `
            <tr data-id="\${item.id}">
                <td><input type="checkbox" class="item-checkbox" data-id="\${item.id}"></td>
                <td>\${this.escapeHtml(item.title)}</td>
                <td><span class="category-badge \${item.category}">\${item.category}</span></td>
                <td><span class="status-badge \${item.status}">\${item.status}</span></td>
                <td>\${this.formatDate(item.createdAt)}</td>
                <td>
                    <button class="btn btn-sm" onclick="appManager.editItem(\${item.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="appManager.deleteItem(\${item.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    renderKanbanView(items) {
        const statuses = ['pending', 'active', 'completed'];
        
        statuses.forEach(status => {
            const container = document.getElementById(`\${status}-items`);
            if (!container) return;

            const statusItems = items.filter(item => item.status === status);
            container.innerHTML = statusItems.map(item => `
                <div class="kanban-item" data-id="\${item.id}" draggable="true">
                    <h5>\${this.escapeHtml(item.title)}</h5>
                    <p>\${this.escapeHtml(item.description || '')}</p>
                    <div class="kanban-meta">
                        <span class="category-badge \${item.category}">\${item.category}</span>
                        <span class="priority-badge \${item.priority}">\${item.priority}</span>
                    </div>
                </div>
            `).join('');
        });

        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const kanbanItems = document.querySelectorAll('.kanban-item');
        const kanbanColumns = document.querySelectorAll('.kanban-items');

        kanbanItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.id);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });

        kanbanColumns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                const itemId = parseInt(e.dataTransfer.getData('text/plain'));
                const newStatus = column.parentElement.dataset.status;
                
                this.updateItemStatus(itemId, newStatus);
            });
        });
    }

    // Template-specific initialization
    initializeTemplate() {
        const templateType = '${templateType}';
        
        switch (templateType) {
            case 'analytics':
                this.initializeAnalytics();
                break;
            case 'expense_tracker':
                this.initializeExpenseTracker();
                break;
            case 'contact_manager':
                this.initializeContactManager();
                break;
            default:
                this.initializeGeneralPurpose();
        }
    }

    initializeAnalytics() {
        this.renderCharts();
        this.generateInsights();
    }

    renderCharts() {
        // Simple chart rendering using canvas
        this.renderStatusChart();
        this.renderPriorityChart();
    }

    renderStatusChart() {
        const canvas = document.getElementById('status-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const tasks = this.projectData?.tasks || [];
        const statusCounts = {
            todo: tasks.filter(t => t.status === 'todo').length,
            inprogress: tasks.filter(t => t.status === 'inprogress').length,
            review: tasks.filter(t => t.status === 'review').length,
            done: tasks.filter(t => t.status === 'done').length
        };

        this.drawPieChart(ctx, statusCounts, canvas.width, canvas.height);
    }

    drawPieChart(ctx, data, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 3;
        
        const total = Object.values(data).reduce((sum, value) => sum + value, 0);
        const colors = ['#ef4444', '#f59e0b', '#0ea5e9', '#10b981'];
        
        let currentAngle = 0;
        
        Object.entries(data).forEach(([key, value], index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index];
            ctx.fill();
            
            currentAngle += sliceAngle;
        });
    }

    initializeExpenseTracker() {
        this.loadExpenseData();
        this.setupExpenseForm();
    }

    loadExpenseData() {
        const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        this.expenses = expenses;
        this.updateExpenseSummary();
        this.renderExpenseList();
    }

    updateExpenseSummary() {
        const totalBudget = 10000; // Default budget
        const totalSpent = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const remaining = totalBudget - totalSpent;

        this.updateElement('total-budget', `$\${totalBudget.toFixed(2)}`);
        this.updateElement('total-spent', `$\${totalSpent.toFixed(2)}`);
        this.updateElement('remaining-budget', `$\${remaining.toFixed(2)}`);
    }

    setupExpenseForm() {
        const form = document.getElementById('quick-expense-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addExpense();
            });
        }
    }

    addExpense() {
        const description = document.getElementById('expense-description').value;
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('expense-category').value;

        if (!description || !amount || !category) {
            this.showNotification('Please fill all fields', 'warning');
            return;
        }

        const expense = {
            id: Date.now(),
            description,
            amount,
            category,
            createdAt: new Date().toISOString()
        };

        this.expenses.push(expense);
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
        
        this.updateExpenseSummary();
        this.renderExpenseList();
        
        document.getElementById('quick-expense-form').reset();
        this.showNotification('Expense added successfully!', 'success');
    }

    renderExpenseList() {
        const container = document.getElementById('expense-list');
        if (!container) return;

        container.innerHTML = this.expenses.map(expense => `
            <div class="expense-item">
                <div class="expense-info">
                    <h4>\${this.escapeHtml(expense.description)}</h4>
                    <span class="expense-category">\${expense.category}</span>
                </div>
                <div class="expense-amount">$\${expense.amount.toFixed(2)}</div>
                <div class="expense-actions">
                    <button onclick="appManager.deleteExpense(\${expense.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    initializeContactManager() {
        this.loadContacts();
        this.setupContactFilters();
    }

    loadContacts() {
        // Load team members from project context
        const members = this.projectData?.members || [];
        this.contacts = members.map(member => ({
            id: member.id,
            name: member.name,
            email: member.email,
            role: 'team',
            avatar: `https://ui-avatars.com/api/?name=\${encodeURIComponent(member.name)}&background=0ea5e9&color=fff`
        }));

        this.renderContactGrid();
        this.updateContactStats();
    }

    renderContactGrid() {
        const container = document.getElementById('contact-grid');
        if (!container) return;

        container.innerHTML = this.contacts.map(contact => `
            <div class="contact-card" data-id="\${contact.id}">
                <div class="contact-avatar">
                    <img src="\${contact.avatar}" alt="\${contact.name}" loading="lazy">
                </div>
                <div class="contact-info">
                    <h4>\${this.escapeHtml(contact.name)}</h4>
                    <p>\${this.escapeHtml(contact.email)}</p>
                    <span class="role-badge \${contact.role}">\${contact.role}</span>
                </div>
                <div class="contact-actions">
                    <button onclick="appManager.viewContact(\${contact.id})">View</button>
                    <button onclick="appManager.editContact(\${contact.id})">Edit</button>
                </div>
            </div>
        `).join('');
    }

    updateContactStats() {
        this.updateElement('total-contacts', this.contacts.length);
        this.updateElement('team-count', this.contacts.filter(c => c.role === 'team').length);
        this.updateElement('client-count', this.contacts.filter(c => c.role === 'client').length);
    }

    initializeGeneralPurpose() {
        this.renderData();
        this.setupViewToggles();
    }

    setupViewToggles() {
        const toggleButtons = document.querySelectorAll('.toggle-btn');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.switchView(view);
            });
        });
    }

    // Utility functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) element.textContent = content;
    }

    // Public methods for UI interactions
    showCreateModal() {
        this.showModal('create-modal');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
            modal.style.display = 'none';
        });
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        }
    }

    createItem() {
        const form = document.getElementById('create-form');
        const formData = new FormData(form);
        
        const item = {
            id: Date.now(),
            title: formData.get('title'),
            description: formData.get('description'),
            category: formData.get('category'),
            priority: formData.get('priority'),
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        this.data.items.push(item);
        this.saveData();
        this.renderData();
        this.updateStats();
        this.closeModal('create-modal');
        this.showNotification('Item created successfully!', 'success');
        
        form.reset();
    }

    editItem(id) {
        const item = this.data.items.find(i => i.id === id);
        if (!item) return;

        // Implementation for edit modal would go here
        this.showNotification('Edit functionality coming soon!', 'info');
    }

    deleteItem(id) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        this.data.items = this.data.items.filter(i => i.id !== id);
        this.saveData();
        this.renderData();
        this.updateStats();
        this.showNotification('Item deleted successfully!', 'success');
    }

    updateItemStatus(id, newStatus) {
        const item = this.data.items.find(i => i.id === id);
        if (item) {
            item.status = newStatus;
            this.saveData();
            this.renderData();
            this.showNotification(`Item moved to \${newStatus}`, 'success');
        }
    }

    switchView(view) {
        this.data.currentView = view;
        
        // Update toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Show/hide view containers
        ['grid-view', 'list-view', 'kanban-view'].forEach(viewId => {
            const container = document.getElementById(viewId);
            if (container) {
                container.style.display = viewId.startsWith(view) ? 'block' : 'none';
            }
        });

        this.renderData();
    }

    handleSearch(searchTerm) {
        this.data.filters.search = searchTerm;
        this.renderData();
    }

    toggleTheme() {
        this.data.theme = this.data.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('app_theme', this.data.theme);
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.data.theme);
    }

    showHelp() {
        this.showModal('help-modal');
    }

    refreshData() {
        this.loadProjectData();
        this.showNotification('Data refreshed!', 'success');
    }

    async exportData() {
        const data = {
            items: this.data.items,
            expenses: this.expenses || [],
            contacts: this.contacts || [],
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `project-data-\${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Data exported successfully!', 'success');
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification \${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <p>\${this.escapeHtml(message)}</p>
                <button class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
        `;

        container.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    saveData() {
        localStorage.setItem('app_items', JSON.stringify(this.data.items));
        localStorage.setItem('app_settings', JSON.stringify(this.data.settings));
    }

    startAutoSave() {
        setInterval(() => {
            this.saveData();
        }, 30000); // Auto-save every 30 seconds
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.showCreateModal();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveData();
                        this.showNotification('Data saved!', 'success');
                        break;
                    case 'f':
                        e.preventDefault();
                        const searchInput = document.querySelector('[id$="-search"]');
                        if (searchInput) searchInput.focus();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportData();
                        break;
                }
            } else if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    // Template-specific methods
    generateInsights() {
        const insights = [
            "📈 Task completion rate has improved by 15% this week",
            "⚡ Most productive team member: " + (this.projectData?.members?.[0]?.name || "N/A"),
            "📊 Recommended: Focus on high-priority tasks first",
            "🎯 Project milestone approaching in 5 days"
        ];

        const container = document.getElementById('ai-insights');
        if (container) {
            container.innerHTML = insights.map(insight => `
                <div class="insight-item">
                    <span class="insight-text">\${insight}</span>
                </div>
            `).join('');
        }
    }
}

// Initialize the application
const appManager = new ApplicationManager();

// Expose to global scope for inline event handlers
window.appManager = appManager;

// Additional helper functions for specific templates
window.analyticsManager = {
    refreshCharts: () => appManager.renderCharts(),
    exportReport: () => appManager.exportData()
};

window.expenseManager = {
    addExpense: () => appManager.showCreateModal(),
    generateReport: () => appManager.exportData()
};

window.contactManager = {
    addContact: () => appManager.showCreateModal(),
    importContacts: () => appManager.showNotification('Import feature coming soon!', 'info'),
    viewContact: (id) => appManager.showNotification('Contact details coming soon!', 'info'),
    editContact: (id) => appManager.editItem(id),
    closeDetails: () => {
        const details = document.getElementById('contact-details');
        if (details) details.style.display = 'none';
    }
};

window.dataManager = {
    createItem: () => appManager.showCreateModal(),
    bulkActions: () => appManager.showNotification('Bulk actions coming soon!', 'info'),
    switchView: (view) => appManager.switchView(view)
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Enhanced SPA Application Loaded Successfully');
});
JS;
    }
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