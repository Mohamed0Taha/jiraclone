<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\CustomView;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Services\ComponentLibraryService;

class ProjectViewsService
{
    private OpenAIService $openAIService;
    private ComponentLibraryService $componentLibrary;

    // Conversation flow management
    private array $conversationSessions = [];
    
    // Response type constants
    const RESPONSE_TYPE_QUESTION = 'question';
    const RESPONSE_TYPE_CLARIFICATION = 'clarification';
    const RESPONSE_TYPE_SOLUTION = 'solution';
    const RESPONSE_TYPE_UPDATE = 'update';

    public function __construct(OpenAIService $openAIService, ComponentLibraryService $componentLibrary)
    {
        $this->openAIService = $openAIService;
        $this->componentLibrary = $componentLibrary;
    }

    /**
     * Enhanced conversation flow manager for custom view requests
     */
    public function manageConversationFlow(string $sessionId, array $conversationHistory = []): array
    {
        if (!isset($this->conversationSessions[$sessionId])) {
            $this->conversationSessions[$sessionId] = [
                'started_at' => now(),
                'message_count' => 0,
                'context' => [],
                'user_intent' => null,
                'clarifications_needed' => [],
                'requirements' => [],
                'previous_attempts' => [],
            ];
        }

        $session = &$this->conversationSessions[$sessionId];
        $session['message_count'] = count($conversationHistory);
        
        return $session;
    }

    /**
     * Analyze response type from AI output to determine conversation flow
     */
    public function classifyAIResponse(string $aiResponse): array
    {
        $response = strtolower($aiResponse);
        
        // Detect questions and clarification requests
        $questionIndicators = [
            'what', 'how', 'which', 'where', 'when', 'why', 'would you like',
            'could you clarify', 'do you want', 'should i', 'can you provide',
            'would you prefer', 'what kind of', 'how many', 'which type'
        ];
        
        $clarificationIndicators = [
            'to clarify', 'just to confirm', 'to make sure', 'i need to understand',
            'could you specify', 'more details about', 'elaborate on'
        ];
        
        $hasQuestions = false;
        $hasClarification = false;
        
        foreach ($questionIndicators as $indicator) {
            if (strpos($response, $indicator) !== false) {
                $hasQuestions = true;
                break;
            }
        }
        
        foreach ($clarificationIndicators as $indicator) {
            if (strpos($response, $indicator) !== false) {
                $hasClarification = true;
                break;
            }
        }
        
        // Check for solution indicators
        $solutionIndicators = [
            '<html', '<!doctype', 'generated', 'created', 'built', 'here is',
            'application ready', 'spa generated', 'custom view created'
        ];
        
        $hasSolution = false;
        foreach ($solutionIndicators as $indicator) {
            if (strpos($response, $indicator) !== false) {
                $hasSolution = true;
                break;
            }
        }
        
        // Determine response type
        if ($hasSolution) {
            $type = self::RESPONSE_TYPE_SOLUTION;
        } elseif ($hasClarification) {
            $type = self::RESPONSE_TYPE_CLARIFICATION;
        } elseif ($hasQuestions) {
            $type = self::RESPONSE_TYPE_QUESTION;
        } else {
            $type = self::RESPONSE_TYPE_UPDATE;
        }
        
        return [
            'type' => $type,
            'has_questions' => $hasQuestions,
            'has_clarification' => $hasClarification,
            'has_solution' => $hasSolution,
            'confidence' => $hasSolution ? 0.9 : ($hasQuestions || $hasClarification ? 0.8 : 0.6)
        ];
    }

    /**
     * Extract and track user requirements from conversation
     */
    public function extractUserRequirements(array $conversationHistory): array
    {
        $requirements = [];
        $entities = [];
        
        foreach ($conversationHistory as $message) {
            if ($message['role'] === 'user') {
                $content = strtolower($message['content']);
                
                // Extract entities and requirements
                $patterns = [
                    'components' => '/(?:create|build|make|need|want)(?:\s+(?:a|an))?\s+([^.!?]+?)(?:\s+(?:for|to|that|which))?/',
                    'features' => '/(?:with|include|have|support|allow)(?:\s+(?:a|an))?\s+([^.!?]+)/',
                    'data' => '/(?:track|store|manage|display|show)(?:\s+(?:a|an))?\s+([^.!?]+)/',
                    'users' => '/(?:for|by|users?|team|staff|employees?|customers?)(?:\s+(?:can|to|will))?(?:\s+([^.!?]+))?/',
                ];
                
                foreach ($patterns as $type => $pattern) {
                    if (preg_match_all($pattern, $content, $matches)) {
                        foreach ($matches[1] as $match) {
                            $requirement = trim($match);
                            if ($requirement && strlen($requirement) > 3) {
                                $requirements[$type][] = $requirement;
                            }
                        }
                    }
                }
            }
        }
        
        return [
            'requirements' => $requirements,
            'complexity_score' => $this->calculateComplexityScore($requirements),
            'estimated_components' => $this->estimateRequiredComponents($requirements)
        ];
    }

    /**
     * Calculate complexity score based on requirements
     */
    private function calculateComplexityScore(array $requirements): float
    {
        $score = 0;
        
        foreach ($requirements as $type => $items) {
            $score += count($items) * match($type) {
                'components' => 2,
                'features' => 1.5,
                'data' => 1,
                'users' => 0.5,
                default => 1
            };
        }
        
        return min($score / 10, 1.0); // Normalize to 0-1
    }

    /**
     * Estimate required components based on requirements
     */
    private function estimateRequiredComponents(array $requirements): array
    {
        $components = [];
        
        // Basic mapping of requirements to components
        $componentMappings = [
            'form' => ['basic_form', 'contact_form'],
            'table' => ['data_table'],
            'dashboard' => ['dashboard_grid', 'bar_chart'],
            'tracker' => ['counter', 'progress_chart'],
            'calculator' => ['calculator'],
            'chart' => ['bar_chart', 'pie_chart'],
            'list' => ['card_list'],
            'calendar' => ['calendar_view'],
            'timer' => ['timer'],
        ];
        
        foreach ($requirements as $items) {
            foreach ($items as $item) {
                foreach ($componentMappings as $keyword => $comps) {
                    if (strpos(strtolower($item), $keyword) !== false) {
                        $components = array_merge($components, $comps);
                    }
                }
            }
        }
        
        return array_unique($components);
    }

    /**
     * Process custom view request and generate SPA with enhanced conversation flow
     */
    public function processCustomViewRequest(Project $project, string $message, ?string $sessionId = null, ?int $userId = null, string $viewName = 'default', array $conversationHistory = []): array
    {
        try {
            Log::debug('[ProjectViewsService] Processing custom view request with enhanced conversation flow', [
                'project_id' => $project->id,
                'message' => $message,
                'session_id' => $sessionId,
                'user_id' => $userId,
                'view_name' => $viewName,
                'conversation_length' => count($conversationHistory),
            ]);

            // STEP 1: Manage conversation flow and extract requirements
            $conversationSession = $sessionId ? $this->manageConversationFlow($sessionId, $conversationHistory) : [];
            $userRequirements = $this->extractUserRequirements($conversationHistory);
            
            // STEP 2: Analyze the user request to determine components needed
            $analysis = $this->componentLibrary->analyzeRequest($message);
            
            // Enhanced analysis with conversation context
            if (!empty($userRequirements['estimated_components'])) {
                $analysis['components'] = array_unique(array_merge(
                    $analysis['components'],
                    $userRequirements['estimated_components']
                ));
            }
            
            Log::debug('[ProjectViewsService] Enhanced component analysis completed', [
                'components' => $analysis['components'],
                'input_types' => $analysis['input_types'],
                'output_types' => $analysis['output_types'],
                'complexity_score' => $userRequirements['complexity_score'] ?? 0,
                'conversation_context' => !empty($conversationHistory)
            ]);

            // Check if we have an existing custom view (for update context)
            $existingView = null;
            if ($userId) {
                $existingView = CustomView::getActiveForProject($project->id, $userId, $viewName);
            }

            // Get project context
            $projectContext = $this->getProjectContext($project);
            
            // STEP 3: Build enhanced prompt with conversation awareness and response classification
            $prompt = $this->buildConversationAwarePrompt(
                $message, 
                $projectContext, 
                $analysis, 
                $existingView, 
                $conversationHistory,
                $userRequirements,
                $conversationSession
            );

            // Try LLM generation with enhanced conversation handling
            $fallbackUsed = false;
            $responseClassification = [];
            
            try {
                $aiResponse = $this->openAIService->generateCustomView($prompt);
                
                // STEP 4: Classify AI response to determine conversation flow
                $responseClassification = $this->classifyAIResponse($aiResponse);
                
                Log::debug('[ProjectViewsService] AI response classified', [
                    'response_type' => $responseClassification['type'],
                    'has_questions' => $responseClassification['has_questions'],
                    'confidence' => $responseClassification['confidence']
                ]);
                
                // If AI is asking questions, handle differently
                if ($responseClassification['type'] === self::RESPONSE_TYPE_QUESTION ||
                    $responseClassification['type'] === self::RESPONSE_TYPE_CLARIFICATION) {
                    
                    return [
                        'type' => 'conversation_continue',
                        'response_type' => $responseClassification['type'],
                        'message' => $aiResponse,
                        'success' => true,
                        'session_id' => $sessionId,
                        'requires_user_response' => true,
                        'conversation_context' => $conversationSession,
                        'classification' => $responseClassification,
                    ];
                }
                
                // Extract HTML and JavaScript from solution response
                $parsedResponse = $this->parseAIResponse($aiResponse);
                
            } catch (\Throwable $genEx) {
                $fallbackUsed = true;
                Log::warning('[ProjectViewsService] OpenAI generation failed, using enhanced component templates', [
                    'project_id' => $project->id,
                    'user_id' => $userId,
                    'view_name' => $viewName,
                    'error' => $genEx->getMessage(),
                ]);

                // STEP 5: Generate from enhanced component templates if AI fails
                $fallbackHtml = $this->buildEnhancedComponentBasedFallback($message, $projectContext, $analysis, $existingView, $userRequirements);
                $parsedResponse = [
                    'html' => $fallbackHtml,
                    'javascript' => null,
                ];
                
                $responseClassification = ['type' => self::RESPONSE_TYPE_SOLUTION, 'confidence' => 0.7];
            }
            
            // STEP 6: Enhance generated HTML with advanced interactivity
            if ($parsedResponse['html']) {
                $parsedResponse['html'] = $this->enhanceGeneratedHTMLWithAdvancedFeatures(
                    $parsedResponse['html'], 
                    $analysis, 
                    $userRequirements,
                    $projectContext
                );
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
                    'response_classification' => $responseClassification,
                    'user_requirements' => $userRequirements,
                    'conversation_session' => $conversationSession,
                    'enhancement_level' => 'advanced', // Mark as enhanced version
                ];
                
                $customView = CustomView::createOrUpdate(
                    $project->id,
                    $userId,
                    $viewName,
                    $parsedResponse['html'],
                    $metadata
                );
                
                Log::info('[ProjectViewsService] Enhanced custom view saved', [
                    'custom_view_id' => $customView->id,
                    'project_id' => $project->id,
                    'user_id' => $userId,
                    'response_type' => $responseClassification['type'],
                    'conversation_aware' => !empty($conversationHistory)
                ]);
            }
            
            return [
                'type' => 'spa_generated',
                'response_type' => $responseClassification['type'],
                'message' => ($existingView ? 'Updated your custom application!' : 'Generated your custom application!') . ($fallbackUsed ? ' (enhanced templates)' : ' (AI powered)'),
                'html' => $parsedResponse['html'],
                'javascript' => $parsedResponse['javascript'] ?? null,
                'success' => true,
                'session_id' => $sessionId,
                'custom_view_id' => $customView?->id,
                'is_update' => $existingView !== null,
                'components_analysis' => $analysis,
                'conversation_context' => $conversationSession,
                'classification' => $responseClassification,
                'enhancement_features' => [
                    'conversation_aware' => !empty($conversationHistory),
                    'advanced_crud' => true,
                    'state_persistence' => true,
                    'enhanced_interactivity' => true,
                ]
            ];

        } catch (\Exception $e) {
            Log::error('[ProjectViewsService] Error processing enhanced request', [
                'error' => $e->getMessage(),
                'project_id' => $project->id,
                'trace' => $e->getTraceAsString(),
            ]);

            // Enhanced fallback with better error handling
            $html = $this->buildEnhancedComponentBasedFallback(
                $message ?? 'Custom app', 
                ['project' => ['id' => $project->id, 'name' => $project->name], 'members' => [], 'tasks' => [], 'task_count' => 0], 
                ['components' => ['basic_form', 'data_table'], 'input_types' => ['text_input'], 'output_types' => ['data_display'], 'analysis' => 'Basic application'], 
                null,
                ['complexity_score' => 0.3, 'requirements' => []]
            );
            
            return [
                'type' => 'spa_generated',
                'response_type' => self::RESPONSE_TYPE_SOLUTION,
                'message' => 'Generated a robust fallback application with enhanced features.',
                'html' => $html,
                'javascript' => null,
                'success' => false,
                'session_id' => $sessionId,
                'error' => $e->getMessage(),
                'enhancement_features' => [
                    'fallback_mode' => true,
                    'enhanced_templates' => true,
                ]
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
     * Build conversation-aware prompt for OpenAI with enhanced context and response classification
     */
    private function buildConversationAwarePrompt(
        string $userRequest, 
        array $projectContext, 
        array $analysis, 
        ?CustomView $existingView = null, 
        array $conversationHistory = [],
        array $userRequirements = [],
        array $conversationSession = []
    ): string {
        
        $contextInfo = $existingView 
            ? "CONTEXT: This is an UPDATE request. The user already has a custom application and wants to modify/enhance it based on their new request."
            : "CONTEXT: This is a NEW generation request. Create a fresh application from scratch.";

        // Enhanced conversation context
        $conversationContext = "";
        if (!empty($conversationHistory)) {
            $conversationContext = "
ENHANCED CONVERSATION ANALYSIS:
Total messages in conversation: " . count($conversationHistory) . "
Complexity score: " . ($userRequirements['complexity_score'] ?? 'Not calculated') . "

Previous conversation context:
";
            $messageCount = 0;
            foreach ($conversationHistory as $msg) {
                $messageCount++;
                $role = strtoupper($msg['role']);
                $content = substr($msg['content'], 0, 200); // Increased limit for better context
                $conversationContext .= "- Message {$messageCount} ({$role}): {$content}\n";
                
                // Only show last 10 messages to keep prompt manageable
                if ($messageCount >= 10) {
                    $conversationContext .= "- [Earlier messages truncated for brevity]\n";
                    break;
                }
            }
            
            // Add extracted requirements
            if (!empty($userRequirements['requirements'])) {
                $conversationContext .= "
EXTRACTED USER REQUIREMENTS:
";
                foreach ($userRequirements['requirements'] as $type => $items) {
                    if (!empty($items)) {
                        $conversationContext .= "- " . ucfirst($type) . ": " . implode(', ', array_slice($items, 0, 3)) . "\n";
                    }
                }
            }
            
            $conversationContext .= "
RESPONSE GUIDANCE: Based on this conversation history, determine if you should:
1. ASK clarifying questions if requirements are unclear
2. REQUEST more specific details if the request is too vague  
3. GENERATE a complete SPA if you have enough information
4. SUGGEST improvements or alternatives based on the conversation

If asking questions, prefix your response with [QUESTION] and end with specific questions.
If generating an SPA, prefix with [SOLUTION] and provide the complete HTML.
";
        }

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
6. ADD enhanced CRUD operations where applicable

The final output should be an ENHANCED version of the existing application that incorporates the user's new request.
";
        }

        $componentGuidance = "
ENHANCED COMPONENT ANALYSIS:
Based on the user request and conversation, I've identified these required components:
- Components needed: " . implode(', ', $analysis['components']) . "
- Input types: " . implode(', ', $analysis['input_types']) . "
- Output types: " . implode(', ', $analysis['output_types']) . "
- Estimated complexity: " . ($userRequirements['complexity_score'] ?? 'Medium') . "

ENHANCED COMPONENT LIBRARY (120+ components with CRUD capabilities):
Forms: basic_form, contact_form, search_form, login_form, survey_form, registration_form, booking_form, payment_form, multi_step_form, feedback_form, application_form, order_form, subscription_form, event_form, profile_form
Data Display: data_table, card_list, dashboard_grid, timeline, kanban_board, grid_view, list_view, tree_view, calendar_view, comparison_table, invoice_display, product_catalog, directory_listing, portfolio_display, pricing_table, news_feed, testimonial_display, team_display, event_listing, faq_display
Charts: bar_chart, line_chart, pie_chart, progress_chart, scatter_chart, histogram, heatmap, gantt_chart, funnel_chart, radar_chart, sankey_diagram, treemap, candlestick_chart, waterfall_chart, network_diagram
Interactive: calculator, counter, timer, file_uploader, image_gallery, drawing_canvas, code_editor, color_picker, date_picker, rating_system, quiz_engine, poll_widget, chat_interface, video_player, audio_player, map_viewer, qr_generator, barcode_scanner, signature_pad, drag_drop_builder
Business: crm_dashboard, sales_tracker, inventory_manager, expense_tracker, project_manager, time_tracker, employee_directory, meeting_scheduler, document_manager, knowledge_base, help_desk, booking_system, pos_system, warehouse_manager, hr_dashboard
E-commerce: product_browser, shopping_cart, checkout_process, order_tracker, wishlist_manager, review_system, coupon_manager, loyalty_program, vendor_portal, analytics_dashboard
Navigation: tabs, sidebar, breadcrumbs, pagination, mega_menu, mobile_menu, footer_nav, floating_nav, wizard_steps, accordion_nav
Utilities: search_engine, notification_center, settings_panel, backup_manager, import_wizard, audit_log, performance_monitor, error_tracker, version_control, api_tester

IMPORTANT: You MUST include ALL the identified components and ensure they are fully functional with working JavaScript and CRUD operations.";

        $prompt = "You are an expert web developer who creates functional, beautiful single-page applications with advanced conversation awareness.

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

CRITICAL REQUIREMENTS FOR ENHANCED SPA DESIGN:

1. CONVERSATION AWARENESS:
   - If you don't have enough information, ASK specific clarifying questions
   - Reference previous conversation context when generating solutions
   - Build incrementally on previous requests and clarifications
   - Provide contextual responses based on conversation flow

2. ADVANCED CRUD OPERATIONS:
   - Every data component MUST support Create, Read, Update, Delete operations
   - Implement inline editing for data tables
   - Add bulk operations (select all, bulk delete, bulk edit)
   - Include data validation and error handling
   - Support data export/import functionality

3. ENHANCED STATE MANAGEMENT:
   - Implement Vue.js-inspired reactive state management
   - Use localStorage for data persistence across sessions
   - Add undo/redo functionality for data operations
   - Implement auto-save with conflict resolution
   - Support multiple data views and filters

4. RICH INTERACTIVITY:
   - Add drag-and-drop functionality where appropriate
   - Implement real-time search and filtering
   - Add keyboard shortcuts for power users
   - Include contextual menus and tooltips
   - Support keyboard navigation and accessibility

5. DATA-FOCUSED DESIGN:
   - Input controls should take MINIMAL space (max 20% of screen)
   - 80% of the screen should focus on displaying and visualizing data
   - Use compact, efficient input methods (inline editing, modals)
   - Implement multiple view modes (table, cards, charts)
   - Add data visualization where beneficial

6. RESPONSIVE & MODERN DESIGN:
   - Mobile-first responsive design
   - Modern CSS with custom properties and animations
   - Dark/light mode toggle where appropriate
   - Loading states and progress indicators
   - Smooth transitions and micro-interactions

TECHNICAL REQUIREMENTS FOR ENHANCED SPAs:

- Create a complete, standalone HTML page with embedded CSS and JavaScript
- Use modern web technologies (HTML5, CSS3, ES6+, Web APIs)
- Implement advanced JavaScript patterns (modules, async/await, error handling)
- Include comprehensive form validation and error handling
- Add proper accessibility (ARIA labels, keyboard navigation, screen reader support)
- Implement progressive enhancement and graceful degradation
- Use modern CSS (Grid, Flexbox, Custom Properties, Animations)
- Add service worker for offline functionality where applicable
- Include comprehensive state management with localStorage
- Implement real-time features where appropriate

CONVERSATION FLOW INSTRUCTIONS:
- If this is a follow-up question or clarification request, be conversational and reference previous context
- If you need more information, ask specific, actionable questions
- If you have enough information, generate a complete, functional SPA
- Always explain what you're building and why based on the conversation

RESPONSE FORMAT:
If asking questions: Start with '[QUESTION]' and provide specific questions
If generating SPA: Start with '[SOLUTION]' followed by complete HTML code
Do NOT include markdown formatting - provide raw HTML ready for immediate use

DESIGN THEME: Use a clean, professional design with:
- Modern color palette (blues, grays, whites)
- Consistent spacing and typography
- Clear visual hierarchy
- Intuitive user interface
- Professional business application aesthetics
- Enhanced visual feedback for user actions

Remember: This is a CONVERSATION-AWARE, DATA-FOCUSED project management system with ADVANCED CRUD capabilities!

SPECIFIC COMPONENT REQUIREMENTS WITH CRUD:
";

        // Add enhanced specific requirements for each component type
        foreach ($analysis['components'] as $component) {
            switch ($component) {
                case 'basic_form':
                    $prompt .= "- BASIC FORM: Must have working form submission, validation, result display, data editing capabilities, and form history\n";
                    break;
                case 'data_table':
                    $prompt .= "- DATA TABLE: Must have full CRUD operations, sorting, searching, pagination, inline editing, bulk operations, and data export\n";
                    break;
                case 'calculator':
                    $prompt .= "- CALCULATOR: Must perform all operations, save calculation history, support scientific mode, and export results\n";
                    break;
                case 'dashboard_grid':
                    $prompt .= "- DASHBOARD: Must show real-time stats, support widget customization, data drilling, and dashboard export\n";
                    break;
                case 'card_list':
                    $prompt .= "- CARD LIST: Must support card CRUD operations, drag-and-drop reordering, bulk actions, and view customization\n";
                    break;
                default:
                    $prompt .= "- " . strtoupper(str_replace('_', ' ', $component)) . ": Must be fully interactive with CRUD operations and state persistence\n";
            }
        }

        $prompt .= "
ENHANCED CSS REQUIREMENTS:
- Use modern CSS with custom properties (CSS variables) and color themes
- Implement responsive design with CSS Grid and Flexbox
- Add smooth transitions, hover effects, and micro-animations
- Include loading states, success/error messages, and progress indicators
- Use a professional color scheme with semantic color usage
- Implement consistent spacing scale and typography system

ENHANCED JAVASCRIPT REQUIREMENTS:
- Write clean, modern ES6+ JavaScript with proper error handling
- Implement comprehensive state management with reactive updates
- Add event listeners for ALL interactive elements with proper cleanup
- Use async/await for any network requests or heavy operations
- Add debouncing for search inputs and auto-save functionality
- Include keyboard navigation support and accessibility features
- Persist data to localStorage with versioning and backup strategies
- Implement undo/redo functionality for user actions

ACCESSIBILITY & UX REQUIREMENTS:
- Use semantic HTML elements with proper heading hierarchy
- Add comprehensive ARIA labels, roles, and properties
- Ensure full keyboard navigation with visible focus indicators
- Include screen reader support and high contrast mode
- Implement progressive disclosure and contextual help
- Add confirmation dialogs for destructive actions
- Provide clear feedback for all user actions

You must respond with ONLY the complete HTML code including embedded CSS and JavaScript. No explanations, no markdown formatting - just the working HTML code ready for immediate use.";

        return $prompt;
    }

    /**
     * Build enhanced prompt for OpenAI with component guidance, conversation history, and existing SPA context (legacy method maintained for compatibility)
     */
    private function buildEnhancedCustomViewPrompt(string $userRequest, array $projectContext, array $analysis, ?CustomView $existingView = null, array $conversationHistory = []): string
    {
        // Delegate to the new conversation-aware method for backward compatibility
        return $this->buildConversationAwarePrompt(
            $userRequest, 
            $projectContext, 
            $analysis, 
            $existingView, 
            $conversationHistory, 
            [], // No user requirements extracted for legacy calls
            [] // No conversation session for legacy calls
        );
    }

    /**
     * Build component-based fallback when AI generation fails (legacy method for compatibility)
     */
    private function buildComponentBasedFallback(string $userRequest, array $projectContext, array $analysis, ?CustomView $existingView = null): string
    {
        // Delegate to enhanced method for backward compatibility
        return $this->buildEnhancedComponentBasedFallback(
            $userRequest,
            $projectContext,
            $analysis,
            $existingView,
            ['complexity_score' => 0.5, 'requirements' => []] // Default requirements for legacy calls
        );
    }

    /**
     * Enhance generated HTML with advanced features and better interactivity
     */
    private function enhanceGeneratedHTMLWithAdvancedFeatures(string $html, array $analysis, array $userRequirements, array $projectContext): string
    {
        // If HTML doesn't contain advanced features, enhance it
        if (strpos($html, 'localStorage') === false || strpos($html, 'addEventListener') === false) {
            
            // Add enhanced JavaScript for state management and CRUD operations
            $enhancementScript = "
<script>
// Enhanced State Management System
class AppStateManager {
    constructor(appName) {
        this.appName = appName;
        this.state = this.loadState();
        this.listeners = new Set();
        this.history = [];
        this.historyIndex = -1;
        this.autoSaveInterval = null;
        this.setupAutoSave();
    }
    
    loadState() {
        try {
            const saved = localStorage.getItem(`app-state-\${this.appName}`);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.warn('Failed to load app state:', e);
            return {};
        }
    }
    
    saveState() {
        try {
            localStorage.setItem(`app-state-\${this.appName}`, JSON.stringify(this.state));
            this.notifyListeners();
        } catch (e) {
            console.warn('Failed to save app state:', e);
        }
    }
    
    setState(updates) {
        // Save current state to history for undo
        this.addToHistory();
        
        // Update state
        Object.assign(this.state, updates);
        this.saveState();
    }
    
    getState(key = null) {
        return key ? this.state[key] : this.state;
    }
    
    addToHistory() {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(JSON.parse(JSON.stringify(this.state)));
        this.historyIndex = this.history.length - 1;
        
        // Limit history size
        if (this.history.length > 50) {
            this.history = this.history.slice(-50);
            this.historyIndex = this.history.length - 1;
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.saveState();
            return true;
        }
        return false;
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.saveState();
            return true;
        }
        return false;
    }
    
    setupAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.saveState();
        }, 30000); // Auto-save every 30 seconds
    }
    
    addListener(callback) {
        this.listeners.add(callback);
    }
    
    removeListener(callback) {
        this.listeners.delete(callback);
    }
    
    notifyListeners() {
        this.listeners.forEach(callback => {
            try {
                callback(this.state);
            } catch (e) {
                console.warn('Listener error:', e);
            }
        });
    }
    
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.listeners.clear();
    }
}

// Enhanced CRUD Operations Manager
class CRUDManager {
    constructor(stateManager, entityName) {
        this.stateManager = stateManager;
        this.entityName = entityName;
        this.entityKey = `\${entityName}_data`;
        
        // Initialize entity data if not exists
        if (!this.stateManager.getState(this.entityKey)) {
            this.stateManager.setState({ [this.entityKey]: [] });
        }
    }
    
    create(item) {
        const items = this.getAll();
        const newItem = {
            id: Date.now() + Math.random(),
            ...item,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        items.push(newItem);
        this.stateManager.setState({ [this.entityKey]: items });
        this.showNotification(`\${this.entityName} created successfully`, 'success');
        return newItem;
    }
    
    read(id) {
        const items = this.getAll();
        return items.find(item => item.id == id);
    }
    
    update(id, updates) {
        const items = this.getAll();
        const index = items.findIndex(item => item.id == id);
        
        if (index !== -1) {
            items[index] = {
                ...items[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.stateManager.setState({ [this.entityKey]: items });
            this.showNotification(`\${this.entityName} updated successfully`, 'success');
            return items[index];
        }
        return null;
    }
    
    delete(id) {
        const items = this.getAll();
        const index = items.findIndex(item => item.id == id);
        
        if (index !== -1) {
            const deleted = items.splice(index, 1)[0];
            this.stateManager.setState({ [this.entityKey]: items });
            this.showNotification(`\${this.entityName} deleted successfully`, 'success');
            return deleted;
        }
        return null;
    }
    
    getAll() {
        return this.stateManager.getState(this.entityKey) || [];
    }
    
    search(query, fields = []) {
        const items = this.getAll();
        if (!query) return items;
        
        return items.filter(item => {
            if (fields.length === 0) {
                // Search all string fields
                return Object.values(item).some(value => 
                    typeof value === 'string' && 
                    value.toLowerCase().includes(query.toLowerCase())
                );
            } else {
                // Search specific fields
                return fields.some(field => 
                    item[field] && 
                    item[field].toString().toLowerCase().includes(query.toLowerCase())
                );
            }
        });
    }
    
    bulkDelete(ids) {
        const items = this.getAll();
        const filtered = items.filter(item => !ids.includes(item.id));
        this.stateManager.setState({ [this.entityKey]: filtered });
        this.showNotification(`Deleted \${ids.length} \${this.entityName}(s)`, 'success');
    }
    
    exportData() {
        const items = this.getAll();
        const dataStr = JSON.stringify(items, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `\${this.entityName.toLowerCase()}_export_\${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully', 'success');
    }
    
    importData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            if (Array.isArray(data)) {
                this.stateManager.setState({ [this.entityKey]: data });
                this.showNotification('Data imported successfully', 'success');
                return true;
            }
        } catch (e) {
            this.showNotification('Failed to import data: Invalid format', 'error');
        }
        return false;
    }
    
    showNotification(message, type = 'info') {
        // Enhanced notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: \${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            z-index: 10000;
            font-weight: 500;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            max-width: 300px;
        `;
        notification.innerHTML = `
            <div style=\"display: flex; align-items: center; gap: 8px;\">
                <span>\${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span>\${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.style.transform = 'translateX(0)', 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

// Enhanced UI Utilities
class UIEnhancer {
    static addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z for undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                if (window.appState && window.appState.undo()) {
                    window.location.reload(); // Reload to reflect undo
                }
            }
            
            // Ctrl+Y or Ctrl+Shift+Z for redo
            if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                if (window.appState && window.appState.redo()) {
                    window.location.reload(); // Reload to reflect redo
                }
            }
            
            // Escape to close modals/dialogs
            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.modal.show, .dialog.open');
                openModals.forEach(modal => modal.style.display = 'none');
            }
        });
    }
    
    static enhanceDataTables() {
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            // Add row selection
            const thead = table.querySelector('thead tr');
            if (thead && !thead.querySelector('.select-all-checkbox')) {
                const selectAllTh = document.createElement('th');
                selectAllTh.innerHTML = '<input type=\"checkbox\" class=\"select-all-checkbox\">';
                thead.insertBefore(selectAllTh, thead.firstChild);
                
                const selectAllCheckbox = selectAllTh.querySelector('input');
                selectAllCheckbox.addEventListener('change', (e) => {
                    const checkboxes = table.querySelectorAll('tbody tr input[type=\"checkbox\"]');
                    checkboxes.forEach(cb => cb.checked = e.target.checked);
                });
            }
            
            // Add row checkboxes
            const tbody = table.querySelector('tbody');
            if (tbody) {
                const rows = tbody.querySelectorAll('tr');
                rows.forEach(row => {
                    if (!row.querySelector('.row-checkbox')) {
                        const selectTd = document.createElement('td');
                        selectTd.innerHTML = '<input type=\"checkbox\" class=\"row-checkbox\">';
                        row.insertBefore(selectTd, row.firstChild);
                    }
                });
            }
        });
    }
    
    static addBulkActions() {
        const bulkActionBar = document.createElement('div');
        bulkActionBar.id = 'bulk-action-bar';
        bulkActionBar.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            padding: 12px 20px;
            display: none;
            z-index: 1000;
            gap: 12px;
            align-items: center;
        `;
        bulkActionBar.innerHTML = `
            <span id=\"selected-count\">0 selected</span>
            <button onclick=\"performBulkDelete()\" style=\"background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;\">Delete Selected</button>
            <button onclick=\"clearSelection()\" style=\"background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;\">Clear</button>
        `;
        document.body.appendChild(bulkActionBar);
        
        // Monitor checkbox changes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-checkbox') || e.target.classList.contains('select-all-checkbox')) {
                updateBulkActionBar();
            }
        });
    }
    
    static addLoadingStates() {
        // Add loading overlay capability
        window.showLoading = (message = 'Loading...') => {
            let overlay = document.getElementById('loading-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'loading-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    color: white;
                    font-size: 18px;
                `;
                document.body.appendChild(overlay);
            }
            overlay.innerHTML = `
                <div style=\"text-align: center;\">
                    <div style=\"border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px;\"></div>
                    <div>\${message}</div>
                </div>
            `;
            overlay.style.display = 'flex';
        };
        
        window.hideLoading = () => {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        };
        
        // Add CSS for loading animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// Global utility functions for bulk operations
function updateBulkActionBar() {
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    const bulkActionBar = document.getElementById('bulk-action-bar');
    const selectedCount = document.getElementById('selected-count');
    
    if (selectedCheckboxes.length > 0) {
        bulkActionBar.style.display = 'flex';
        selectedCount.textContent = `\${selectedCheckboxes.length} selected`;
    } else {
        bulkActionBar.style.display = 'none';
    }
}

function performBulkDelete() {
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    if (selectedCheckboxes.length === 0) return;
    
    if (confirm(`Delete \${selectedCheckboxes.length} selected item(s)?`)) {
        selectedCheckboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            if (row) row.remove();
        });
        clearSelection();
        
        // Trigger notification
        const event = new CustomEvent('bulkDelete', { detail: { count: selectedCheckboxes.length } });
        document.dispatchEvent(event);
    }
}

function clearSelection() {
    const checkboxes = document.querySelectorAll('.row-checkbox, .select-all-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    updateBulkActionBar();
}

// Initialize enhanced features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize global state manager
    window.appState = new AppStateManager('custom-spa-" . ($projectContext['project']['id'] ?? 'default') . "');
    
    // Initialize CRUD manager for common entities
    window.crudManager = new CRUDManager(window.appState, 'Item');
    
    // Add UI enhancements
    UIEnhancer.addKeyboardShortcuts();
    UIEnhancer.enhanceDataTables();
    UIEnhancer.addBulkActions();
    UIEnhancer.addLoadingStates();
    
    console.log('Enhanced SPA features initialized successfully');
    
    // Show welcome notification
    setTimeout(() => {
        window.crudManager.showNotification('Enhanced SPA loaded with CRUD operations, keyboard shortcuts, and state persistence!', 'success');
    }, 1000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.appState) {
        window.appState.destroy();
    }
});
</script>";

            // Insert the enhancement script before the closing body tag
            $html = str_replace('</body>', $enhancementScript . '</body>', $html);
        }
        
        return $html;
    }

    /**
     * Build enhanced component-based fallback when AI generation fails
     */
    private function buildEnhancedComponentBasedFallback(
        string $userRequest, 
        array $projectContext, 
        array $analysis, 
        ?CustomView $existingView = null, 
        array $userRequirements = []
    ): string {
        $title = $this->extractTitleFromRequest($userRequest) ?: 'Enhanced Custom Application';
        $complexity = $userRequirements['complexity_score'] ?? 0.5;
        
        $html = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>' . htmlspecialchars($title) . '</title>
    <style>
' . $this->getEnhancedComponentLibraryCSS($complexity) . '
    </style>
</head>
<body>
    <div class="enhanced-container">
        <header class="enhanced-header">
            <div class="header-content">
                <h1>' . htmlspecialchars($title) . '</h1>
                <p>Enhanced application for: <strong>' . htmlspecialchars($projectContext['project']['name']) . '</strong></p>
                <div class="header-actions">
                    <button onclick="window.crudManager.exportData()" class="btn btn-secondary">Export Data</button>
                    <button onclick="showImportDialog()" class="btn btn-secondary">Import Data</button>
                    <button onclick="toggleDarkMode()" class="btn btn-secondary">🌙 Dark Mode</button>
                </div>
            </div>
        </header>
        <main class="enhanced-main">';

        // Add each identified component with enhanced features
        foreach ($analysis['components'] as $component) {
            $template = $this->componentLibrary->getComponentTemplate($component);
            $enhancedTemplate = $this->enhanceComponentTemplate($template, $userRequest, $projectContext, $complexity);
            $html .= $this->customizeComponentTemplate($enhancedTemplate, $userRequest, $projectContext);
        }

        // Add requirements-based components if complexity is high
        if ($complexity > 0.7 && !empty($userRequirements['estimated_components'])) {
            foreach ($userRequirements['estimated_components'] as $component) {
                if (!in_array($component, $analysis['components'])) {
                    $template = $this->componentLibrary->getComponentTemplate($component);
                    $enhancedTemplate = $this->enhanceComponentTemplate($template, $userRequest, $projectContext, $complexity);
                    $html .= $this->customizeComponentTemplate($enhancedTemplate, $userRequest, $projectContext);
                }
            }
        }

        $html .= '
        </main>
        <footer class="enhanced-footer">
            <div class="footer-content">
                <p><small>Enhanced SPA with CRUD operations • ' . count($analysis['components']) . ' components • Complexity: ' . round($complexity * 100) . '%</small></p>
                <div class="footer-actions">
                    <button onclick="window.appState.undo()" class="btn btn-small">↶ Undo</button>
                    <button onclick="window.appState.redo()" class="btn btn-small">↷ Redo</button>
                    <span id="app-status">Ready</span>
                </div>
            </div>
        </footer>
    </div>
    
    <!-- Enhanced Import Dialog -->
    <div id="import-dialog" class="modal" style="display: none;">
        <div class="modal-content">
            <h3>Import Data</h3>
            <textarea id="import-data" placeholder="Paste JSON data here..." style="width: 100%; height: 200px; margin: 10px 0;"></textarea>
            <div class="modal-actions">
                <button onclick="performImport()" class="btn btn-primary">Import</button>
                <button onclick="hideImportDialog()" class="btn btn-secondary">Cancel</button>
            </div>
        </div>
    </div>
    
    <script>
        // Enhanced global utilities for fallback mode
        function showImportDialog() {
            document.getElementById("import-dialog").style.display = "flex";
        }
        
        function hideImportDialog() {
            document.getElementById("import-dialog").style.display = "none";
        }
        
        function performImport() {
            const data = document.getElementById("import-data").value;
            if (window.crudManager && window.crudManager.importData(data)) {
                hideImportDialog();
                setTimeout(() => window.location.reload(), 1000);
            }
        }
        
        function toggleDarkMode() {
            document.body.classList.toggle("dark-mode");
            localStorage.setItem("dark-mode", document.body.classList.contains("dark-mode"));
        }
        
        // Load dark mode preference
        if (localStorage.getItem("dark-mode") === "true") {
            document.body.classList.add("dark-mode");
        }
        
        // Global utilities for enhanced features
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
        
        // Initialize enhanced components
        document.addEventListener("DOMContentLoaded", function() {
            console.log("Enhanced custom application initialized with components:", ' . json_encode($analysis['components']) . ');
            console.log("User requirements extracted:", ' . json_encode($userRequirements) . ');
            
            // Set initial status
            const statusEl = document.getElementById("app-status");
            if (statusEl) {
                statusEl.textContent = "Enhanced features loaded";
                setTimeout(() => statusEl.textContent = "Ready", 2000);
            }
        });
    </script>
</body>
</html>';

        return $html;
    }

    /**
     * Generate a fallback React component when AI generation fails
     */
    private function generateFallbackReactComponent(string $userRequest, array $projectContext): string 
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
     * Get enhanced component library CSS with modern features
     */
    private function getEnhancedComponentLibraryCSS(float $complexity = 0.5): string
    {
        $cssPath = resource_path('css/component-library.css');
        $baseCss = '';
        
        if (file_exists($cssPath)) {
            $baseCss = file_get_contents($cssPath);
        }
        
        // Enhanced CSS with modern features
        $enhancedCss = '
        :root {
            --primary-color: #3b82f6;
            --primary-light: #60a5fa;
            --primary-dark: #1d4ed8;
            --secondary-color: #1f2937;
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #06b6d4;
            --border-radius: 8px;
            --border-radius-lg: 12px;
            --box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --box-shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            --spacing-xs: 0.25rem;
            --spacing-sm: 0.5rem;
            --spacing-md: 1rem;
            --spacing-lg: 1.5rem;
            --spacing-xl: 2rem;
            --font-size-sm: 0.875rem;
            --font-size-base: 1rem;
            --font-size-lg: 1.125rem;
            --font-size-xl: 1.25rem;
            --line-height-tight: 1.25;
            --line-height-normal: 1.5;
            --line-height-relaxed: 1.75;
        }
        
        [data-theme="dark"], .dark-mode {
            --primary-color: #60a5fa;
            --primary-light: #93c5fd;
            --primary-dark: #3b82f6;
            --secondary-color: #f9fafb;
            --background-color: #111827;
            --surface-color: #1f2937;
            --text-primary: #f9fafb;
            --text-secondary: #d1d5db;
            --border-color: #374151;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: var(--line-height-normal);
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            color: var(--secondary-color);
            transition: var(--transition);
            min-height: 100vh;
        }
        
        .dark-mode {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: var(--text-primary);
        }
        
        .enhanced-container {
            max-width: 1400px;
            margin: 0 auto;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .enhanced-header {
            background: white;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--box-shadow);
            margin: var(--spacing-lg);
            padding: var(--spacing-xl);
            animation: slideInFromTop 0.6s ease-out;
        }
        
        .dark-mode .enhanced-header {
            background: var(--surface-color);
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: var(--spacing-md);
        }
        
        .header-actions {
            display: flex;
            gap: var(--spacing-sm);
            flex-wrap: wrap;
        }
        
        .enhanced-main {
            flex: 1;
            padding: 0 var(--spacing-lg) var(--spacing-lg);
            display: grid;
            gap: var(--spacing-xl);
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        }
        
        .enhanced-main > div {
            background: white;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--box-shadow);
            padding: var(--spacing-xl);
            transition: var(--transition);
            animation: slideInFromBottom 0.6s ease-out;
            animation-fill-mode: both;
        }
        
        .dark-mode .enhanced-main > div {
            background: var(--surface-color);
        }
        
        .enhanced-main > div:hover {
            transform: translateY(-2px);
            box-shadow: var(--box-shadow-lg);
        }
        
        .enhanced-footer {
            background: white;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--box-shadow);
            margin: var(--spacing-lg);
            padding: var(--spacing-lg);
        }
        
        .dark-mode .enhanced-footer {
            background: var(--surface-color);
        }
        
        .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: var(--spacing-md);
        }
        
        .footer-actions {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
        }
        
        #app-status {
            font-size: var(--font-size-sm);
            color: var(--success-color);
            font-weight: 500;
        }
        
        /* Enhanced Button Styles */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-sm) var(--spacing-md);
            border: none;
            border-radius: var(--border-radius);
            font-size: var(--font-size-base);
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
            text-decoration: none;
            gap: var(--spacing-xs);
            min-height: 2.5rem;
            position: relative;
            overflow: hidden;
        }
        
        .btn:before {
            content: "";
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
        }
        
        .btn:hover:before {
            left: 100%;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
            color: white;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, var(--primary-dark), var(--primary-color));
            transform: translateY(-1px);
            box-shadow: var(--box-shadow-lg);
        }
        
        .btn-secondary {
            background: var(--secondary-color);
            color: white;
        }
        
        .btn-secondary:hover {
            background: #374151;
            transform: translateY(-1px);
        }
        
        .btn-small {
            padding: var(--spacing-xs) var(--spacing-sm);
            font-size: var(--font-size-sm);
            min-height: 2rem;
        }
        
        .btn-danger {
            background: var(--danger-color);
            color: white;
        }
        
        .btn-danger:hover {
            background: #dc2626;
            transform: translateY(-1px);
        }
        
        /* Enhanced Form Styles */
        .modern-form, .contact-form, .search-form {
            display: grid;
            gap: var(--spacing-md);
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
        }
        
        .form-group label {
            font-weight: 600;
            color: var(--secondary-color);
            font-size: var(--font-size-sm);
        }
        
        .dark-mode .form-group label {
            color: var(--text-secondary);
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
            padding: var(--spacing-sm) var(--spacing-md);
            border: 2px solid #e5e7eb;
            border-radius: var(--border-radius);
            font-size: var(--font-size-base);
            transition: var(--transition);
            background: white;
        }
        
        .dark-mode .form-group input,
        .dark-mode .form-group textarea,
        .dark-mode .form-group select {
            background: #374151;
            border-color: #4b5563;
            color: var(--text-primary);
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        /* Enhanced Table Styles */
        .data-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border-radius: var(--border-radius);
            overflow: hidden;
            box-shadow: var(--box-shadow);
        }
        
        .data-table thead {
            background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
            color: white;
        }
        
        .data-table th,
        .data-table td {
            padding: var(--spacing-md);
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .data-table th {
            font-weight: 600;
            cursor: pointer;
            user-select: none;
            position: relative;
        }
        
        .data-table th:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .data-table tbody tr {
            transition: var(--transition);
        }
        
        .data-table tbody tr:hover {
            background: rgba(59, 130, 246, 0.05);
        }
        
        .dark-mode .data-table tbody tr:hover {
            background: rgba(96, 165, 250, 0.1);
        }
        
        /* Enhanced Card Styles */
        .card {
            background: white;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--box-shadow);
            padding: var(--spacing-lg);
            transition: var(--transition);
            border-left: 4px solid var(--primary-color);
        }
        
        .dark-mode .card {
            background: var(--surface-color);
        }
        
        .card:hover {
            transform: translateY(-2px);
            box-shadow: var(--box-shadow-lg);
        }
        
        .card.active {
            border-left-color: var(--success-color);
        }
        
        .card.inactive {
            border-left-color: var(--danger-color);
            opacity: 0.7;
        }
        
        .card-actions {
            display: flex;
            gap: var(--spacing-sm);
            margin-top: var(--spacing-md);
            flex-wrap: wrap;
        }
        
        /* Modal Styles */
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
            backdrop-filter: blur(4px);
        }
        
        .modal-content {
            background: white;
            border-radius: var(--border-radius-lg);
            padding: var(--spacing-xl);
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            animation: modalSlideIn 0.3s ease-out;
        }
        
        .dark-mode .modal-content {
            background: var(--surface-color);
        }
        
        .modal-actions {
            display: flex;
            gap: var(--spacing-sm);
            justify-content: flex-end;
            margin-top: var(--spacing-lg);
        }
        
        /* Dashboard Grid */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--spacing-lg);
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: var(--spacing-lg);
            border-radius: var(--border-radius-lg);
            text-align: center;
            transition: var(--transition);
        }
        
        .stat-card:hover {
            transform: scale(1.05);
        }
        
        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: var(--spacing-sm);
        }
        
        .stat-label {
            font-size: var(--font-size-sm);
            opacity: 0.9;
        }
        
        /* Animations */
        @keyframes slideInFromTop {
            from {
                opacity: 0;
                transform: translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes slideInFromBottom {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: scale(0.9) translateY(-30px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .enhanced-container {
                margin: 0;
            }
            
            .enhanced-header,
            .enhanced-footer {
                margin: var(--spacing-sm);
                padding: var(--spacing-lg);
            }
            
            .enhanced-main {
                padding: 0 var(--spacing-sm) var(--spacing-sm);
                grid-template-columns: 1fr;
            }
            
            .header-content,
            .footer-content {
                flex-direction: column;
                text-align: center;
            }
            
            .data-table {
                font-size: var(--font-size-sm);
            }
            
            .data-table th,
            .data-table td {
                padding: var(--spacing-sm);
            }
        }
        
        /* Component-specific animations with stagger */
        .enhanced-main > div:nth-child(1) { animation-delay: 0.1s; }
        .enhanced-main > div:nth-child(2) { animation-delay: 0.2s; }
        .enhanced-main > div:nth-child(3) { animation-delay: 0.3s; }
        .enhanced-main > div:nth-child(4) { animation-delay: 0.4s; }
        .enhanced-main > div:nth-child(5) { animation-delay: 0.5s; }
        
        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
        
        /* Focus indicators */
        .btn:focus-visible,
        input:focus-visible,
        textarea:focus-visible,
        select:focus-visible {
            outline: 2px solid var(--primary-color);
            outline-offset: 2px;
        }
        ';
        
        return $baseCss . $enhancedCss;
    }

    /**
     * Enhance component template with advanced features
     */
    private function enhanceComponentTemplate(string $template, string $userRequest, array $projectContext, float $complexity): string
    {
        // Add enhanced features based on complexity
        $enhancements = '';
        
        if ($complexity > 0.3) {
            // Add search functionality
            if (strpos($template, 'table') !== false || strpos($template, 'card') !== false) {
                $enhancements .= '
<div class="enhanced-controls">
    <div class="search-bar">
        <input type="text" id="enhanced-search" placeholder="Search..." style="flex: 1; margin-right: 10px;">
        <select id="enhanced-filter" style="margin-right: 10px;">
            <option value="">All Items</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
        </select>
        <button onclick="toggleViewMode()" class="btn btn-secondary">🔄 View</button>
    </div>
</div>';
            }
        }
        
        if ($complexity > 0.5) {
            // Add advanced CRUD operations
            $enhancements .= '
<div class="crud-controls">
    <button onclick="showCreateDialog()" class="btn btn-primary">➕ Add New</button>
    <button onclick="window.crudManager.exportData()" class="btn btn-secondary">📥 Export</button>
    <button onclick="showBulkActions()" class="btn btn-secondary">🔧 Bulk Actions</button>
</div>';
        }
        
        if ($complexity > 0.7) {
            // Add analytics and reporting
            $enhancements .= '
<div class="analytics-panel">
    <div class="analytics-summary">
        <span id="total-items">0 items</span>
        <span id="recent-activity">No recent activity</span>
        <span id="data-health">📊 Healthy</span>
    </div>
</div>';
        }
        
        // Insert enhancements at the beginning of the template
        return $enhancements . $template;
    }

    /**
     * Get component library CSS (legacy method maintained for compatibility)
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
        try {
            $customView = CustomView::getActiveForProject($project->id, $userId, $viewName);
            
            if ($customView) {
                $customView->updateLastAccessed();
            }
            
            return $customView;
        } catch (\Exception $e) {
            Log::error('[ProjectViewsService] Error in getCustomView', [
                'error' => $e->getMessage(),
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Delete a custom view
     */
    public function deleteCustomView(Project $project, int $userId, string $viewName = 'default'): bool
    {
        $customView = CustomView::getActiveForProject($project->id, $userId, $viewName);

        if ($customView) {
            // Explicitly clear metadata to ensure no orphaned child data remains
            $customView->metadata = null;
            $customView->save();

            return (bool) $customView->delete();
        }

        return false;
    }

    /**
     * Get all active custom views for a project (shared across users)
     */
    public function getAllCustomViews(Project $project, int $userId): array
    {
        return CustomView::where('project_id', $project->id)
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
