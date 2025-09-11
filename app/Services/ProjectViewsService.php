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
    public function processCustomViewRequest(Project $project, string $message, ?string $sessionId = null, ?int $userId = null, string $viewName = 'default', array $conversationHistory = []): array
    {
        try {
            Log::debug('[ProjectViewsService] Processing custom view request', [
                'project_id' => $project->id,
                'message' => $message,
                'session_id' => $sessionId,
                'user_id' => $userId,
                'view_name' => $viewName,
                'conversation_length' => count($conversationHistory),
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
            
            // STEP 2: Build enhanced prompt with component guidance, conversation history, and existing SPA context
            $prompt = $this->buildEnhancedCustomViewPrompt($message, $projectContext, $analysis, $existingView, $conversationHistory);

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
                    'components_used' => $analysis['components'],
                    'conversation_length' => count($conversationHistory),
                    'has_existing_spa' => $existingView !== null,
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
                'message' => ($existingView ? 'Updated your custom application!' : 'Generated your custom application!') . ($fallbackUsed ? ' (component templates)' : ''),
                'html' => $parsedResponse['html'],
                'javascript' => $parsedResponse['javascript'] ?? null,
                'success' => true,
                'session_id' => $sessionId,
                'custom_view_id' => $customView?->id,
                'is_update' => $existingView !== null,
                'components_analysis' => $analysis,
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
                'success' => false,
                'session_id' => $sessionId,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get project context data
     */
    private function getProjectContext(Project $project): array
    {
        $projectData = [
            'id' => $project->id,
            'name' => $project->name,
            'description' => $project->description,
            'created_at' => $project->created_at->toISOString(),
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
     * Build enhanced prompt for OpenAI with component guidance, conversation history, and existing SPA context
     */
    private function buildEnhancedCustomViewPrompt(string $userRequest, array $projectContext, array $analysis, ?CustomView $existingView = null, array $conversationHistory = []): string
    {
        $contextInfo = $existingView 
            ? "CONTEXT: This is an UPDATE request. The user already has a custom application and wants to modify/enhance it based on their new request."
            : "CONTEXT: This is a NEW generation request. Create a fresh application from scratch.";

        // Include full existing SPA content for updates
        $existingContent = "";
        if ($existingView) {
            $existingContent = "
EXISTING APPLICATION TO UPDATE:
Current Application HTML (full content):
```html
" . $existingView->html_content . "
```

UPDATE INSTRUCTION: Based on the user's new request '{$userRequest}', you should:
1. PRESERVE existing functionality that's still relevant
2. ADD new features/components as requested
3. IMPROVE the existing design and usability
4. MAINTAIN data and state where possible
5. ENSURE all interactions work smoothly

The final output should be an ENHANCED version of the existing application that incorporates the user's new request.
";
        }

        // Build conversation context
        $conversationContext = "";
        if (!empty($conversationHistory)) {
            $conversationContext = "
CONVERSATION HISTORY:
The user has been having a conversation about this application. Here's the context:
";
            foreach ($conversationHistory as $msg) {
                $role = strtoupper($msg['role']);
                $content = substr($msg['content'], 0, 500); // Limit length
                $conversationContext .= "- {$role}: {$content}\n";
            }
            $conversationContext .= "
Use this conversation context to better understand what the user wants and maintain consistency with previous discussions.
";
        }

        $componentGuidance = "
COMPONENT ANALYSIS:
Based on the user request, I've identified these required components:
- Components needed: " . implode(', ', $analysis['components']) . "
- Input types: " . implode(', ', $analysis['input_types']) . "
- Output types: " . implode(', ', $analysis['output_types']) . "

AVAILABLE COMPONENTS LIBRARY (120+ components):
Forms: basic_form, contact_form, search_form, login_form, survey_form, registration_form, booking_form, payment_form, multi_step_form, feedback_form, application_form, order_form, subscription_form, event_form, profile_form
Data Display: data_table, card_list, dashboard_grid, timeline, kanban_board, grid_view, list_view, tree_view, calendar_view, comparison_table, invoice_display, product_catalog, directory_listing, portfolio_display, pricing_table, news_feed, testimonial_display, team_display, event_listing, faq_display
Charts: bar_chart, line_chart, pie_chart, progress_chart, scatter_chart, histogram, heatmap, gantt_chart, funnel_chart, radar_chart, sankey_diagram, treemap, candlestick_chart, waterfall_chart, network_diagram
Interactive: calculator, counter, timer, file_uploader, image_gallery, drawing_canvas, code_editor, color_picker, date_picker, rating_system, quiz_engine, poll_widget, chat_interface, video_player, audio_player, map_viewer, qr_generator, barcode_scanner, signature_pad, drag_drop_builder
Business: crm_dashboard, sales_tracker, inventory_manager, expense_tracker, project_manager, time_tracker, employee_directory, meeting_scheduler, document_manager, knowledge_base, help_desk, booking_system, pos_system, warehouse_manager, hr_dashboard
E-commerce: product_browser, shopping_cart, checkout_process, order_tracker, wishlist_manager, review_system, coupon_manager, loyalty_program, vendor_portal, analytics_dashboard
Navigation: tabs, sidebar, breadcrumbs, pagination, mega_menu, mobile_menu, footer_nav, floating_nav, wizard_steps, accordion_nav
Utilities: search_engine, notification_center, settings_panel, backup_manager, import_wizard, audit_log, performance_monitor, error_tracker, version_control, api_tester

IMPORTANT: You MUST include ALL the identified components and ensure they are fully functional with working JavaScript.";

        $prompt = "You are an expert web developer who creates functional, beautiful single-page applications.

{$contextInfo}

USER REQUEST: {$userRequest}

{$conversationContext}

{$existingContent}

{$componentGuidance}

PROJECT CONTEXT:
- Project Name: {$projectContext['project']['name']}
- Project Description: {$projectContext['project']['description']}
- Total Tasks: {$projectContext['task_count']}
- Team Members: " . json_encode(array_column($projectContext['members'], 'name')) . "

CRITICAL REQUIREMENTS FOR DATA-FOCUSED DESIGN:
1. INPUT SPACE OPTIMIZATION: Input controls should take MINIMAL space (max 20% of screen). Prioritize compact, efficient input methods:
   - Use inline editing for data tables
   - Combine multiple inputs in single lines where possible
   - Use dropdown selects instead of radio buttons
   - Implement quick-add forms that are collapsible
   - Use modal dialogs for complex forms to save space

2. DATA DISPLAY MAXIMIZATION: 80% of the screen should focus on displaying and visualizing data:
   - Large, readable data tables with sorting/filtering
   - Prominent charts and graphs for analytics
   - Clear data hierarchies and relationships
   - Multiple view modes (table, cards, charts)
   - Real-time data updates and notifications

3. EFFICIENT INTERACTIONS:
   - Quick actions (edit, delete, duplicate) directly on data rows
   - Bulk operations for multiple items
   - Keyboard shortcuts for power users
   - Auto-save functionality to reduce form submissions
   - Context menus for right-click actions

4. MOBILE-RESPONSIVE: Ensure the app works well on all devices while maintaining the data-first approach.

5. PERFORMANCE: Optimize for fast loading and smooth interactions, especially with large datasets.

TECHNICAL REQUIREMENTS:
- Create a complete, standalone HTML page with embedded CSS and JavaScript
- Use modern web technologies (HTML5, CSS3, ES6+)
- Include responsive design for mobile and desktop
- Add proper form validation and error handling
- Include loading states and user feedback
- Use semantic HTML and accessibility best practices
- Ensure all interactive elements work without external dependencies
- Add smooth animations and transitions
- Include search/filter functionality for data tables
- Make it visually appealing with a modern design system

OUTPUT FORMAT:
Return ONLY the complete HTML content. Do NOT include any explanations, markdown formatting, or code block syntax. The response should start with <!DOCTYPE html> and be ready to use immediately.

DESIGN THEME: Use a clean, professional design with:
- Modern color palette (blues, grays, whites)
- Consistent spacing and typography
- Clear visual hierarchy
- Intuitive user interface
- Professional business application aesthetics

Remember: This is a DATA-FOCUSED project management system. Prioritize data display and visualization over input forms!";

        return $prompt;
    }
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

    /**
     * Parse AI response (extract HTML and JS)
     */
    private function parseAIResponse(string $response): array
    {
        // Clean response - remove markdown formatting if present
        $html = preg_replace('/^```(?:html)?\s*\n?/', '', $response);
        $html = preg_replace('/\n?```\s*$/', '', $html);
        $html = trim($html);

        return [
            'html' => $html,
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
    public function getAllCustomViews(Project $project, int $userId): array
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