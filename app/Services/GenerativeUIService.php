<?php

namespace App\Services;

use App\Models\Project;
use App\Models\CustomView;
use Illuminate\Support\Facades\Log;

/**
 * GenerativeUIService - Uses AI-SDK for creating React-based micro applications
 * Replaces the old HTML generation approach with modern generative UI
 */
class GenerativeUIService
{
    private OpenAIService $openAIService;

    public function __construct(OpenAIService $openAIService)
    {
        $this->openAIService = $openAIService;
    }

    /**
     * Process custom view request and generate React component
     */
    public function processCustomViewRequest(
        Project $project, 
        string $userMessage, 
        ?string $sessionId = null, 
        int $userId, 
        string $viewName = 'default',
        array $conversationHistory = [],
        ?array $projectContext = null,
        ?string $currentComponentCode = null
    ): array {
        try {
            // Get existing view for context
            $existingView = CustomView::getActiveForProject($project->id, $userId, $viewName);
            
            // Build enhanced prompt for React component generation
            $prompt = $this->buildReactComponentPrompt(
                $userMessage, 
                $project, 
                $existingView,
                $conversationHistory,
                $projectContext,
                $currentComponentCode
            );

            // Generate React component using OpenAI
            Log::info('GenerativeUIService: Sending prompt to OpenAI', [
                'project_id' => $project->id,
                'user_message' => $userMessage,
                'is_update_request' => !empty($currentComponentCode),
                'current_component_length' => $currentComponentCode ? strlen($currentComponentCode) : 0,
                'has_project_context' => !is_null($projectContext),
                'project_context_keys' => $projectContext ? array_keys($projectContext) : [],
                'project_context_summary' => $projectContext ? [
                    'has_tasks' => isset($projectContext['tasks']),
                    'task_count' => isset($projectContext['tasks']['total_count']) ? $projectContext['tasks']['total_count'] : 0,
                    'has_all_tasks' => isset($projectContext['all_tasks']),
                    'all_tasks_count' => isset($projectContext['all_tasks']) ? count($projectContext['all_tasks']) : 0,
                    'has_users' => isset($projectContext['users']),
                    'users_count' => isset($projectContext['users']) ? count($projectContext['users']) : 0,
                ] : null,
                'prompt_preview' => substr($prompt, 0, 500) . '...'
            ]);
            
            $generatedComponent = $this->openAIService->generateCustomView($prompt);

            // Defensive fallback: if generation is empty, provide a minimal working component for dev
            if (!is_string($generatedComponent) || trim($generatedComponent) === '') {
                Log::warning('OpenAI returned empty component. Using fallback component.');
                $generatedComponent = $this->fallbackReactComponent();
            }

            // Validate and enhance the generated component
            $enhancedComponent = $this->enhanceReactComponent($generatedComponent, $userMessage);

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
                ]
            );

            return [
                'type' => 'spa_generated',
                'success' => true,
                // Frontend expects `html`; keep `component_code` for compatibility
                'html' => $enhancedComponent,
                'component_code' => $enhancedComponent,
                'custom_view_id' => $customView->id,
                'message' => 'Custom micro-application generated successfully!'
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
                'message' => 'Failed to generate custom application. Please try again.'
            ];
        }
    }

    /**
     * Minimal fallback component to ensure UX continuity when AI generation is unavailable
     */
        private function fallbackReactComponent(): string
        {
                return <<<'REACT'
import React, { useState, useEffect } from 'react';

export default function GeneratedMicroApp({ project, auth }) {
    const [items, setItems] = useState(() => [{ id: 1, title: 'Welcome to your Micro App', status: 'todo' }]);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const saved = localStorage.getItem('microapp-data');
        if (saved) {
            try { setItems(JSON.parse(saved)); } catch (e) { console.error(e); }
        }
    }, []);
    useEffect(() => {
        localStorage.setItem('microapp-data', JSON.stringify(items));
    }, [items]);

    const addItem = () => {
        const id = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
        setItems([...items, { id, title: `Item #${id}`, status: 'todo' }]);
    };
    const toggle = (id) => {
        setItems(items.map(i => i.id === id ? { ...i, status: i.status === 'done' ? 'todo' : 'done' } : i));
    };
    const remove = (id) => setItems(items.filter(i => i.id !== id));

    const visible = items.filter(i => filter === 'all' ? true : i.status === filter);

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{project?.name || 'Micro App'}</h2>
                <div className="space-x-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={addItem}>Add</button>
                    <select className="px-2 py-1 border rounded" value={filter} onChange={e => setFilter(e.target.value)}>
                        <option value="all">All</option>
                        <option value="todo">Todo</option>
                        <option value="done">Done</option>
                    </select>
                </div>
            </div>
            <div className="grid gap-2">
                {visible.map(i => (
                    <div key={i.id} className="p-3 border rounded flex items-center justify-between">
                        <div>#{i.id} · {i.title} · <span className="italic">{i.status}</span></div>
                        <div className="space-x-2">
                            <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={() => toggle(i.id)}>{i.status === 'done' ? 'Mark Todo' : 'Mark Done'}</button>
                            <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => remove(i.id)}>Delete</button>
                        </div>
                    </div>
                ))}
                {visible.length === 0 && <div className="text-gray-500 text-sm">No items found.</div>}
            </div>
        </div>
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
        ?string $currentComponentCode = null
    ): string {
        // Use enhanced project context if provided, otherwise fall back to basic context
        $contextData = $projectContext ? $this->buildEnhancedProjectContext($project, $projectContext) : $this->buildProjectContext($project);
        $componentStructure = $this->getReactComponentStructure();
        
        // Determine if this is an update request
        $isUpdateRequest = !empty($currentComponentCode) && !empty(trim($currentComponentCode));
        
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
Provide ONLY the UPDATED complete React component code that:
- Incorporates the user's requested changes
- Preserves all working functionality not mentioned in the request
- Continues to use the REAL DATA from project context
- Maintains the same data initialization patterns
- No explanations, no markdown - just the working JSX component ready for immediate use

Remember: This is an UPDATE, not a complete rewrite. Preserve what works, modify only what's requested.";
        } else {
            $prompt = "You are an expert React developer specializing in creating data-focused micro-applications using modern React patterns.

CRITICAL REQUIREMENTS:
1. Generate a COMPLETE, FUNCTIONAL React component that can be directly used
2. Use React hooks (useState, useEffect) for state management  
3. **NEVER use API calls like csrfFetch('/api/tasks') - USE THE PROVIDED REAL DATA instead**
4. Initialize state with the ACTUAL project data provided in the context below AND via props injected by the host renderer
5. Input controls must take LESS THAN 13% of the workspace - focus 87%+ on data display
6. Use modern CSS-in-JS or Tailwind classes for styling
7. Include proper TypeScript types if applicable
8. Add loading states, error handling, and user feedback
9. Ensure mobile-responsive design

DATA-FOCUSED DESIGN PRINCIPLES:
- Minimize input forms - use inline editing, modals, or compact controls
- Maximize data visualization and display area  
- Use tables, cards, charts, or lists as primary content
- Add search, filtering, and sorting capabilities
- Include data export/import functionality where relevant
- **START WITH REAL DATA - no empty states or API loading**

IMPORTANT: Instead of API calls or hardcoded arrays, initialize your state with the real data like this:
```jsx
// ✅ CORRECT: Use provided real data (prefer props injected by host)
const [tasks, setTasks] = useState(() => (tasksDataFromProps || allTasksDataFromProps || []));

// ❌ WRONG: Don't make API calls or hardcode arrays  
// const tasksData = [{ id: 1, title: 'Fake' }];
// const [tasks, setTasks] = useState(tasksData);
// useEffect(() => { fetch('/api/tasks')... }, []);
```

COMPONENT STRUCTURE:
```jsx
{$componentStructure}
```

PROJECT CONTEXT:
{$contextData}

EXISTING COMPONENT CONTEXT:
" . ($existingView ? "You are updating an existing component. Current implementation details should be preserved where relevant." : "This is a new component being created from scratch.") . "

USER REQUEST: \"{$userRequest}\"

CONVERSATION HISTORY:
" . (!empty($conversationHistory) ? json_encode(array_slice($conversationHistory, -3), JSON_PRETTY_PRINT) : "No previous conversation") . "

RESPONSE FORMAT:
Provide ONLY the complete React component code that uses the REAL DATA from the project context above. 
- Initialize state with the provided tasks, users, and project data
- No API calls, no empty states - use the real data immediately
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
import { csrfFetch } from '@/utils/csrf';

export default function GeneratedMicroApp({ project, auth }) {
    // State management
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Data operations
    const loadData = async () => { /* Implementation */ };
    const createItem = async (item) => { /* Implementation */ };
    const updateItem = async (id, updates) => { /* Implementation */ };
    const deleteItem = async (id) => { /* Implementation */ };
    
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
    private function enhanceReactComponent(string $componentCode, string $userRequest): string
    {
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

    /**
     * Get existing custom view
     */
    public function getCustomView(Project $project, int $userId, string $viewName = 'default'): ?CustomView
    {
        return CustomView::getActiveForProject($project->id, $userId, $viewName);
    }

    /**
     * Delete custom view
     */
    public function deleteCustomView(Project $project, int $userId, string $viewName = 'default'): bool
    {
        $view = CustomView::getActiveForProject($project->id, $userId, $viewName);
        
        if ($view) {
            return $view->delete();
        }
        
        return false;
    }

    /**
     * Build enhanced project context with live tasks and user data
     */
    private function buildEnhancedProjectContext(Project $project, array $projectContext): string
    {
        $context = "PROJECT: {$project->name}\n";
        $context .= "Description: {$project->description}\n";
        $context .= "Key: {$project->key}\n";
        
        // Add methodology information
        $methodology = $projectContext['methodology']['name'] ?? $project->meta['methodology'] ?? 'kanban';
        $context .= "Methodology: {$methodology}\n";
        
        if ($project->start_date) {
            $context .= "Start Date: {$project->start_date}\n";
        }
        if ($project->end_date) {
            $context .= "End Date: {$project->end_date}\n";
        }
        
        // Add methodology-specific status labels
        if (isset($projectContext['methodology']['status_labels'])) {
            $context .= "\nMETHODOLOGY STATUS LABELS (use these in your component):\n";
            foreach ($projectContext['methodology']['status_labels'] as $internal => $display) {
                $context .= "- {$internal} → '{$display}'\n";
            }
        }
        
        // Add metadata if available
        if ($project->meta && !empty($project->meta)) {
            $context .= "Metadata: " . json_encode($project->meta, JSON_PRETTY_PRINT) . "\n";
        }
        
        // Add live tasks data if provided
        if (isset($projectContext['tasks']) && $projectContext['tasks']) {
            $tasks = $projectContext['tasks'];
            $context .= "\nTASKS SUMMARY:\n";
            $context .= "Total Tasks: {$tasks['total_count']}\n";
            $context .= "Completion Rate: {$tasks['completion_rate']}%\n";
            
            // Add detailed task data for AI to use
            $context .= "\nDETAILED TASK DATA FOR COMPONENT INITIALIZATION:\n";
            $context .= "// Use this exact data structure in your React component:\n";
            $context .= "const initialTasks = {\n";
            $context .= "  todo: " . json_encode($tasks['todo'], JSON_PRETTY_PRINT) . ",\n";
            $context .= "  inprogress: " . json_encode($tasks['inprogress'], JSON_PRETTY_PRINT) . ",\n";
            $context .= "  review: " . json_encode($tasks['review'], JSON_PRETTY_PRINT) . ",\n";
            $context .= "  done: " . json_encode($tasks['done'], JSON_PRETTY_PRINT) . "\n";
            $context .= "};\n\n";
            
            // Also provide flat array if available
            if (isset($projectContext['all_tasks']) && !empty($projectContext['all_tasks'])) {
                $context .= "// Alternative: All tasks as flat array:\n";
                $context .= "const allTasks = " . json_encode($projectContext['all_tasks'], JSON_PRETTY_PRINT) . ";\n\n";
            }
            
            $context .= "TASK BREAKDOWN:\n";
            $context .= "\nTODO TASKS (" . count($tasks['todo']) . "):\n";
            foreach (array_slice($tasks['todo'], 0, 10) as $task) {
                $context .= "- #{$task['id']}: {$task['title']}";
                if ($task['priority']) $context .= " [Priority: {$task['priority']}]";
                if ($task['due_date']) $context .= " [Due: {$task['due_date']}]";
                $context .= "\n";
            }
            
            $context .= "\nIN PROGRESS TASKS (" . count($tasks['inprogress']) . "):\n";
            foreach (array_slice($tasks['inprogress'], 0, 10) as $task) {
                $context .= "- #{$task['id']}: {$task['title']}";
                if ($task['assignee']) $context .= " [Assignee: {$task['assignee']}]";
                $context .= "\n";
            }
            
            $context .= "\nREVIEW TASKS (" . count($tasks['review']) . "):\n";
            foreach (array_slice($tasks['review'], 0, 5) as $task) {
                $context .= "- #{$task['id']}: {$task['title']}\n";
            }
            
            $context .= "\nCOMPLETED TASKS (" . count($tasks['done']) . "):\n";
            foreach (array_slice($tasks['done'], 0, 5) as $task) {
                $context .= "- #{$task['id']}: {$task['title']}\n";
            }
        } else {
            $context .= "\nNO TASKS AVAILABLE: Project currently has no tasks. Generate a component with placeholder message or basic task creation interface.\n";
        }
        
        // Add team members if provided
        if (isset($projectContext['users']) && !empty($projectContext['users'])) {
            $context .= "\nTEAM MEMBERS:\n";
            foreach ($projectContext['users'] as $user) {
                $context .= "- {$user['name']} ({$user['email']})\n";
            }
        }
        
        $context .= "\nINSTRUCTIONS FOR AI:\n";
        $context .= "Use this REAL project data to create meaningful, data-driven components.\n";
        $context .= "Generate components that work with the actual task IDs, titles, and statuses shown above.\n";
        $context .= "IMPORTANT: Use the methodology-specific status labels (e.g., 'Backlog' instead of 'todo' for lean methodology).\n";
        $context .= "Create useful dashboards, progress trackers, or task management widgets using this real data.\n";
        $context .= "Consider the project timeline, completion rates, and team structure when designing the component.\n";
        $context .= "Match the terminology and workflow of the {$methodology} methodology.\n";
        
        return $context;
    }
}