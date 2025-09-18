<?php

namespace App\Services;

use App\Models\Project;
use App\Models\CustomView;
use App\Events\CustomViewDataUpdated;
use Illuminate\Support\Facades\Log;
use App\Services\Generative\BlueprintRegistry;
use App\Services\Generative\DesignAnalysisService;
use App\Services\Generative\ImageResearchService;
use App\Services\Generative\PromptBuilderService;
use App\Services\Generative\WorkflowNotifier;

/**
 * GenerativeUIService - Uses AI-SDK for creating React-based micro applications
 * Replaces the old HTML generation approach with modern generative UI
 */
class GenerativeUIService
{
    private OpenAIService $openAIService;
    private GoogleImageService $googleImageService;
    // Refactored helpers (specialized services)
    private BlueprintRegistry $blueprints;
    private DesignAnalysisService $designAnalysis;
    private ImageResearchService $imageResearch;
    private PromptBuilderService $promptBuilder;
    private WorkflowNotifier $workflowNotifier;
    // Smoothing configuration for progress UI
    private int $minStepDurationMs = 550; // minimum visible duration per step
    private int $betweenStepPauseMs = 350; // pause after marking a step completed
    /**
     * Library of reference design patterns for common micro-app requests.
     * Each blueprint captures UI, layout, and functional expectations that should
     * be enforced before code generation begins.
     */
    private array $componentBlueprints = [
        'calculator' => [
            'labels' => ['calculator', 'loan calculator', 'scientific calculator', 'tip calculator'],
            'ui_elements' => [
                'primary result display with high-contrast typography',
                'secondary expression/history display area',
                'numeric keypad with digits 0-9 laid out in a 3x4 grid',
                'operation buttons for add, subtract, multiply, divide, equals',
                'controls for clear entry, clear all, and backspace operations',
                'optional advanced functions section (percent, square root, sign toggle)'
            ],
            'layout_suggestions' => [
                'two-zone layout with displays stacked above control grid',
                'use BeautifulCard for the overall shell with subtle elevation',
                'justify keypad buttons evenly using Grid or Stack with consistent spacing',
                'group primary operations with accent styling for quick identification'
            ],
            'functional_requirements' => [
                'support consecutive calculations without forcing clear between operations',
                'persist history of recent calculations with timestamps and user attribution',
                'allow both click/tap and keyboard input for digits and operators',
                'handle divide-by-zero gracefully with user-friendly messaging',
                'track which authenticated user performed each calculation for collaboration history'
            ],
            'design_checklist' => [
                'display area must feel like a premium calculator (large digits, right-aligned)',
                'numeric keypad arranged in industry-standard order (7-8-9 on the top row)',
                'operators styled distinctly using PrimaryButton/SuccessButton variants',
                'clear controls visually separated from numeric keypad',
                'history panel or card showing at least the last 5 operations with metadata'
            ],
            'structure_outline' => [
                'Center the experience inside BeautifulCard with ContentContainer background echoing Google Calculator.',
                'Header strip with calculator label and mode toggles on the left/right.',
                'Primary display stack containing secondary expression line and bold result line right-aligned.',
                'Keypad grid using 4 columns x 5 rows: digits 7-9 top row, 4-6 middle, 1-3 bottom, 0 spanning bottom center cells, operators at far right.',
                'Utility row containing AC, C, backspace, percent, +/- controls styled as secondary buttons.',
                'Top scientific toggle row (Rad/Deg, Inv, sin, cos, tan, etc.) mirroring the Google scientific calculator layout.',
                'History panel or collapsible drawer beneath keypad showing recent calculations with timestamps and user attribution.'
            ],
            'keywords' => [
                'modern calculator ui',
                'material design calculator layout',
                'financial app keypad interface'
            ],
            'preferred_queries' => [
                'google calculator ui',
                'google calculator interface'
            ],
            'canonical_reference' => 'Google Calculator (current web UI)',
            'replication_instructions' => [
                'Adopt the Google Calculator layout: a white elevated card with a soft shadow centered on a neutral background.',
                'Place the main calculation display across the top with right-aligned digits and a secondary expression line beneath it.',
                'Arrange digits 7-9, 4-6, 1-3 in three rows with 0 spanning the bottom row; keep operators in a dedicated right column.',
                'Use rounded rectangular buttons with clear hierarchy: action keys in light grey, primary operators in Google blue (#1A73E8) or orange accents.',
                'Include dedicated controls for AC/C, backspace, percent, +/- toggles, and ensure keyboard input mirrors button layout.',
                'Space buttons evenly with 12px gaps and apply subtle hover/active states that mimic Google Material styling.',
                'Populate the history list with realistic sample calculations including creator name and timestamp metadata.'
            ],
            'design_style' => 'sleek financial tool with material-inspired surfaces',
            'accessibility_notes' => [
                'ensure buttons have aria-labels for screen readers',
                'provide focus outlines for keyboard navigation',
                'announce calculation results via polite live region'
            ]
        ],
        'calendar' => [
            'labels' => ['calendar', 'event calendar', 'schedule', 'planner', 'agenda'],
            'ui_elements' => [
                'monthly grid with weekday headers',
                'mini month switcher with previous and next controls',
                'side panel listing upcoming events with times and owners',
                'event creation modal with title, date range, and participants',
                'color-coded indicators for event categories or status',
                'current day highlight and today shortcut button'
            ],
            'layout_suggestions' => [
                'two-column design with calendar grid on left and details panel on right',
                'sticky header for month navigation and quick actions',
                'use BeautifulCard framing with subtle dividers between weeks',
                'maintain consistent cell sizing for all days with responsive wrapping'
            ],
            'functional_requirements' => [
                'support event creation, update, and deletion with proper auditing',
                'allow dragging or quick actions to move events between days',
                'display overlapping events without visual collisions',
                'handle multi-day events spanning across week boundaries',
                'surface upcoming events in agenda list with relative timings'
            ],
            'design_checklist' => [
                'calendar grid aligns weekdays (Mon-Sun or Sun-Sat) with clear headers',
                'today is clearly emphasized with accent background and badge',
                'events use chips or cards with readable contrast and truncated text',
                'navigation arrows and month label mimic common calendar UIs',
                'agenda list mirrors Outlook/Google Calendar styling for quick scanning'
            ],
            'structure_outline' => [
                'Top AppBar-style header with navigation chevrons, Today button, centered month/year, and right-aligned search/help/avatar controls.',
                'Secondary toolbar containing Day/Week/Month segmented buttons, color legend chips, and a New Event action.',
                'Main grid occupying 8/12 width rendering 7 columns x 6 rows month grid with date badges and event chips stacked.',
                'Right-hand agenda panel (4/12 width) listing upcoming events grouped by day with icons and participant avatars.',
                'Floating action button styled like Google Calendar “+” in the lower-right for quick event creation.',
                'Footer band summarizing total events, last sync timestamp, and calendar sharing status.'
            ],
            'keywords' => [
                'modern calendar app ui',
                'material design schedule planner',
                'team calendar dashboard design'
            ],
            'preferred_queries' => [
                'google calendar web ui',
                'google calendar month view',
                'google calendar desktop design'
            ],
            'canonical_reference' => 'Google Calendar (current desktop experience)',
            'replication_instructions' => [
                'Match Google Calendar’s bright surface: white cards on a subtle grey (#F1F3F4) backdrop with gentle elevation.',
                'Recreate the top header: left chevrons and Today button, centered month name, right-side search/help/settings icons and user avatar.',
                'Render Day/Week/Month segmented controls with pill buttons and blue active state identical to Google Calendar.',
                'Construct a full 7-column by 6-row month grid with weekday headers, date numbers in the upper-right of each cell, and light grid lines.',
                'Populate realistic sample events as colored chips that stretch across cells, using Google palette colors (#1A73E8, #34A853, #FBBC04, #EA4335).',
                'Add a right-hand agenda column (Upcoming events) listing the next few events with icons and secondary text.',
                'Use Material Design typography (e.g., fontWeight 600 for headers) and layout spacing (8 / 16 / 24 px rhythm).',
                'Use useExternalFactory(\'react-big-calendar\') to access Calendar/Views/localizer via the AI SDK factory; never import react-big-calendar directly.',
                'Include legend chips for calendars and maintain Monday-start week to align with Google Calendar default web layout.'
            ],
            'design_style' => 'clean productivity suite aesthetic with strong grid alignment',
            'accessibility_notes' => [
                'ensure keyboard navigation for moving between days',
                'aria-live announcements when events are created or moved',
                'use sufficient color contrast for category indicators'
            ]
        ],
        'sticky_notes' => [
            'labels' => ['sticky note', 'stickies', 'notes board', 'kanban notes', 'post-it'],
            'ui_elements' => [
                'masonry-style grid of notes with varied heights',
                'note cards with title, body, color tag, and owner avatar',
                'quick add note input aligned to top of board',
                'drag-and-drop reordering with subtle elevation feedback',
                'filters for color/tag/owner and search bar',
                'activity feed noting recent edits and deletions'
            ],
            'layout_suggestions' => [
                'board-style canvas with responsive columns',
                'use BeautifulCard wrapper with soft shadow to mimic corkboard',
                'apply rotating color palette for notes with subtle tilt',
                'include right-side drawer for note details and audit trail'
            ],
            'functional_requirements' => [
                'create, update, delete notes with user tracking',
                'change note colors and tags inline',
                'drag notes between sections or reorder positions',
                'sync note edits instantly across collaborators',
                'support pinning important notes to top'
            ],
            'design_checklist' => [
                'notes look like premium sticky notes with varied but coordinated colors',
                'hover states lift the card with shadow similar to physical stickies',
                'note text is legible with adequate padding and font sizing',
                'board background uses subtle texture or neutral tone',
                'includes quick actions icons (edit/delete/pin) on each note'
            ],
            'structure_outline' => [
                'Header row mirroring Google Keep with board title, search input, filter chips, and Add Note button.',
                'Quick-add composer card across top allowing title/body inputs, color picker chips, reminder and collaborator icons.',
                'Pinned notes row displayed above general notes with slightly larger emphasis.',
                'Responsive masonry grid (CSS columns) for general notes with varied heights and pastel backgrounds.',
                'Each note card includes title, body, color indicator, collaborator avatar stack, and inline actions (pin, archive, delete).',
                'Right sidebar drawer summarizing activity feed, labels, and recently edited notes.',
                'Footer or status bar showing sync status, last updated timestamp, and share controls.'
            ],
            'keywords' => [
                'digital sticky notes ui',
                'modern notes board app design',
                'kanban sticky notes interface'
            ],
            'preferred_queries' => [
                'google keep notes board',
                'google keep sticky notes ui'
            ],
            'canonical_reference' => 'Google Keep sticky notes board',
            'replication_instructions' => [
                'Mirror Google Keep’s grid: staggered masonry of note cards with varied heights and pastel backgrounds on a warm grey canvas.',
                'Each note card should have prominent title, body text, color dot tag, collaborator avatars, and inline action icons (pin, archive, delete).',
                'Provide a top add-note composer with text inputs and color picker chips matching Google Keep styling.',
                'Use soft shadow (Material elevation 2) and 12px rounded corners on notes; apply slight rotation/offset for lively feel.',
                'Include filters for labels/colors as horizontal chips similar to Google Keep’s toolbar.',
                'Ensure drag handles or visual affordances exist for rearranging notes and display a recent activity feed along the right edge.',
                'Use useExternalFactory(\'react-stickies\') to render the sticky board via the AI SDK factory instead of importing react-stickies directly.',
                'Populate sample notes using Google Keep-style pastel palette (#F28B82, #FBBC04, #FFF475, #CCFF90, #A7FFEB, #CBF0F8).' 
            ],
            'design_style' => 'playful yet organized collaboration board',
            'accessibility_notes' => [
                'drag-and-drop must have keyboard alternatives',
                'note colors require accessible contrast for text',
                'announce note operations in activity feed for screen readers'
            ]
        ],
    ];

    public function __construct(OpenAIService $openAIService, GoogleImageService $googleImageService)
    {
        $this->openAIService = $openAIService;
        $this->googleImageService = $googleImageService;
        // Initialize refactored collaborators
        $this->blueprints = new BlueprintRegistry();
        // Keep existing in-file library as source of truth (if present)
        if (property_exists($this, 'componentBlueprints') && is_array($this->componentBlueprints)) {
            $this->blueprints->setBlueprints($this->componentBlueprints);
        }
        $this->designAnalysis = new DesignAnalysisService($this->openAIService, $this->blueprints);
        $this->imageResearch = new ImageResearchService($this->googleImageService);
        $this->promptBuilder = new PromptBuilderService();
        $this->workflowNotifier = new WorkflowNotifier();
    }

    private function msleep(int $ms): void
    {
        if ($ms > 0) {
            usleep($ms * 1000);
        }
    }

    private function ensureMinDuration(float $startedAt): void
    {
        $elapsedMs = (int) ((microtime(true) - $startedAt) * 1000);
        $remaining = $this->minStepDurationMs - $elapsedMs;
        if ($remaining > 0) {
            $this->msleep($remaining);
        }
    }

    /**
     * Process custom view request and generate React component
     */
    public function processCustomViewRequest(
        Project $project, 
        string $userMessage, 
        int $userId,
        ?string $sessionId = null, 
        string $viewName = 'default',
        array $conversationHistory = [],
        ?array $projectContext = null,
        ?string $currentComponentCode = null
    ): array {
        try {
            $workflowSteps = [];
            // Get the authenticated user object for embedding in component
            $authUser = \App\Models\User::find($userId);
            if (!$authUser) {
                throw new \Exception("User not found: {$userId}");
            }
            
            // Get existing view for context
            $existingView = CustomView::getActiveForProject($project->id, $userId, $viewName);
            
            // Enhanced workflow: Check if this is a new SPA request that could benefit from enhanced generation
            $isNewSpaRequest = empty($currentComponentCode) && $this->detectsSpaRequest($userMessage);
            
            $generatedComponent = '';
            
            $totalStepCount = $isNewSpaRequest ? 5 : 4;
            $fallbackSequence = $isNewSpaRequest ? 4 : 3;
            $postSequence = $isNewSpaRequest ? 5 : 4;

            if ($isNewSpaRequest) {
                // Use enhanced 3-step workflow for better UI components
                $generatedComponent = $this->generateEnhancedComponent(
                    $userMessage,
                    $project,
                    $existingView,
                    $conversationHistory,
                    $projectContext,
                    $authUser,
                    $workflowSteps,
                    $viewName
                );
            } else {
                // Use standard workflow for updates or non-SPA requests
                $this->workflowNotifier->broadcast(
                    $project,
                    $viewName,
                    'prompt_preparation',
                    'in_progress',
                    'Preparing update prompt using existing component context.',
                    1,
                    $authUser,
                    4
                );

                $prompt = $this->buildReactComponentPrompt(
                    $userMessage, 
                    $project, 
                    $existingView,
                    $conversationHistory,
                    $projectContext,
                    $currentComponentCode,
                    $authUser
                );

                $workflowSteps[] = [
                    'step' => 'prompt_preparation',
                    'status' => 'completed',
                    'sequence' => 1,
                    'details' => 'Constructed update prompt leveraging existing component context and design blueprint guidance.'
                ];

                $this->workflowNotifier->broadcast(
                    $project,
                    $viewName,
                    'prompt_preparation',
                    'completed',
                    'Constructed update prompt leveraging existing component context and design blueprint guidance.',
                    1,
                    $authUser,
                    4
                );
                $this->msleep($this->betweenStepPauseMs);

                // Generate React component using OpenAI
                $this->workflowNotifier->broadcast(
                    $project,
                    $viewName,
                    'generation',
                    'in_progress',
                    'Generating updated component via standard workflow.',
                    2,
                    $authUser,
                    4
                );

                Log::info('GenerativeUIService: Sending prompt to OpenAI', [
                    'project_id' => $project->id,
                    'user_message' => $userMessage,
                    'is_update_request' => !empty($currentComponentCode),
                    'current_component_length' => $currentComponentCode ? strlen($currentComponentCode) : 0,
                    'has_project_context' => !is_null($projectContext),
                    'project_context_keys' => $projectContext ? array_keys($projectContext) : [],
                    'project_context_summary' => $projectContext ? (function($ctx) {
                        $summary = [
                            'has_tasks' => isset($ctx['tasks']),
                            'has_all_tasks' => isset($ctx['all_tasks']),
                            'all_tasks_count' => isset($ctx['all_tasks']) && is_array($ctx['all_tasks']) ? count($ctx['all_tasks']) : 0,
                            'has_users' => isset($ctx['users']),
                            'users_count' => isset($ctx['users']) && is_array($ctx['users']) ? count($ctx['users']) : 0,
                        ];
                        if (isset($ctx['tasks']) && is_array($ctx['tasks'])) {
                            $t = $ctx['tasks'];
                            $statuses = ['todo','inprogress','review','done','backlog','testing'];
                            $total = isset($t['total_count']) ? (int)$t['total_count'] : 0;
                            if ($total === 0) {
                                foreach ($statuses as $s) {
                                    $total += isset($t[$s]) && is_array($t[$s]) ? count($t[$s]) : 0;
                                }
                            }
                            $summary['task_count'] = $total;
                        } else {
                            $summary['task_count'] = 0;
                        }
                        return $summary;
                    })($projectContext) : null,
                    'prompt_preview' => substr($prompt, 0, 500) . '...'
                ]);
                
                $generatedComponent = $this->openAIService->chatText([
                    [
                        'role' => 'system',
                        'content' => 'You are an expert React developer. You create ONLY React/JSX components. Return ONLY valid React component code with NO explanations, NO markdown formatting, NO code blocks. The code should start with imports and end with the export default statement.'
                    ],
                    [
                        'role' => 'user', 
                        'content' => $prompt
                    ]
                ], 0.2, false);

                $workflowSteps[] = [
                    'step' => 'generation',
                    'status' => 'completed',
                    'sequence' => 2,
                    'details' => 'Updated component generated via standard workflow (' . strlen($generatedComponent) . ' chars).'
                ];

                $this->workflowNotifier->broadcast(
                    $project,
                    $viewName,
                    'generation',
                    'completed',
                    'Updated component generated via standard workflow.',
                    2,
                    $authUser,
                    $totalStepCount
                );
                $this->msleep($this->betweenStepPauseMs);
            }

            // Defensive fallback: if generation is empty, provide a minimal working component for dev
            if (!is_string($generatedComponent) || trim($generatedComponent) === '') {
                Log::warning('OpenAI returned empty component. Using fallback component.');
                $generatedComponent = $this->fallbackReactComponent();
                $workflowSteps[] = [
                    'step' => 'fallback_generation',
                    'status' => 'warning',
                    'sequence' => $fallbackSequence,
                    'details' => 'Primary generation returned empty response; injected guarded fallback component.'
                ];

                $this->workflowNotifier->broadcast(
                    $project,
                    $viewName,
                    'fallback_generation',
                    'warning',
                    'Primary generation empty; using safeguarded fallback component.',
                    $fallbackSequence,
                    $authUser,
                    $totalStepCount
                );
                $this->msleep($this->betweenStepPauseMs);
            }

            // Validate and enhance the generated component
            $enhancedComponent = $this->enhanceReactComponent($generatedComponent, $userMessage, $authUser);

            $workflowSteps[] = [
                'step' => 'post_processing',
                'status' => 'completed',
                'sequence' => $postSequence,
                'details' => 'Enhanced generated component to align with enterprise design helpers and persistence rules.'
            ];

            $this->workflowNotifier->broadcast(
                $project,
                $viewName,
                'post_processing',
                'completed',
                'Post-processed component with enterprise styling and persistence rules.',
                $postSequence,
                $authUser,
                $totalStepCount
            );
            $this->msleep($this->betweenStepPauseMs);

            $isUpdate = !empty($currentComponentCode) && !empty(trim($currentComponentCode));
            
            // Save the generated component
            $customView = CustomView::createOrUpdate(
                $project->id,
                $userId,
                $viewName,
                $enhancedComponent,
                [
                    'type' => 'react_component',
                    'user_request' => $userMessage,
                    'generated_at' => now()->toISOString(),
                    'conversation_history' => $conversationHistory,
                    'is_update' => $isUpdate,
                    'original_component_length' => $isUpdate ? strlen($currentComponentCode) : 0,
                ]
            );

            // Notify UI to gracefully close/minimize the generator chat when done
            try {
                broadcast(new CustomViewDataUpdated(
                    $project->id,
                    $viewName,
                    'ux_action',
                    [ 'action' => 'close_generator', 'reason' => 'generation_complete' ],
                    $authUser
                ));
            } catch (\Throwable $e) {
                Log::debug('UX close_generator broadcast failed', ['error' => $e->getMessage()]);
            }

            return [
                'type' => 'spa_generated',
                'success' => true,
                // Frontend expects `html`; keep `component_code` for compatibility
                'html' => $enhancedComponent,
                'component_code' => $enhancedComponent,
                'custom_view_id' => $customView->id,
                'should_close_generator' => true,
                'message' => $isUpdate 
                    ? 'Custom micro-application updated successfully! Steps: ' . $this->summarizeWorkflowSteps($workflowSteps)
                    : 'Custom micro-application generated successfully! Steps: ' . $this->summarizeWorkflowSteps($workflowSteps),
                'workflow_steps' => $workflowSteps
            ];

        } catch (\Exception $e) {
            Log::error('GenerativeUIService error', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'message' => $userMessage,
                'error' => $e->getMessage()
            ]);

            return [
                'type' => 'error',
                'success' => false,
                'message' => 'Failed to generate custom application. Steps: ' . $this->summarizeWorkflowSteps($workflowSteps ?? []),
                'workflow_steps' => $workflowSteps ?? []
            ];
        }
    }

    /**
     * Detect if the user message is requesting a new SPA/widget/calculator-type application
     */
    private function detectsSpaRequest(string $userMessage): bool
    {
        $spaKeywords = [
            'calculator', 'spa', 'widget', 'app', 'application', 'tool',
            'dashboard', 'component', 'interface', 'form', 'chart',
            'editor', 'viewer', 'manager', 'tracker', 'monitor'
        ];
        
        $lowerMessage = strtolower($userMessage);
        
        foreach ($spaKeywords as $keyword) {
            if (str_contains($lowerMessage, $keyword)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Generate enhanced component using 3-step workflow
     */
    private function generateEnhancedComponent(
        string $userMessage,
        Project $project,
        ?CustomView $existingView,
        array $conversationHistory,
        ?array $projectContext,
        \App\Models\User $authUser,
        array &$workflowSteps,
        string $viewName
    ): string {
        Log::info('GenerativeUIService: Using enhanced 3-step workflow', [
            'user_message' => $userMessage,
            'project_id' => $project->id
        ]);

        try {
            $t0 = microtime(true);
            $this->workflowNotifier->broadcast(
                $project,
                $viewName,
                'analysis',
                'in_progress',
                'Analyzing requested experience to map required UI components and patterns.',
                1,
                $authUser
            );

            // Step 1: Analyze the requested experience to understand required UI components
            $uiAnalysis = $this->designAnalysis->getUIElementsAndKeywords($userMessage);

            // Cross-check against curated blueprints so we don't drift from standard implementations
            $blueprint = $this->blueprints->match($userMessage);
            if ($blueprint) {
                $uiAnalysis = $this->designAnalysis->mergeWithBlueprint($uiAnalysis, $blueprint);
            }

            // Guarantee checklist coverage even when the AI skips details
            $uiAnalysis = $this->designAnalysis->ensureChecklistCompleteness($uiAnalysis, $blueprint ?? null);
            $this->designAnalysis->log($userMessage, $uiAnalysis, $blueprint ?? null);

            $analysisDetails = sprintf(
                'Identified %d UI elements and %d layout cues',
                count($uiAnalysis['ui_elements'] ?? []),
                count($uiAnalysis['layout_suggestions'] ?? [])
            );
            if ($blueprint) {
                $analysisDetails .= " using '{$blueprint['slug']}' blueprint";
            }
            $analysisDetails .= '.';

            $workflowSteps[] = [
                'step' => 'analysis',
                'status' => 'completed',
                'sequence' => 1,
                'details' => $analysisDetails
            ];

            $this->workflowNotifier->broadcast(
                $project,
                $viewName,
                'analysis',
                'completed',
                $analysisDetails,
                1,
                $authUser
            );
            $this->ensureMinDuration($t0);
            $this->msleep($this->betweenStepPauseMs);

            // Step 2: Verify visual patterns by fetching representative designs from Google Images
            $t1 = microtime(true);
            $this->workflowNotifier->broadcast(
                $project,
                $viewName,
                'design_research',
                'in_progress',
                'Collecting high-fidelity reference visuals from Google Image Search.',
                2,
                $authUser
            );

            $requiredImageCount = 10;
            $designImages = $this->imageResearch->collect($uiAnalysis['keywords'] ?? [], $requiredImageCount, $userMessage);

            if (empty($designImages)) {
                Log::warning('GenerativeUIService: No design references found for request', [
                    'user_message' => $userMessage,
                    'keywords' => $uiAnalysis['keywords'] ?? []
                ]);
            } else {
                Log::info('GenerativeUIService: Design references collected', [
                    'count' => count($designImages),
                    'user_message' => $userMessage,
                ]);
            }

            $keywordList = implode(', ', array_slice($uiAnalysis['keywords'] ?? [], 0, 5));

            $workflowSteps[] = [
                'step' => 'design_research',
                'status' => empty($designImages) ? 'warning' : 'completed',
                'sequence' => 2,
                'details' => empty($designImages)
                    ? 'Unable to retrieve design references; defaulting to Material UI baselines.'
                    : sprintf(
                        'Collected %d design references %s.',
                        count($designImages),
                        $keywordList ? 'using keywords: ' . $keywordList : 'using fallback search terms'
                    )
            ];

            $this->workflowNotifier->broadcast(
                $project,
                $viewName,
                'design_research',
                empty($designImages) ? 'warning' : 'completed',
                $workflowSteps[array_key_last($workflowSteps)]['details'] ?? 'Design research completed.',
                2,
                $authUser
            );
            $this->ensureMinDuration($t1);
            $this->msleep($this->betweenStepPauseMs);

            // Step 3: Generate the SPA using the curated prompt (UI analysis + design references)
            $t2 = microtime(true);
            $this->workflowNotifier->broadcast(
                $project,
                $viewName,
                'generation',
                'in_progress',
                'Generating the React SPA to mirror canonical products and references.',
                3,
                $authUser
            );

            $component = $this->generateComponentWithDesignInspiration(
                $userMessage,
                $uiAnalysis,
                $designImages,
                $project,
                $existingView,
                $conversationHistory,
                $projectContext,
                $authUser,
                $viewName,
                $blueprint ?? null,
                $workflowSteps
            );

            // ensure generation step shows for a minimum duration too
            $this->ensureMinDuration($t2);
            $this->msleep($this->betweenStepPauseMs);

            return $component;
            
        } catch (\Exception $e) {
            Log::warning('Enhanced workflow failed, falling back to standard generation', [
                'error' => $e->getMessage(),
                'user_message' => $userMessage
            ]);

            $workflowSteps[] = [
                'step' => 'generation',
                'status' => 'failed',
                'sequence' => 3,
                'details' => 'Enhanced workflow error: ' . $e->getMessage()
            ];

            $this->workflowNotifier->broadcast(
                $project,
                $viewName,
                'generation',
                'failed',
                'Enhanced workflow failed: ' . $e->getMessage(),
                3,
                $authUser
            );
            
            // Fallback to standard prompt generation
            $prompt = $this->buildReactComponentPrompt(
                $userMessage, 
                $project, 
                $existingView,
                $conversationHistory,
                $projectContext,
                null,
                $authUser
            );

            $component = $this->openAIService->chatText([
                [
                    'role' => 'system',
                    'content' => 'You are an expert React developer. You create ONLY React/JSX components. Return ONLY valid React component code with NO explanations, NO markdown formatting, NO code blocks. The code should start with imports and end with the export default statement.'
                ],
                [
                    'role' => 'user', 
                    'content' => $prompt
                ]
            ], 0.2, false);

            $workflowSteps[] = [
                'step' => 'fallback_generation',
                'status' => 'completed',
                'sequence' => 4,
                'details' => 'Fallback prompt executed after enhanced path failed (' . strlen($component) . ' chars).'
            ];

            $this->workflowNotifier->broadcast(
                $project,
                $viewName,
                'fallback_generation',
                'completed',
                'Fallback prompt executed after enhanced workflow failure.',
                4,
                $authUser
            );
            $this->msleep($this->betweenStepPauseMs);

            return $component;
        }
    }

    /**
     * Step 1: Get UI elements and keywords from OpenAI
     */
    private function getUIElementsAndKeywords(string $userRequest): array
    {
        return $this->designAnalysis->getUIElementsAndKeywords($userRequest);
    }

    /**
     * Retrieve a blueprint of expected patterns for well-known component types
     */
    private function getStandardDesignBlueprint(string $userRequest): ?array
    {
        return $this->blueprints->match($userRequest);
    }

    /**
     * Combine AI-provided analysis with curated blueprints so required patterns aren't missed
     */
    private function mergeAnalysisWithBlueprint(array $analysis, ?array $blueprint): array
    {
        return $this->designAnalysis->mergeWithBlueprint($analysis, $blueprint);
    }

    /**
     * Guarantee that the analysis contains a meaningful checklist before generation begins
     */
    private function ensureDesignChecklistCompleteness(array $analysis, ?array $blueprint = null): array
    {
        return $this->designAnalysis->ensureChecklistCompleteness($analysis, $blueprint);
    }

    /**
     * Build a reusable design guidance section for prompts that need explicit verification steps
     */
    private function buildDesignGuidanceSection(string $userRequest, array $analysis, ?array $blueprint = null): string
    {
        return $this->designAnalysis->buildDesignGuidanceSection($userRequest, $analysis, $blueprint);
    }

    /**
     * Helper to merge two string arrays while keeping entries distinct
     */
    private function mergeDistinct(array $primary, array $secondary): array
    {
        // Kept for backward compatibility; prefer DesignAnalysisService::mergeWithBlueprint
        $merged = array_filter(array_map('trim', array_merge($primary, $secondary)));
        return array_values(array_unique($merged));
    }

    /**
     * Centralised logging for design analysis so we can audit blueprint enforcement
     */
    private function logDesignAnalysis(string $userRequest, array $analysis, ?array $blueprint = null): void
    {
        $this->designAnalysis->log($userRequest, $analysis, $blueprint);
    }

    /**
     * Present the fetched design references in a format suitable for the model prompt
     */
    private function formatDesignImageReferences(array $designImages): string
    {
        return $this->imageResearch->formatReferences($designImages);
    }

    /**
     * Summaries workflow steps into a compact string for user messaging
     */
    private function summarizeWorkflowSteps(array $workflowSteps): string
    {
        if (empty($workflowSteps)) {
            return 'no workflow details available';
        }

        $symbols = [
            'completed' => '✔',
            'warning' => '⚠',
            'failed' => '✖',
            'in_progress' => '…'
        ];

        $parts = [];
        usort($workflowSteps, function ($a, $b) {
            $aSeq = $a['sequence'] ?? PHP_INT_MAX;
            $bSeq = $b['sequence'] ?? PHP_INT_MAX;
            if ($aSeq === $bSeq) {
                return 0;
            }
            return $aSeq <=> $bSeq;
        });

        foreach ($workflowSteps as $index => $step) {
            $name = str_replace('_', ' ', $step['step'] ?? 'step');
            $status = $step['status'] ?? 'unknown';
            $symbol = $symbols[$status] ?? '•';
            $sequence = $step['sequence'] ?? ($index + 1);
            $parts[] = sprintf('Step %d %s %s', $sequence, ucwords($name), $symbol);
        }

        return implode(', ', $parts);
    }

    /**
     * Broadcast real-time workflow step updates to the frontend channel.
     */
    private function broadcastWorkflowUpdate(
        Project $project,
        string $viewName,
        string $step,
        string $status,
        string $details,
        int $sequence,
        ?\App\Models\User $authUser = null,
        int $totalSteps = 5
    ): void {
        // Backward-compatible wrapper; prefer using WorkflowNotifier directly
        $this->workflowNotifier->broadcast(
            $project,
            $viewName,
            $step,
            $status,
            $details,
            $sequence,
            $authUser,
            $totalSteps
        );
    }

    /**
     * Step 3: Generate component with design inspiration
     */
    private function generateComponentWithDesignInspiration(
        string $userMessage,
        array $uiAnalysis,
        array $designImages,
        Project $project,
        ?CustomView $existingView,
        array $conversationHistory,
        ?array $projectContext,
        \App\Models\User $authUser,
        string $viewName,
        ?array $blueprint = null,
        array &$workflowSteps = []
    ): string {
        $contextData = $projectContext ? $this->buildEnhancedProjectContext($project, $projectContext) : $this->buildProjectContext($project);
        
        // Get the best design image for inspiration
        $bestImage = $this->imageResearch->getBest($designImages);
        
        $designInspiration = $bestImage ? 
            "DESIGN INSPIRATION IMAGE: {$bestImage['url']} - {$bestImage['title']}" : 
            "No specific design inspiration image available - use modern Material-UI principles";

        $designGuidance = $this->designAnalysis->buildDesignGuidanceSection($userMessage, $uiAnalysis, $blueprint);
        $designReferences = $this->imageResearch->formatReferences($designImages);
        
        // Strengthen canonical replication for common blueprints
        $canonicalContract = '';
        $bp = strtolower((string)($uiAnalysis['blueprint_source'] ?? ''));
        if ($bp === 'calculator') {
            $canonicalContract = "\n\nCANONICAL LAYOUT CONTRACT (CALCULATOR):\n- Use a 4x5 keypad grid with operators on the right.\n- Display: expression line + right-aligned result line.\n- 0 spans two cells on bottom-left; include AC, C, backspace, %, +/-.\n- DO NOT render keys in a single row.";
        } elseif ($bp === 'calendar') {
            $canonicalContract = "\n\nCANONICAL LAYOUT CONTRACT (CALENDAR):\n- Use Templates.Calendar (AI SDK) so react-big-calendar is loaded via useExternalFactory('react-big-calendar'); never build a manual grid.\n- Month view 7x6 grid, Monday start; segmented Day/Week/Month; Today button; right-hand agenda.";
        }

        $prompt = "You are an expert React developer creating a high-quality {$userMessage} component.

ENHANCED DESIGN REQUIREMENTS:
Use this analysis to create a professional, well-designed component:

UI ELEMENTS TO INCLUDE:
" . implode("\n- ", $uiAnalysis['ui_elements']) . "

LAYOUT SUGGESTIONS:
" . implode("\n- ", $uiAnalysis['layout_suggestions']) . "

DESIGN STYLE: {$uiAnalysis['design_style']}

{$designInspiration}

{$designGuidance}

DESIGN VERIFICATION REFERENCES:
{$designReferences}

REPLICATE THE REFERENCES:
Recreate the layout, component hierarchy, and interaction affordances demonstrated in these references. Align button arrangements, grid structures, and supporting panels to match common industry implementations for {$userMessage} experiences.

CRITICAL REQUIREMENTS:
1. **NEVER import StyledComponents, MuiMaterial, or MuiIcons - they are automatically available**
2. **ONLY import React hooks: import React, { useState, useEffect } from 'react';**
3. **Use Material-UI components for professional appearance**
4. **Include ALL UI elements from the analysis above**
5. **Create a polished, production-ready interface**
6. **Use useEmbeddedData hook for ALL persistent data**
7. **Include full CRUD operations (Create, Read, Update, Delete)**
8. **Focus 87% on data display, 13% on input controls**
9. **Use ContentContainer, BeautifulCard, SectionHeader from StyledComponents**
10. **Track current user for all operations**

AVAILABLE COMPONENTS (no imports needed):
- Material-UI: Button, TextField, Select, Card, Typography, Grid, Stack, Box, Paper, Chip, Avatar, etc.
- Icons: AddIcon, EditIcon, DeleteIcon, SaveIcon, CloseIcon, SearchIcon, RefreshIcon, etc.
- StyledComponents: ContentContainer, BeautifulCard, SectionHeader, PrimaryButton, SuccessButton, DangerButton
- Charts: BarChart, LineChart, PieChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend from Recharts
- Calendar: Use Templates.Calendar for interactive calendar with full API (NOT react-big-calendar directly)
- Advanced: Use useExternalFactory() for specialized components

TEMPLATES.CALENDAR API:
Templates.Calendar supports these props for full customization:
- events: Array of events to display
- onEventUpdate: (eventId, updates) => void - Called when event is updated
- onEventDelete: (eventId) => void - Called when event is deleted  
- onEventCreate: (event) => void - Called when new event is created
- onDateClick: (slotInfo) => void - Called when date is clicked
- onEventSelect: (event) => void - Called when event is selected
- onApiReady: (api) => void - Provides full calendar API object
- title: Calendar title (default: 'Team Calendar')
- defaultView: 'month'|'week'|'day' (default: 'month')
- selectable: boolean - Allow date selection (default: true)
- editable: boolean - Allow event editing (default: true)
- showCreateDialog: boolean - Show create event dialog (default: true)
- showEventDetails: boolean - Show event details panel (default: true)
- showUpcoming: boolean - Show upcoming events panel (default: true)

Example usage:
```jsx
<Templates.Calendar
    events={events}
    onEventUpdate={(id, updates) => updateEvent(id, updates)}
    onEventDelete={(id) => deleteEvent(id)}
    onApiReady={(api) => {
        // Access full calendar API: api.createEvent(), api.navigate(), etc.
        setCalendarAPI(api);
    }}
    title=\"Project Calendar\"
    defaultView=\"week\"
/>
```

IMPORTANT USAGE RULES:
- Icons must use exact names: AddIcon, EditIcon, DeleteIcon (with 'Icon' suffix)
- For calendars, use Templates.Calendar component, never import react-big-calendar
- All Material-UI components available directly: <Button>, <TextField>, <Grid>, etc.
- StyledComponents available directly: <ContentContainer>, <BeautifulCard>, etc.
- Never use undefined components like <Templates.SomeComponent> unless specified above

PROJECT CONTEXT:
{$contextData}

USER REQUEST: \"{$userMessage}\"

Create a complete, functional React component that implements the requested functionality with professional design and all the UI elements identified in the analysis. Make it look like a production-ready application, not a minimal demo.

Before writing JSX, mentally validate the layout against the checklist above. If a required element is missing, adjust the plan so the final UI reflects common real-world implementations.

Return ONLY the complete React component code - no explanations, no markdown formatting.";

        // Build final prompt using specialized PromptBuilder
        $prompt = $this->promptBuilder->buildCreatePrompt(
            $userMessage,
            $contextData,
            $uiAnalysis,
            $designInspiration,
            $designGuidance . $canonicalContract,
            $designReferences
        );

        $component = $this->openAIService->chatText([
            [
                'role' => 'system',
                'content' => 'You are an expert React developer creating professional, production-ready components. You create ONLY React/JSX components with sophisticated UI design. Return ONLY valid React component code with NO explanations, NO markdown formatting, NO code blocks.'
            ],
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ], 0.4, false);

        Log::info('Enhanced component generated', [
            'user_message' => $userMessage,
            'design_images_used' => count($designImages),
            'ui_elements_count' => count($uiAnalysis['ui_elements']),
            'component_length' => strlen($component)
        ]);

        $workflowSteps[] = [
            'step' => 'generation',
            'status' => 'completed',
            'sequence' => 3,
            'details' => sprintf(
                'Generated component with %d UI elements and %d design references (%d chars).',
                count($uiAnalysis['ui_elements'] ?? []),
                count($designImages),
                strlen($component)
            )
        ];

        $this->workflowNotifier->broadcast(
            $project,
            $viewName,
            'generation',
            'completed',
            $workflowSteps[array_key_last($workflowSteps)]['details'],
            3,
            $authUser
        );
        $this->msleep($this->betweenStepPauseMs);

        return $component;
    }

    /**
     * Minimal fallback component to ensure UX continuity when AI generation is unavailable
     */
    private function fallbackReactComponent(): string
    {
        return <<<'REACT'
import React, { useMemo, useState } from 'react';

export default function GeneratedMicroApp({ project, auth, tasks = [], allTasks = [], users = [] }) {
    const { ContentContainer, BeautifulCard, SectionHeader, FormContainer, PrimaryButton, SuccessButton, DangerButton } = StyledComponents;

    const currentUser = auth?.user || auth || { id: 0, name: 'Guest User', email: 'guest@example.com' };
    const safeProject = project || {};
    const safeUsers = Array.isArray(users) ? users : [];
    const initialTasks = Array.isArray(tasks) && tasks.length ? tasks : (Array.isArray(allTasks) ? allTasks : []);
    const [dashboardData, setDashboardData] = useEmbeddedData('fallback-dashboard', {
        tasks: initialTasks,
        notes: [],
        lastRefreshed: new Date().toISOString(),
        lastUpdatedBy: currentUser
    });
    const [newNote, setNewNote] = useState('');
    const effectiveTasks = dashboardData?.tasks?.length ? dashboardData.tasks : initialTasks;
    const notes = dashboardData?.notes || [];

    const statusSummary = useMemo(() => {
        const statuses = ['todo', 'inprogress', 'review', 'done', 'backlog', 'testing'];
        return statuses.map((status) => {
            const label = status.charAt(0).toUpperCase() + status.slice(1);
            const items = effectiveTasks.filter((task) => (task?.status || 'todo') === status);
            return {
                status,
                label,
                count: items.length,
            };
        });
    }, [effectiveTasks]);

    const completionRate = useMemo(() => {
        if (!effectiveTasks.length) {
            return 0;
        }
        const doneCount = effectiveTasks.filter((task) => (task?.status || '').toLowerCase() === 'done').length;
        return Math.round((doneCount / effectiveTasks.length) * 100);
    }, [effectiveTasks]);

    const upcomingTasks = useMemo(() => {
        return [...effectiveTasks]
            .filter((task) => Boolean(task?.due_date))
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
            .slice(0, 5);
    }, [effectiveTasks]);

    const handleRefresh = () => {
        setDashboardData({
            ...dashboardData,
            lastRefreshed: new Date().toISOString(),
            lastUpdatedBy: currentUser,
        });
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        const note = {
            id: Date.now(),
            content: newNote.trim(),
            created_at: new Date().toISOString(),
            created_by: currentUser.id,
            author: currentUser,
        };
        setDashboardData({
            ...dashboardData,
            notes: [...notes, note],
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser,
        });
        setNewNote('');
    };

    const handleClearNotes = () => {
        if (!notes.length) return;
        const deletionRecords = notes.map((note) => ({
            id: note.id,
            content: note.content,
            deleted_at: new Date().toISOString(),
            deleted_by: currentUser.id,
            deleted_by_user: currentUser,
        }));
        setDashboardData({
            ...dashboardData,
            notes: [],
            deletions: [...(dashboardData?.deletions || []), ...deletionRecords],
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser,
        });
    };

    return (
        <ContentContainer maxWidth="xl" sx={{ py: designTokens.spacing.xl, px: designTokens.spacing.xl }}>
            <Stack spacing={designTokens.spacing.xl}>
                <BeautifulCard sx={{ padding: designTokens.spacing.xl }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={designTokens.spacing.lg}>
                        <div>
                            <SectionHeader sx={{ borderBottomWidth: 0, marginBottom: designTokens.spacing.sm }}>
                                {safeProject?.name || 'Project Experience'}
                            </SectionHeader>
                            <Typography variant="body1" color={designTokens.colors.neutral[600]}>
                                Curated for {currentUser?.name || 'Guest'} with {safeUsers.length} collaborators.
                            </Typography>
                            <Typography variant="body2" color={designTokens.colors.neutral[500]} sx={{ marginTop: designTokens.spacing.xs }}>
                                Last refreshed {dashboardData?.lastRefreshed ? new Date(dashboardData.lastRefreshed).toLocaleString() : 'recently'}.
                            </Typography>
                        </div>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={designTokens.spacing.sm}>
                            <PrimaryButton startIcon={<RefreshIcon />} onClick={handleRefresh}>
                                Refresh Insights
                            </PrimaryButton>
                            <SuccessButton startIcon={<AddIcon />} onClick={handleAddNote} disabled={!newNote.trim()}>
                                Save Highlight
                            </SuccessButton>
                            <DangerButton startIcon={<DeleteIcon />} onClick={handleClearNotes} disabled={!notes.length}>
                                Clear Notes
                            </DangerButton>
                        </Stack>
                    </Stack>
                </BeautifulCard>

                <Grid container spacing={designTokens.spacing.lg}>
                    <Grid item xs={12} md={8}>
                        <BeautifulCard sx={{ padding: designTokens.spacing.xl }}>
                            <SectionHeader>Delivery Momentum</SectionHeader>
                            <Stack spacing={designTokens.spacing.md}>
                                <Stack direction="row" spacing={designTokens.spacing.sm} alignItems="center">
                                    <Typography variant="h4" fontWeight={700}>
                                        {completionRate}%
                                    </Typography>
                                    <Chip label="Done" color="success" variant="filled" />
                                    <Chip label={`${effectiveTasks.length} tasks`} variant="outlined" />
                                </Stack>
                                <LinearProgress variant="determinate" value={completionRate} sx={{ height: 10, borderRadius: designTokens.borderRadius.lg }} />
                            </Stack>
                            <Divider sx={{ my: designTokens.spacing.md }} />
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={statusSummary}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="label" />
                                    <YAxis allowDecimals={false} />
                                    <RechartsTooltip cursor={{ fill: 'rgba(14,165,233,0.1)' }} />
                                    <Bar dataKey="count" fill={designTokens.colors.primary[500]} radius={[12, 12, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </BeautifulCard>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <BeautifulCard sx={{ padding: designTokens.spacing.xl, height: '100%' }}>
                            <SectionHeader>Upcoming Commitments</SectionHeader>
                            <Stack spacing={designTokens.spacing.sm}>
                                {upcomingTasks.length === 0 && (
                                    <Typography variant="body2" color={designTokens.colors.neutral[500]}>
                                        No upcoming deadlines detected.
                                    </Typography>
                                )}
                                {upcomingTasks.map((task) => (
                                    <Box
                                        key={task.id}
                                        sx={{
                                            border: '1px solid ' + designTokens.colors.neutral[200],
                                            borderRadius: designTokens.borderRadius.lg,
                                            padding: designTokens.spacing.md,
                                            background: '#fff',
                                        }}
                                    >
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            {task.title}
                                        </Typography>
                                        <Stack direction="row" spacing={designTokens.spacing.xs} alignItems="center" sx={{ mt: designTokens.spacing.xs }}>
                                            <Chip size="small" color="primary" label={(task.status || 'todo').toUpperCase()} />
                                            {task.priority && <Chip size="small" color="warning" variant="outlined" label={`Priority: ${task.priority}`} />}
                                        </Stack>
                                        <Typography variant="body2" color={designTokens.colors.neutral[500]} sx={{ mt: designTokens.spacing.xs }}>
                                            Due {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'TBD'}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                        </BeautifulCard>
                    </Grid>
                </Grid>

                <BeautifulCard sx={{ padding: designTokens.spacing.xl }}>
                    <SectionHeader>Collaboration Notes</SectionHeader>
                    <FormContainer sx={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={designTokens.spacing.sm}>
                            <TextField
                                fullWidth
                                label="Celebrate a win or flag a risk"
                                value={newNote}
                                onChange={(event) => setNewNote(event.target.value)}
                                placeholder="Example: Release candidate ready for QA hand-off"
                            />
                            <SuccessButton onClick={handleAddNote} disabled={!newNote.trim()} startIcon={<AddIcon />}>
                                Append Note
                            </SuccessButton>
                        </Stack>
                    </FormContainer>
                    <Stack spacing={designTokens.spacing.sm} sx={{ mt: designTokens.spacing.md }}>
                        {notes.length === 0 && (
                            <Typography variant="body2" color={designTokens.colors.neutral[500]}>
                                No notes captured yet. Share a highlight to get started.
                            </Typography>
                        )}
                        {notes.map((note) => (
                            <Box
                                key={note.id}
                                sx={{
                                    padding: designTokens.spacing.md,
                                    borderRadius: designTokens.borderRadius.lg,
                                    background: designTokens.colors.neutral[50],
                                    border: '1px solid ' + designTokens.colors.neutral[200],
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={designTokens.spacing.sm}>
                                    <Avatar sx={{ width: 32, height: 32, background: designTokens.gradients.primary }}>
                                        {(note.author?.name || currentUser.name || 'User').charAt(0).toUpperCase()}
                                    </Avatar>
                                    <div>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            {note.author?.name || currentUser.name}
                                        </Typography>
                                        <Typography variant="caption" color={designTokens.colors.neutral[500]}>
                                            {new Date(note.created_at).toLocaleString()}
                                        </Typography>
                                    </div>
                                    <Chip size="small" variant="outlined" label={note.author?.email || currentUser.email} />
                                </Stack>
                                <Typography variant="body1" sx={{ mt: designTokens.spacing.sm }}>
                                    {note.content}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </BeautifulCard>
            </Stack>
        </ContentContainer>
    );
}
REACT;
    }

    /**
     * Build specialized prompt for React component generation
     */
    private function buildReactComponentPrompt(
        string $userRequest, 
        Project $project, 
        ?CustomView $existingView = null,
        array $conversationHistory = [],
        ?array $projectContext = null,
        ?string $currentComponentCode = null,
        ?\App\Models\User $authUser = null
    ): string {
        // Use enhanced project context if provided, otherwise fall back to basic context
        $contextData = $projectContext ? $this->buildEnhancedProjectContext($project, $projectContext) : $this->buildProjectContext($project);
        $componentStructure = $this->getReactComponentStructure();

        // Determine if this is an update request
        $isUpdateRequest = !empty($currentComponentCode) && !empty(trim($currentComponentCode));

        $blueprint = $this->getStandardDesignBlueprint($userRequest);
        $promptAnalysis = [
            'ui_elements' => $blueprint['ui_elements'] ?? [],
            'layout_suggestions' => $blueprint['layout_suggestions'] ?? [],
            'functional_requirements' => $blueprint['functional_requirements'] ?? [],
            'design_checklist' => $blueprint['design_checklist'] ?? [],
            'accessibility_notes' => $blueprint['accessibility_notes'] ?? [],
        ];
        $promptAnalysis = $this->ensureDesignChecklistCompleteness($promptAnalysis, $blueprint ?? null);
        if ($blueprint) {
            $this->logDesignAnalysis($userRequest, $promptAnalysis, $blueprint);
        }
        $designGuidance = $this->buildDesignGuidanceSection($userRequest, $promptAnalysis, $blueprint ?? null);
        // Add a strict canonical contract for well-known blueprints to avoid off-spec layouts
        $canonicalContract = '';
        $bpSlug = strtolower((string)($blueprint['slug'] ?? ''));
        if ($bpSlug === 'calculator') {
            $canonicalContract = "\n\nSTRICT LAYOUT CONTRACT (CALCULATOR):\n- 4x5 keypad grid with operators in the right column.\n- Two-line display (expression above, right-aligned result below).\n- 0 spans two cells in the bottom row; include AC, C, backspace, %, +/-.\n- Do NOT render digits in a single row — must be a grid.";
        } elseif ($bpSlug === 'calendar') {
            $canonicalContract = "\n\nSTRICT LAYOUT CONTRACT (CALENDAR):\n- Use Templates.Calendar (AI SDK) so react-big-calendar loads via useExternalFactory('react-big-calendar').\n- Month view 7x6 grid with weekday headers, Monday start; include Today button, Day/Week/Month segmented control, right-hand agenda panel.";
        }
        $designGuidance .= $canonicalContract;

        if ($isUpdateRequest) {
            $prompt = "You are an expert React developer specializing in updating and modifying existing data-focused micro-applications.

MODIFICATION TASK:
The user wants to modify an EXISTING React component. Your job is to update the current component according to their request while preserving working functionality.

CRITICAL REQUIREMENTS FOR UPDATES:
1. PRESERVE existing component structure and working features unless explicitly asked to change them
2. MAINTAIN all current state management and data initialization patterns
3. **CONTINUE to use the provided REAL DATA - never switch to API calls or hardcoded arrays**
4. Keep the same data-focused design principles (87% display, 13% controls)
5. Only modify the specific aspects mentioned in the user's request
6. Ensure backward compatibility with existing data flow
7. Maintain responsive design and existing styling patterns
8. Uphold the enterprise design system: keep using StyledComponents helpers (ContentContainer, BeautifulCard, SectionHeader, PrimaryButton/SuccessButton/DangerButton) or upgrade raw elements to them as part of the change
9. Replace any plain HTML controls (button, input, select) introduced by the request with the polished Material UI or StyledComponents equivalents so the surface stays professional
10. Use useExternalFactory('<name>') when introducing calendar, sticky notes, or other advanced libraries so the AI SDK factory handles loading — never import npm packages directly

{$designGuidance}

COMMON UPDATE SCENARIOS:
- **Add Column to Table**: Add new column without breaking existing columns
- **Change Colors/Styling**: Update CSS properties while preserving layout
- **Add New Feature**: Integrate new functionality with existing state management
- **Modify Layout**: Adjust positioning while keeping all existing elements
- **Update Data Fields**: Add new data properties without losing existing ones
- **Change Validation**: Modify form validation while keeping existing logic

CURRENT COMPONENT CODE:
```jsx
{$currentComponentCode}
```

PROJECT CONTEXT (for reference):
{$contextData}

USER MODIFICATION REQUEST: \"{$userRequest}\"

CONVERSATION HISTORY:
" . (!empty($conversationHistory) ? json_encode(array_slice($conversationHistory, -3), JSON_PRETTY_PRINT) : "No previous conversation") . "

RESPONSE FORMAT:
Provide ONLY the UPDATED complete React component code (TSX/JSX) that:
- Incorporates the user's requested changes
- Preserves all working functionality not mentioned in the request
- Continues to use the REAL DATA from project context
- Maintains the same data initialization patterns
- Exports a default component via `export default function Name() { ... }`
- Persists user data changes using the provided helpers: `saveViewData(key, data)` and `loadViewData(key)`
- No explanations, no markdown - just the working JSX component ready for immediate use

Remember: This is an UPDATE, not a complete rewrite. Preserve what works, modify only what's requested.

TEMPLATES TOOLBOX (available globally, do not import):
- Templates.WikiPage({ title, sections:[{heading, body}], persistKey })
- Templates.Docs({ pages:[{id, title, body}], sidebarItems:[], defaultPage, persistKey })
- Templates.Slides({ slides:[{title, content}], persistKey })
- Templates.Spreadsheet({ columns:[{field, headerName}], rows:[{id,...}], persistKey })
- Templates.CRMBoard({ stages:['Todo','In Progress','Done'], items:[{title, description, status}], persistKey })

 - Templates.PMBoard(alias of CRMBoard)
 - Templates.OKRTracker({ objectives:[{ objective, key_result, owner, progress }], persistKey })
 - Templates.HRLeave({ requests:[{ employee, type, start, end, status }], persistKey })
 - Templates.PMBoard(alias of CRMBoard)
 - Templates.OKRTracker({ objectives:[{ objective, key_result, owner, progress }], persistKey })
 - Templates.HRLeave({ requests:[{ employee, type, start, end, status }], persistKey })
- Templates.PMBoard(alias of CRMBoard)
- Templates.OKRTracker({ objectives:[{ objective, key_result, owner, progress }], persistKey })
- Templates.HRLeave({ requests:[{ employee, type, start, end, status }], persistKey })

Usage (keep streaming unchanged):
1) Instantiate directly in JSX: `return (<Templates.WikiPage title=\"Runbook\" sections={[...]} />)`
2) Or emit only an embedded config and the runtime will auto-render the template:
   /* EMBEDDED_DATA_START */ const __EMBEDDED_DATA__ = { template: 'Slides', config: { slides: [{ title: 'Q1 Review', content: '...' }] } } /* EMBEDDED_DATA_END */";
        } else {
            $prompt = "You are an expert React developer specializing in creating data-focused micro-applications using modern React patterns.

CRITICAL IMPORT REQUIREMENTS:
1. **NEVER import StyledComponents, MuiMaterial, or MuiIcons - they are automatically available**
2. **ONLY import React hooks: import React, { useState, useEffect } from 'react';**
3. **DO NOT import any external libraries - all components and icons are pre-loaded**
4. **Icons are available as AddIcon, EditIcon, DeleteIcon (with 'Icon' suffix)**
5. **All Material-UI components are available without imports**
6. **NEVER use import paths like './StyledComponents' or '@mui/material' - everything is global**

CRITICAL REQUIREMENTS:
1. Generate a COMPLETE, FUNCTIONAL React component that can be directly used
2. **MANDATORY: Use useEmbeddedData hook for ALL persistent data - prevents race conditions**
3. **NEVER use separate useState + useEffect patterns for data loading/saving - causes data loss**
4. **NEVER use API calls like csrfFetch('/api/tasks') - USE THE PROVIDED REAL DATA instead**
5. **MANDATORY: Always include useEffect in imports if using it: import React, { useState, useEffect } from 'react';**
6. **MANDATORY: Use authenticated user for current user: const currentUser = authUser || { name: 'Anonymous' }; NOT the first user from users array**
7. **CRITICAL: authUser represents the CURRENT VIEWER/USER of the component, NOT the component creator - supports collaborative usage**
8. **MANDATORY: Track user for ALL CRUD operations - CREATE (creator, created_by), UPDATE (updated_by, last_editor), DELETE (deleted_by, deleted_by_user)**
9. **MANDATORY: Include timestamp tracking - created_at, updated_at, deleted_at for all operations**
10. Initialize state with the ACTUAL project data provided in the context below AND via props injected by the host renderer
11. **MANDATORY: Include FULL CRUD OPERATIONS (Create, Read, Update, Delete) for all data entities**
12. Input controls must take LESS THAN 13% of the workspace - focus 87%+ on data display
13. **MANDATORY: Wrap the entire experience inside `<ContentContainer>` from StyledComponents and stage data inside BeautifulCard/Paper sections for an enterprise layout**
14. **MANDATORY: Destructure StyledComponents at the top: `const { ContentContainer, BeautifulCard, SectionHeader, FormContainer, PrimaryButton, SuccessButton, DangerButton } = StyledComponents;` and use these helpers for structure and call-to-actions**
15. **NEVER output raw HTML interactive elements (`<button>`, `<input>`, `<select>`, `<textarea>`). Replace them with StyledComponents helpers or equivalent MUI components (Button, TextField, Select) styled with design tokens**
16. **Showcase premium styling: leverage designTokens/styleUtils for spacing, elevation, gradients, and pair actions with AddIcon, EditIcon, DeleteIcon for immediate visual affordances**
17. **CRITICAL: Use icon names with 'Icon' suffix - AddIcon, EditIcon, DeleteIcon, SaveIcon, etc.**
18. Include proper TypeScript types if applicable
19. Add loading states, error handling, and user feedback using MUI Alert/Snackbar components when relevant
20. Ensure mobile-responsive design using Stack/Grid breakpoints and responsive props
21. Export a default component: `export default function Name() { ... }`
22. **CRITICAL: ALL React hooks (useState, useEmbeddedData, useEffect, etc.) MUST be at the TOP LEVEL - NEVER inside conditions, loops, or functions**
23. **CRITICAL: Follow the Rules of Hooks - hooks must always be called in the same order on every render**
24. **CRITICAL: Data persistence is handled by useEmbeddedData - ensures cross-user sharing and eliminates race conditions**
25. **CRITICAL: Always check array length before accessing elements: users.length > 0 ? users[0] : defaultUser**
26. **MANDATORY: Show who created/edited each item in the UI with timestamps for full collaboration transparency**
27. **MANDATORY: When leveraging advanced UI packages (calendar, sticky notes, etc.), load them via useExternalFactory('<name>') provided by the runtime — never import npm packages or use require().**

{$designGuidance}

MANDATORY CRUD OPERATIONS:
- **CREATE**: Always include forms/inputs to add new items (modals, inline forms, or dedicated sections)
- **READ**: Display data in tables, cards, or lists with search/filter capabilities
- **UPDATE**: Enable editing existing items (inline editing, edit modals, or edit forms)
- **DELETE**: Provide delete functionality with confirmation dialogs
- **VALIDATION**: Add input validation and error handling for all operations
- **PERSISTENCE**: Use saveViewData() to persist all changes immediately

TEMPLATES TOOLBOX (available globally, do not import):
- Templates.WikiPage({ title, sections:[{heading, body}], persistKey })
- Templates.Docs({ pages:[{id, title, body}], sidebarItems:[], defaultPage, persistKey })
- Templates.Slides({ slides:[{title, content}], persistKey })
- Templates.Spreadsheet({ columns:[{field, headerName}], rows:[{id,...}], persistKey })
 - Templates.CRMBoard({ stages:['Todo','In Progress','Done'], items:[{title, description, status}], persistKey })

Usage (keep streaming unchanged):
1) Instantiate directly in JSX: `return (<Templates.WikiPage title=\"Runbook\" sections={[...]} />)`
2) Or emit only an embedded config and the runtime will auto-render the template:
   /* EMBEDDED_DATA_START */ const __EMBEDDED_DATA__ = { template: 'Slides', config: { slides: [{ title: 'Q1 Review', content: '...' }] } } /* EMBEDDED_DATA_END */

AVAILABLE CHART LIBRARIES:
For data visualization, you have access to Recharts components (NO IMPORT NEEDED):
- **Bar Charts**: <BarChart width={600} height={300} data={data}><Bar dataKey=\"value\" /></BarChart>
- **Pie Charts**: <PieChart width={400} height={300}><Pie data={data} dataKey=\"value\" nameKey=\"name\" /></PieChart>
- **Line Charts**: <LineChart width={600} height={300} data={data}><Line dataKey=\"value\" /></LineChart>
- **Area Charts**: <AreaChart width={600} height={300} data={data}><Area dataKey=\"value\" /></AreaChart>
- **Chart Components**: ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
- **DO NOT use react-chartjs-2 or Chart.js** - use Recharts syntax only
- **Example**: <ResponsiveContainer width=\"100%\" height={300}><BarChart data={tasksByStatus}><XAxis dataKey=\"name\" /><YAxis /><Tooltip /><Bar dataKey=\"count\" fill=\"#8884d8\" /></BarChart></ResponsiveContainer>

REQUIRED DATA PERSISTENCE PATTERN (COPY THIS EXACTLY):
```tsx
// CRITICAL: Use useEmbeddedData hook for race-condition-free data persistence
// This hook automatically handles embedded data initialization and server persistence
const [itemsData, setItemsData] = useEmbeddedData('main-data', { items: [], deletions: [] });
const items = itemsData?.items || [];

// CRITICAL: Always track current user for proper collaboration
// authUser represents the CURRENT VIEWER, not the component creator
// Multiple project members can use the same component with their own identity
const users = usersDataFromProps || __users || [];
const currentUser = authUser || { id: 1, name: 'Anonymous', email: 'user@example.com' };

const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// CRITICAL: useEmbeddedData replaces separate useState + useEffect patterns
// NO NEED for separate loading/saving useEffect hooks - handled automatically
// The hook safely initializes from embedded data and auto-saves changes

// Example CRUD operations that update data and trigger auto-save WITH USER TRACKING
const addItem = (newItem) => {
  const item = { 
    id: Date.now(), 
    ...newItem,
    creator: currentUser,
    created_at: new Date().toISOString(),
    created_by: currentUser.id,
    updated_at: new Date().toISOString(),
    updated_by: currentUser.id
  };
  const updatedData = {
    ...itemsData,
    items: [...items, item],
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: currentUser
  };
  setItemsData(updatedData);
};

const updateItem = (id, updates) => {
  const updatedData = {
    ...itemsData,
    items: items.map(item => item.id === id ? { 
      ...item, 
      ...updates, 
      updated_at: new Date().toISOString(),
      updated_by: currentUser.id,
      last_editor: currentUser
    } : item),
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: currentUser
  };
  setItemsData(updatedData);
};

const deleteItem = (id) => {
  // Track deletion with user info before removing
  const itemToDelete = items.find(item => item.id === id);
  const deletionRecord = {
    id: itemToDelete?.id,
    title: itemToDelete?.title || itemToDelete?.name || 'Unknown Item',
    deleted_at: new Date().toISOString(),
    deleted_by: currentUser.id,
    deleted_by_user: currentUser
  };
  
  const updatedData = {
    ...itemsData,
    items: items.filter(item => item.id !== id),
    deletions: [...(itemsData.deletions || []), deletionRecord],
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: currentUser
  };
  setItemsData(updatedData);
};

// CRITICAL RULE: ALL useState and useEmbeddedData calls must be at the TOP LEVEL
// NEVER put hooks inside if statements, loops, or functions
```

DATA-FOCUSED DESIGN PRINCIPLES:
- Minimize input forms - use inline editing, modals, or compact controls
- Maximize data visualization and display area  
- Use tables, cards, charts, or lists as primary content
- Add search, filtering, and sorting capabilities
- Include data export/import functionality where relevant
- **START WITH REAL DATA - no empty states or API loading**
- **ALWAYS INCLUDE CRUD OPERATIONS - Create forms, Edit buttons, Delete confirmations**

CRUD IMPLEMENTATION EXAMPLES:
- **Add New Item**: Modal form, inline form, or floating action button
- **Edit Item**: Inline editing (click to edit), edit button with modal/form
- **Delete Item**: Delete button with confirmation dialog
- **Bulk Operations**: Select multiple items, bulk delete/edit

IMPORTANT: Instead of API calls or hardcoded arrays, initialize your state with the real data like this:
```jsx
// ✅ CORRECT: Use useEmbeddedData hook for race-condition-free data persistence
// This automatically handles embedded data, fallback to props, and server persistence

// CRITICAL: Always safely handle undefined data with fallbacks
const users = usersDataFromProps || __users || [];
const currentUser = authUser || { id: 1, name: 'Anonymous', email: 'user@example.com' };
const project = projectData || __project || { name: 'Untitled Project' };
const tasks = tasksDataFromProps || allTasksDataFromProps || __flatTasks || [];

// For main app data (tasks, items, etc.)
const [appData, setAppData] = useEmbeddedData('main-data', { 
  tasks: tasks,
  users: users,
  project: project,
  lastUpdated: new Date().toISOString()
});

// Extract data for easy use
const appTasks = appData?.tasks || [];
const appUsers = appData?.users || [];
const appProject = appData?.project || {};

// For specialized data types, use specific keys
const [chatData, setChatData] = useEmbeddedData('chat-messages', { messages: [] });
const [notesData, setNotesData] = useEmbeddedData('sticky-notes', { notes: [] });
const [settingsData, setSettingsData] = useEmbeddedData('user-settings', { theme: 'light' });

// When creating new items, always track the current user properly
const createMessage = (content) => {
  const message = {
    id: Date.now(),
    content,
    sender: currentUser, // ✅ Safe - always defined with fallback
    author: currentUser,
    created_by: currentUser.id,
    timestamp: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  
  const updatedData = {
    ...chatData,
    messages: [...(chatData.messages || []), message],
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: currentUser
  };
  setChatData(updatedData);
};

const editMessage = (messageId, newContent) => {
  const updatedData = {
    ...chatData,
    messages: chatData.messages?.map(msg => 
      msg.id === messageId 
        ? { 
            ...msg, 
            content: newContent, 
            edited_at: new Date().toISOString(),
            edited_by: currentUser.id,
            last_editor: currentUser
          } 
        : msg
    ) || [],
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: currentUser
  };
  setChatData(updatedData);
};

const deleteMessage = (messageId) => {
  const messageToDelete = (chatData.messages || []).find(msg => msg.id === messageId);
  const deletionRecord = {
    id: messageToDelete?.id,
    content: messageToDelete?.content || 'Unknown Message',
    original_author: messageToDelete?.sender?.name || 'Unknown',
    deleted_at: new Date().toISOString(),
    deleted_by: currentUser.id,
    deleted_by_user: currentUser
  };
  
  const updatedData = {
    ...chatData,
    messages: (chatData.messages || []).filter(msg => msg.id !== messageId),
    deletions: [...(chatData.deletions || []), deletionRecord],
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: currentUser
  };
  setChatData(updatedData);
};

// These variables are automatically available as fallbacks:
// projectData - Full project object with details, metadata, methodology
// tasksDataFromProps - Array of all project tasks with status, priority, dates
// allTasksDataFromProps - Same as tasksDataFromProps (alias for consistency)
// usersDataFromProps - Array of project team members
// methodologyDataFromProps - Object with workflow details and status labels
// __flatTasks - Flattened array of all tasks (processed for easy use)
// authUser - Currently authenticated user object { id, name, email } - USE THIS for currentUser

// ❌ WRONG: Don't use separate useState + useEffect patterns (causes race conditions)
// const [tasks, setTasks] = useState([]);
// useEffect(() => { loadViewData('tasks').then(setTasks) }, []);
// useEffect(() => { saveViewData('tasks', tasks) }, [tasks]);

// ❌ WRONG: Don't access arrays without checking length first
// const sender = usersDataFromProps[0]; // Could be undefined!

// ❌ WRONG: Don't make API calls or hardcode arrays  
// const expensesData = [{ id: 1, title: 'Fake' }];
// const [expenses, setExpenses] = useState(expensesData);
// useEffect(() => { fetch('/api/expenses')... }, []);
```

AVAILABLE DATA VARIABLES (auto-injected into your component):
- `projectData`: Full project object with name, description, methodology, dates, metadata
- `tasksDataFromProps`: Array of tasks with properties: id, title, description, status, priority, due_date, creator, assignee
- `allTasksDataFromProps`: Same as tasksDataFromProps (alias)
- `__flatTasks`: Pre-processed flattened array of all tasks
- `usersDataFromProps`: Array of team members with id, name, email
- `methodologyDataFromProps`: Object with workflow configuration and status labels
- `__project`, `__tasks`, `__allTasks`, `__users`, `__methodology`: Direct access to raw context data

TASK OBJECT STRUCTURE (when using tasksDataFromProps):
```tsx
interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'inprogress' | 'review' | 'done' | 'backlog' | 'testing';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string; // ISO date string
  created_at: string;
  updated_at: string;
  creator: { id: number; name: string; } | null;
  assignee: { id: number; name: string; } | null;
}
```

VISUALIZATION EXAMPLES:
- **Task Dashboard**: Status distribution charts, progress bars, timeline views
- **Team Analytics**: User assignment charts, workload distribution, productivity metrics  
- **Project Reports**: Completion rates, overdue tasks, milestone tracking
- **Custom Tables**: Sortable/filterable task lists with custom columns
- **Calendar Views**: Task deadlines, project timeline, sprint planning
- **Kanban Boards**: Custom status flows with drag-drop (if needed)
- **Charts & Graphs**: Burn-down charts, velocity tracking, status trends

PERSISTENCE HELPERS (useEmbeddedData hook handles everything automatically):
```tsx
// MANDATORY: Use useEmbeddedData for ALL persistent data - it handles loading/saving automatically
// The hook ensures race-condition-free data sharing across users and sessions

// Example 1: Main application data
const [appData, setAppData] = useEmbeddedData('main-data', { 
  items: [],
  settings: {},
  lastUpdated: new Date().toISOString()
});

// Example 2: Chat messages
const [chatData, setChatData] = useEmbeddedData('chat-messages', { 
  messages: [],
  lastMessageId: 0 
});

// Example 3: User preferences
const [userPrefs, setUserPrefs] = useEmbeddedData('user-preferences', { 
  theme: 'light',
  viewMode: 'grid'
});

// NO NEED for manual loadViewData/saveViewData calls - useEmbeddedData handles it
// NO NEED for separate useEffect hooks - prevents race conditions
// Data is automatically embedded in component code and shared across all users
```

COMPONENT STRUCTURE EXAMPLE:
```jsx
import React, { useState, useEffect } from 'react';
// NO OTHER IMPORTS NEEDED - StyledComponents, MuiMaterial, MuiIcons are auto-available

export default function MyComponent() {
    // Destructure StyledComponents at top
    const { ContentContainer, BeautifulCard, SectionHeader, PrimaryButton, SuccessButton, DangerButton } = StyledComponents;
    
    // Use embedded data hook
    const [appData, setAppData] = useEmbeddedData('main-data', { items: [] });
    
    // Icons are available as AddIcon, EditIcon, DeleteIcon, etc.
    return (
        <ContentContainer>
            <BeautifulCard>
                <SectionHeader>My App</SectionHeader>
                <PrimaryButton startIcon={<AddIcon />}>Add Item</PrimaryButton>
            </BeautifulCard>
        </ContentContainer>
    );
}
```

PROJECT CONTEXT:
{$contextData}

EXISTING COMPONENT CONTEXT:
" . ($existingView ? "You are updating an existing component. Current implementation details should be preserved where relevant." : "This is a new component being created from scratch.") . "

USER REQUEST: \"{$userRequest}\"

CONVERSATION HISTORY:
" . (!empty($conversationHistory) ? json_encode(array_slice($conversationHistory, -3), JSON_PRETTY_PRINT) : "No previous conversation") . "

RESPONSE FORMAT:
Provide ONLY the complete React component code (TSX/JSX) that uses the REAL DATA from the project context above. 
- Initialize state with the provided tasks, users, and project data
- No API calls, no empty states - use the real data immediately
- Must include `export default function Name()` as the default export
- Use the provided `saveViewData` and `loadViewData` helpers for persistence
- No explanations, no markdown - just the working JSX component ready for immediate use.

Remember: Focus on DATA DISPLAY (87% of space) with minimal input controls (13% max) and USE THE PROVIDED REAL DATA.";
        }

        return $prompt;
    }

    /**
     * Get the standard React component structure template
     */
    private function getReactComponentStructure(): string 
    {
        return "import React, { useState, useEffect } from 'react';

export default function GeneratedMicroApp() {
    // CRITICAL: Use useEmbeddedData for race-condition-free persistence
    const [appData, setAppData] = useEmbeddedData('main-data', { 
        items: [],
        settings: {},
        lastUpdated: new Date().toISOString()
    });
    
    // Extract data for easy use
    const items = appData?.items || [];
    
    // Available data from props (safely handle undefined)
    const users = usersDataFromProps || __users || [];
    const currentUser = authUser || { id: 1, name: 'Anonymous', email: 'user@example.com' };
    const project = projectData || __project || { name: 'Untitled Project' };
    const tasks = tasksDataFromProps || allTasksDataFromProps || __flatTasks || [];
    
    // State management for UI only
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Data operations that automatically persist via useEmbeddedData
    const createItem = (newItem) => {
        const item = { 
            id: Date.now(), 
            ...newItem,
            creator: currentUser,
            created_at: new Date().toISOString(),
            created_by: currentUser.id,
            updated_at: new Date().toISOString(),
            updated_by: currentUser.id
        };
        const updatedData = {
            ...appData,
            items: [...items, item],
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser
        };
        setAppData(updatedData);
    };
    
    const updateItem = (id, updates) => {
        const updatedData = {
            ...appData,
            items: items.map(item => item.id === id ? { 
                ...item, 
                ...updates, 
                updated_at: new Date().toISOString(),
                updated_by: currentUser.id,
                last_editor: currentUser
            } : item),
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser
        };
        setAppData(updatedData);
    };
    
    const deleteItem = (id) => {
        // Track who deleted the item in the metadata before removing
        const itemToDelete = items.find(item => item.id === id);
        const deletionRecord = {
            id: itemToDelete?.id,
            title: itemToDelete?.title || itemToDelete?.name || 'Unknown Item',
            deleted_at: new Date().toISOString(),
            deleted_by: currentUser.id,
            deleted_by_user: currentUser
        };
        
        const updatedData = {
            ...appData,
            items: items.filter(item => item.id !== id),
            deletions: [...(appData.deletions || []), deletionRecord],
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: currentUser
        };
        setAppData(updatedData);
    };
    
    // UI Component
    return (
        <div className=\"micro-app-container\">
            {/* Compact Input Section (< 13% of space) */}
            <div className=\"input-section\" style={{maxHeight: '13vh'}}>
                {/* Minimal input controls */}
            </div>
            
            {/* Main Data Display Area (> 87% of space) */}
            <div className=\"data-display-area\" style={{minHeight: '87vh'}}>
                {/* Primary data visualization */}
            </div>
        </div>
    );
}";
    }

    /**
     * Build project context for the AI prompt
     */
    private function buildProjectContext(Project $project): string
    {
        $tasks = $project->tasks()->with(['creator:id,name', 'assignee:id,name'])->get();
        $members = $project->members()->select('users.id', 'users.name', 'users.email')->get();
        
        return "Project: {$project->name}
Description: {$project->description}
Total Tasks: {$tasks->count()}
Team Members: {$members->count()}
Task Status Distribution: " . json_encode($tasks->groupBy('status')->map->count());
    }

    /**
     * Enhance the generated React component with additional functionality
     */
    private function enhanceReactComponent(string $componentCode, string $userRequest, ?\App\Models\User $authUser = null): string
    {
        $componentCode = $this->applyTemplateOverride($componentCode, $userRequest);

        // Remove any import statements for StyledComponents, MuiMaterial, or MuiIcons since they're globally available
        $componentCode = preg_replace('/^import\s+.*from\s*[\'"].*StyledComponents.*[\'"];?\s*$/m', '', $componentCode);
        $componentCode = preg_replace('/^import\s+.*from\s*[\'"].*MuiMaterial.*[\'"];?\s*$/m', '', $componentCode);
        $componentCode = preg_replace('/^import\s+.*from\s*[\'"].*MuiIcons.*[\'"];?\s*$/m', '', $componentCode);
        $componentCode = preg_replace('/^import\s+.*from\s*[\'"].*@mui.*[\'"];?\s*$/m', '', $componentCode);
        
        // Also remove imports where StyledComponents appears in the destructured list
        $componentCode = preg_replace('/^import\s+.*StyledComponents.*from.*[\'"].*[\'"];?\s*$/m', '', $componentCode);

        // 0) Force usage of real data when available: Replace common fake arrays with props-based init
        // Remove patterns like: const SomethingData = [ ... ]; const [items, setItems] = useState(SomethingData);
        $componentCode = preg_replace('/const\s+(\w+)Data\s*=\s*\[[\s\S]*?\];/m', '', $componentCode);
        // Replace useState(XxxData) with useState(() => props-based fallbacks)
        $componentCode = preg_replace(
            '/useState\s*\(\s*(\w+)Data\s*\)/',
            'useState(() => (typeof tasks !== "undefined" ? tasks : (typeof allTasks !== "undefined" ? allTasks : [])))',
            $componentCode
        );

        // Replace useState(() => tasksDataFromProps) style with fallback
        $componentCode = preg_replace(
            '/useState\s*\(\s*\(\s*\)\s*=>\s*(\w+)Data\s*\)/',
            'useState(() => (typeof tasks !== "undefined" ? tasks : (typeof allTasks !== "undefined" ? allTasks : [])))',
            $componentCode
        );

        // Also convert obvious literals like useState\(\s*\[\s*\{ id:\s*\d+.*?\}\s*\]\s*\)
        $componentCode = preg_replace(
            '/useState\s*\(\s*\[\s*\{[\s\S]*?\}\s*\]\s*\)/m',
            'useState(() => (typeof tasks !== "undefined" ? tasks : (typeof allTasks !== "undefined" ? allTasks : [])))',
            $componentCode
        );

        // Replace any "const <name> = [ { ... } ]; const [x, setX] = useState(<name>)"
        $componentCode = preg_replace(
            '/const\s+(\w+)\s*=\s*\[\s*\{[\s\S]*?\}\s*\]\s*;[\s\S]*?useState\s*\(\s*\1\s*\)/m',
            'useState(() => (typeof tasks !== "undefined" ? tasks : (typeof allTasks !== "undefined" ? allTasks : [])))',
            $componentCode
        );

        // Ensure enterprise-grade StyledComponents helpers are readily available
        $styledComponentDestructure = "const { ContentContainer, BeautifulCard, SectionHeader, FormContainer, PrimaryButton, SuccessButton, DangerButton } = StyledComponents;";
        if (!str_contains($componentCode, 'ContentContainer, BeautifulCard')) {
            $injected = false;
            $patterns = [
                '/(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*{)/',
                '/(function\s+\w+\s*\([^)]*\)\s*{)/',
                '/(const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{)/'
            ];
            foreach ($patterns as $pattern) {
                $componentCode = preg_replace($pattern, "$1\n    {$styledComponentDestructure}", $componentCode, 1, $count);
                if ($count > 0) {
                    $injected = true;
                    break;
                }
            }
            if (!$injected) {
                $componentCode = $styledComponentDestructure . "\n" . $componentCode;
            }
        }

        // Replace plain HTML buttons with polished StyledComponents buttons
        $componentCode = preg_replace('/<button\b/', '<PrimaryButton', $componentCode);
        $componentCode = str_replace('</button>', '</PrimaryButton>', $componentCode);

        // Wrap root layout in enterprise ContentContainer if missing
        if (!str_contains($componentCode, '<ContentContainer')) {
            $originalComponentForWrap = $componentCode;
            $wrapperCallback = function (array $matches) use ($originalComponentForWrap) {
                $inner = ltrim($matches[1], "\n");
                $innerNormalized = rtrim($inner);
                $innerNormalized = preg_replace('/^\s*/', '', $innerNormalized);
                $innerIndented = '            ' . preg_replace('/\n/', "\n            ", $innerNormalized);
                $hasBeautifulCard = str_contains($originalComponentForWrap, '<BeautifulCard');
                $cardOpen = $hasBeautifulCard ? '' : "            <BeautifulCard sx={{ padding: designTokens.spacing.xl, backgroundColor: designTokens.colors.neutral[50], boxShadow: designTokens.shadows.md }}\n            >\n";
                $cardClose = $hasBeautifulCard ? '' : "\n            </BeautifulCard>";

                return "return (\n        <ContentContainer maxWidth=\"xl\" sx={{ py: designTokens.spacing.xl, px: designTokens.spacing.xl }}>\n          <Stack spacing={designTokens.spacing.xl}>\n" .
                    $cardOpen .
                    $innerIndented .
                    $cardClose .
                    "\n          </Stack>\n        </ContentContainer>\n    );\n" . $matches[2];
            };

            $patterns = [
                '/return\s*\(\s*(?!\s*<ContentContainer)([\s\S]*?)\);\s*\n(\})/m',
                '/return\s*\(\s*(?!\s*<ContentContainer)([\s\S]*?)\);\s*\n(\};)/m'
            ];
            foreach ($patterns as $pattern) {
                $updated = preg_replace_callback($pattern, $wrapperCallback, $componentCode, 1, $count);
                if ($count > 0) {
                    $componentCode = $updated;
                    break;
                }
            }
        }

        // Add data persistence utilities if not present
        if (!str_contains($componentCode, 'localStorage')) {
            $persistenceCode = "
    // Data persistence
    useEffect(() => {
        const savedData = localStorage.getItem('microapp-data');
        if (savedData) {
            try {
                setData(JSON.parse(savedData));
            } catch (e) {
                console.error('Failed to load saved data:', e);
            }
        }
    }, []);
    
    useEffect(() => {
        if (data.length > 0) {
            localStorage.setItem('microapp-data', JSON.stringify(data));
        }
    }, [data]);";
            
            // Insert after the first useState declaration
            $componentCode = preg_replace(
                '/(\[data, setData\] = useState\([^)]*\);)/',
                '$1' . $persistenceCode,
                $componentCode
            );
        }

        // Add keyboard shortcuts if not present
        if (!str_contains($componentCode, 'useEffect') || !str_contains($componentCode, 'keydown')) {
            $keyboardCode = "
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeydown = (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                // Trigger save functionality
            }
            if (e.key === 'Escape') {
                // Close modals or cancel operations
            }
        };
        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    }, []);";
            
            $componentCode = str_replace('return (', $keyboardCode . "\n    return (", $componentCode);
        }

        return $componentCode;
    }

    private function applyTemplateOverride(string $componentCode, string $userRequest): string
    {
        $blueprint = $this->getStandardDesignBlueprint($userRequest);
        if (!$blueprint || empty($blueprint['slug'])) {
            return $componentCode;
        }

        $slug = strtolower((string) $blueprint['slug']);

        if ($slug === 'calendar') {
            if (!str_contains($componentCode, 'Templates.Calendar') && !str_contains($componentCode, "useExternalFactory('react-big-calendar')")) {
                return $this->buildCalendarTemplateComponent();
            }
        }

        return $componentCode;
    }

    private function buildCalendarTemplateComponent(): string
    {
        return <<<'REACT'
import React, { useMemo } from 'react';

export default function GeneratedCalendarTemplate({
    title = 'Team Events Calendar',
    initialEvents = [],
    persistKey = 'team-calendar',
    ...rest
}) {
    const { ContentContainer, BeautifulCard, SectionHeader } = StyledComponents;

    const seedEvents = useMemo(() => {
        if (Array.isArray(initialEvents) && initialEvents.length) {
            return initialEvents;
        }

        const now = new Date();
        const createEvent = (offsetDays, startHour, durationHours, details = {}) => {
            const start = new Date(now);
            start.setDate(start.getDate() + offsetDays);
            start.setHours(startHour, 0, 0, 0);
            const end = new Date(start);
            end.setHours(startHour + durationHours, 0, 0, 0);

            return {
                id: details.id ?? `event-${offsetDays}-${startHour}`,
                title: details.title ?? 'Scheduled Session',
                description: details.description ?? '',
                location: details.location ?? '',
                color: details.color ?? '#1A73E8',
                start: start.toISOString(),
                end: end.toISOString(),
            };
        };

        return [
            createEvent(0, 9, 1, { title: 'Daily Stand-up', color: '#1A73E8' }),
            createEvent(1, 13, 1, { title: 'Design Sync', color: '#34A853' }),
            createEvent(2, 15, 1, { title: 'Client Demo', color: '#F9AB00' }),
            createEvent(4, 10, 2, { title: 'Sprint Planning', color: '#A142F4' }),
        ];
    }, [initialEvents]);

    return (
        <ContentContainer maxWidth="xl" sx={{ py: designTokens.spacing.xl }}>
            <BeautifulCard sx={{ p: designTokens.spacing.lg }}>
                <SectionHeader sx={{ mb: designTokens.spacing.md }}>{title}</SectionHeader>
                <Templates.Calendar
                    title={title}
                    persistKey={persistKey}
                    initialEvents={seedEvents}
                    {...rest}
                />
            </BeautifulCard>
        </ContentContainer>
    );
}
REACT;
    }

    /**
     * Build enhanced project context with live tasks and user data
     */
    private function buildEnhancedProjectContext(Project $project, array $projectContext): string
    {
        $context = "PROJECT: {$project->name}\n";
        $context .= "Description: {$project->description}\n";
        $context .= "Key: {$project->key}\n";
        
        $methodology = $projectContext['methodology']['name'] ?? $project->meta['methodology'] ?? 'kanban';
        $context .= "Methodology: {$methodology}\n";
        
        if ($project->start_date) {
            $context .= "Start Date: {$project->start_date}\n";
        }
        if ($project->end_date) {
            $context .= "End Date: {$project->end_date}\n";
        }
        
        if (isset($projectContext['methodology']['status_labels'])) {
            $context .= "\nMETHODOLOGY STATUS LABELS (use these in your component):\n";
            foreach ($projectContext['methodology']['status_labels'] as $internal => $display) {
                $context .= "- {$internal} → '{$display}'\n";
            }
        }
        
        if ($project->meta && !empty($project->meta)) {
            $context .= "Metadata: " . json_encode($project->meta, JSON_PRETTY_PRINT) . "\n";
        }
        
        // Use the corrected keys from the project context
        if (!empty($projectContext['all_tasks'])) {
            $allTasks = $projectContext['all_tasks'];
            $totalCount = count($allTasks);
            $statusCounts = $projectContext['tasks_by_status_count'] ?? [];
            $doneCount = $statusCounts['done'] ?? 0;
            $completionRate = $totalCount > 0 ? round(($doneCount / $totalCount) * 100, 1) : 0;

            $context .= "\nTASKS SUMMARY:\n";
            $context .= "Total Tasks: {$totalCount}\n";
            $context .= "Completion Rate: {$completionRate}%\n";
            
            if (!empty($statusCounts)) {
                $context .= "Tasks by Status:\n";
                foreach ($statusCounts as $status => $count) {
                    $context .= "- " . ucfirst($status) . ": {$count}\n";
                }
            }

            $context .= "\nALL TASKS (sample of up to 25):\n";
            $tasksSample = array_slice($allTasks, 0, 25);
            foreach ($tasksSample as $task) {
                $context .= "- ID: {$task['id']}, Title: {$task['title']}, Status: {$task['status']}";
                if (!empty($task['due_date'])) {
                    $context .= ", Due: " . substr($task['due_date'], 0, 10);
                }
                $context .= "\n";
            }
        }

        if (isset($projectContext['users']) && !empty($projectContext['users'])) {
            $context .= "\nTEAM MEMBERS (" . count($projectContext['users']) . "):\n";
            foreach ($projectContext['users'] as $user) {
                $context .= "- ID: {$user['id']}, Name: {$user['name']}, Email: {$user['email']}\n";
            }
        }
        
        return $context;
    }

    /**
     * Save custom view component code
     */
    public function saveCustomView(Project $project, int $userId, string $viewName, string $componentCode, ?int $customViewId = null): array
    {
        try {
            $customView = CustomView::createOrUpdate(
                $project->id,
                $userId,
                $viewName,
                $componentCode,
                [
                    'type' => 'react_component',
                    'saved_at' => now()->toISOString(),
                ],
                $customViewId
            );

            // Broadcast that the component code was saved/updated so other viewers refresh
            try {
                $user = \App\Models\User::find($userId);
                broadcast(new CustomViewDataUpdated(
                    $project->id,
                    $viewName,
                    'component',
                    [
                        'custom_view_id' => $customView->id,
                        'saved_at' => now()->toISOString(),
                    ],
                    $user
                ));
                // Also request the UI to close/minimize the generator if it is open
                broadcast(new CustomViewDataUpdated(
                    $project->id,
                    $viewName,
                    'ux_action',
                    [ 'action' => 'close_generator', 'reason' => 'save_completed' ],
                    $user
                ));
            } catch (\Throwable $e) {
                Log::warning('Broadcast failed after saveCustomView', [
                    'project_id' => $project->id,
                    'view_name' => $viewName,
                    'error' => $e->getMessage(),
                ]);
            }

            return [
                'success' => true,
                'custom_view_id' => $customView->id,
                'message' => 'Custom view saved successfully'
            ];

        } catch (\Exception $e) {
            Log::error('SaveCustomView error', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Save component data (for persistent state across component reloads)
     * This method now embeds data directly into the component code
     */
    public function saveComponentData(Project $project, int $userId, string $viewName, string $dataKey, $data): array
    {
        try {
            \Log::info('SaveComponentData called', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
                'data_key' => $dataKey,
                'data_type' => gettype($data),
                'data_size' => is_array($data) ? count($data) : (is_string($data) ? strlen($data) : 'unknown')
            ]);

            // Get or create the custom view
            $customView = CustomView::getActiveForProject($project->id, $userId, $viewName);

            if (!$customView) {
                \Log::warning('CustomView not found', [
                    'project_id' => $project->id,
                    'user_id' => $userId,
                    'view_name' => $viewName
                ]);
                return [
                    'success' => false,
                    'message' => 'Custom view not found; data not saved',
                ];
            }

            \Log::info('CustomView found', [
                'view_id' => $customView->id,
                'view_name' => $customView->name,
                'project_id' => $customView->project_id,
                'updated_at' => $customView->updated_at
            ]);

            // Get current component code
            $componentCode = $customView->html_content;
            
            \Log::info('Embedding data into component', [
                'view_id' => $customView->id,
                'data_key' => $dataKey,
                'original_code_length' => strlen($componentCode),
                'has_embedded_data' => strpos($componentCode, '__EMBEDDED_DATA__') !== false
            ]);
            
            // Update the component code to embed the new data
            $updatedCode = $this->embedDataIntoComponent($componentCode, $dataKey, $data);
            
            // Update the custom view with the modified code
            $customView->html_content = $updatedCode;
            
            // Also update metadata for backwards compatibility
            $metadata = $customView->metadata ?? [];
            if (!isset($metadata['component_data'])) {
                $metadata['component_data'] = [];
            }
            $metadata['component_data'][$dataKey] = [
                'data' => $data,
                'saved_at' => now()->toISOString()
            ];
            $customView->metadata = $metadata;
            
            \Log::info('Saving updated view', [
                'view_id' => $customView->id,
                'updated_code_length' => strlen($updatedCode),
                'metadata_keys' => array_keys($metadata['component_data'] ?? [])
            ]);
            
            $customView->save();

            // Broadcast the data update to other users viewing the same component
            broadcast(new CustomViewDataUpdated(
                $project->id,
                $viewName,
                $dataKey,
                $data,
                auth()->user()
            ));

            \Log::info('CustomView saved successfully', [
                'view_id' => $customView->id,
                'new_updated_at' => $customView->updated_at
            ]);

            return [
                'success' => true,
                'data_key' => $dataKey,
                'saved_at' => now()->toISOString(),
                'embedded' => true
            ];

        } catch (\Exception $e) {
            \Log::error('SaveComponentData error', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
                'data_key' => $dataKey,
                'error' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'message' => 'Error saving data: ' . $e->getMessage(),
                'error_type' => get_class($e)
            ];
        }
    }

    /**
     * Embed data directly into the component code (universal approach)
     */
    private function embedDataIntoComponent(string $componentCode, string $dataKey, $data): string
    {
        // First, extract any existing embedded data to preserve other keys
        $existingData = [];
        $pattern = '/\/\*\s*EMBEDDED_DATA_START\s*\*\/.*?const __EMBEDDED_DATA__ = ({[^;]*});.*?\/\*\s*EMBEDDED_DATA_END\s*\*\//s';
        
        if (preg_match($pattern, $componentCode, $matches)) {
            try {
                $existingData = json_decode($matches[1], true) ?: [];
            } catch (Exception $e) {
                // If parsing fails, start fresh
                $existingData = [];
            }
        }
        
        // Store data directly under the dataKey (not nested)
        // Frontend expects: __EMBEDDED_DATA__['chat'] not __EMBEDDED_DATA__['chat']['messages']
        $existingData[$dataKey] = $data;
        
        // Generate the complete embedded data block
        $dataJson = json_encode($existingData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        // Validate the JSON before embedding
        if (json_last_error() !== JSON_ERROR_NONE) {
            \Log::error('Invalid JSON generated for embedded data', [
                'error' => json_last_error_msg(),
                'data' => $existingData
            ]);
            throw new \Exception('Failed to generate valid JSON for embedded data: ' . json_last_error_msg());
        }
        
        $embeddedDataBlock = "/* EMBEDDED_DATA_START */
const __EMBEDDED_DATA__ = $dataJson;
/* EMBEDDED_DATA_END */";

        // Remove any existing embedded data block
        $componentCode = preg_replace('/\/\*\s*EMBEDDED_DATA_START\s*\*\/.*?\/\*\s*EMBEDDED_DATA_END\s*\*\//s', '', $componentCode);
        
        // Add the new/updated embedded data block after imports
        $importPattern = '/(import.*?;[\s\n]*)/s';
        if (preg_match($importPattern, $componentCode, $matches, PREG_OFFSET_CAPTURE)) {
            $insertPos = $matches[0][1] + strlen($matches[0][0]);
            $componentCode = substr_replace($componentCode, "\n" . $embeddedDataBlock . "\n", $insertPos, 0);
        } else {
            // If no imports found, add at the beginning
            $componentCode = $embeddedDataBlock . "\n" . $componentCode;
        }
        
        return $componentCode;
    }

    /**
     * Load component data (for restoring state across component reloads)
     * Note: Views are now shared across project members, so we don't filter by userId
     */
    public function loadComponentData(Project $project, int $userId, string $viewName, string $dataKey): array
    {
        try {
            // Get the custom view (shared across all project members)
            $customView = CustomView::getActiveForProject($project->id, $userId, $viewName);
            
            if (!$customView) {
                return [
                    'success' => false,
                    'data' => null,
                    'message' => 'Custom view not found'
                ];
            }

            // Get metadata
            $metadata = $customView->metadata ?? [];
            
            // Check if component_data exists and has the requested key
            if (!isset($metadata['component_data']) || !isset($metadata['component_data'][$dataKey])) {
                return [
                    'success' => true,
                    'data' => null,
                    'message' => 'No data found for the specified key'
                ];
            }

            return [
                'success' => true,
                'data' => $metadata['component_data'][$dataKey]['data'],
                'saved_at' => $metadata['component_data'][$dataKey]['saved_at']
            ];

        } catch (\Exception $e) {
            Log::error('LoadComponentData error', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
                'data_key' => $dataKey,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Get an existing custom view
     */
    public function getCustomView(Project $project, int $userId, string $viewName = 'default'): ?array
    {
        try {
            $customView = CustomView::getActiveForProject($project->id, $userId, $viewName);
            
            if (!$customView) {
                return null;
            }

            // Debug logging to understand what we're getting
            Log::info('[GenerativeUIService] CustomView retrieved:', [
                'customView_type' => gettype($customView),
                'customView_class' => $customView ? get_class($customView) : 'null',
                'is_array' => is_array($customView),
                'is_instance' => $customView instanceof \App\Models\CustomView,
            ]);

            // Be defensive: ensure we have the right type
            if (!($customView instanceof \App\Models\CustomView)) {
                Log::error('[GenerativeUIService] Expected CustomView model, got: ' . gettype($customView), [
                    'value' => $customView
                ]);
                return [
                    'success' => false,
                    'type' => 'error',
                    'message' => 'Invalid custom view data structure'
                ];
            }

            $code = $customView->getComponentCode();

            return [
                'success' => true,
                'type' => 'spa_generated',
                'html' => $code,
                'component_code' => $code,
                'custom_view_id' => $customView->id,
                'message' => 'Custom view loaded successfully'
            ];

        } catch (\Exception $e) {
            Log::error('GenerativeUIService::getCustomView error', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'type' => 'error',
                'message' => 'Failed to load custom view'
            ];
        }
    }

    /**
     * Delete a custom view
     */
    public function deleteCustomView(Project $project, int $userId, string $viewName = 'default'): bool
    {
        try {
            $customView = CustomView::getActiveForProject($project->id, $userId, $viewName);
            
            if (!$customView) {
                Log::info('GenerativeUIService::deleteCustomView - view not found', [
                    'project_id' => $project->id,
                    'user_id' => $userId,
                    'view_name' => $viewName
                ]);
                return false;
            }

            // Clear any stored metadata/component_data before delete
            $customView->metadata = null;
            $customView->save();

            $deleted = $customView->delete();

            Log::info('GenerativeUIService::deleteCustomView - success', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
                'deleted' => $deleted
            ]);

            // Broadcast that the component was deleted so other viewers clear
            try {
                $user = \App\Models\User::find($userId);
                broadcast(new CustomViewDataUpdated(
                    $project->id,
                    $viewName,
                    'component',
                    [ 'deleted' => true ],
                    $user
                ));
            } catch (\Throwable $e) {
                Log::warning('Broadcast failed after deleteCustomView', [
                    'project_id' => $project->id,
                    'view_name' => $viewName,
                    'error' => $e->getMessage(),
                ]);
            }

            return $deleted;

        } catch (\Exception $e) {
            Log::error('GenerativeUIService::deleteCustomView error', [
                'project_id' => $project->id,
                'user_id' => $userId,
                'view_name' => $viewName,
                'error' => $e->getMessage()
            ]);

            return false;
        }
    }
}
