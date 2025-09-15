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
            // Get the authenticated user object for embedding in component
            $authUser = \App\Models\User::find($userId);
            if (!$authUser) {
                throw new \Exception("User not found: {$userId}");
            }
            
            // Get existing view for context
            $existingView = CustomView::getActiveForProject($project->id, $userId, $viewName);
            
            // Build enhanced prompt for React component generation
            $prompt = $this->buildReactComponentPrompt(
                $userMessage, 
                $project, 
                $existingView,
                $conversationHistory,
                $projectContext,
                $currentComponentCode,
                $authUser
            );

            // Generate React component using OpenAI
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

            // Defensive fallback: if generation is empty, provide a minimal working component for dev
            if (!is_string($generatedComponent) || trim($generatedComponent) === '') {
                Log::warning('OpenAI returned empty component. Using fallback component.');
                $generatedComponent = $this->fallbackReactComponent();
            }

            // Validate and enhance the generated component
            $enhancedComponent = $this->enhanceReactComponent($generatedComponent, $userMessage, $authUser);

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
        ?string $currentComponentCode = null,
        ?\App\Models\User $authUser = null
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
Provide ONLY the UPDATED complete React component code (TSX/JSX) that:
- Incorporates the user's requested changes
- Preserves all working functionality not mentioned in the request
- Continues to use the REAL DATA from project context
- Maintains the same data initialization patterns
- Exports a default component via `export default function Name() { ... }`
- Persists user data changes using the provided helpers: `saveViewData(key, data)` and `loadViewData(key)`
- No explanations, no markdown - just the working JSX component ready for immediate use

Remember: This is an UPDATE, not a complete rewrite. Preserve what works, modify only what's requested.";
        } else {
            $prompt = "You are an expert React developer specializing in creating data-focused micro-applications using modern React patterns.

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
9. Initialize state with the ACTUAL project data provided in the context below AND via props injected by the host renderer
10. **MANDATORY: Include FULL CRUD OPERATIONS (Create, Read, Update, Delete) for all data entities**
11. Input controls must take LESS THAN 13% of the workspace - focus 87%+ on data display
12. Use modern CSS-in-JS or Tailwind classes for styling
13. Include proper TypeScript types if applicable
14. Add loading states, error handling, and user feedback
15. Ensure mobile-responsive design
16. Export a default component: `export default function Name() { ... }`
17. **CRITICAL: ALL React hooks (useState, useEmbeddedData, useEffect, etc.) MUST be at the TOP LEVEL - NEVER inside conditions, loops, or functions**
18. **CRITICAL: Follow the Rules of Hooks - hooks must always be called in the same order on every render**
19. **CRITICAL: Data persistence is handled by useEmbeddedData - ensures cross-user sharing and eliminates race conditions**
20. **CRITICAL: Always check array length before accessing elements: users.length > 0 ? users[0] : defaultUser**
21. **MANDATORY: Show who created/edited each item in the UI with timestamps for full collaboration transparency**

MANDATORY CRUD OPERATIONS:
- **CREATE**: Always include forms/inputs to add new items (modals, inline forms, or dedicated sections)
- **READ**: Display data in tables, cards, or lists with search/filter capabilities
- **UPDATE**: Enable editing existing items (inline editing, edit modals, or edit forms)
- **DELETE**: Provide delete functionality with confirmation dialogs
- **VALIDATION**: Add input validation and error handling for all operations
- **PERSISTENCE**: Use saveViewData() to persist all changes immediately

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
        $dataJson = json_encode($existingData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        
        $embeddedDataBlock = "/* EMBEDDED_DATA_START */
const __EMBEDDED_DATA__ = {$dataJson};
/* EMBEDDED_DATA_END */";

        // Remove any existing embedded data block
        $componentCode = preg_replace('/\/\*\s*EMBEDDED_DATA_START\s*\*\/.*?\/\*\s*EMBEDDED_DATA_END\s*\*\//s', '', $componentCode);
        
        // Add the new/updated embedded data block
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
     */
    public function loadComponentData(Project $project, int $userId, string $viewName, string $dataKey): array
    {
        try {
            // Get the custom view
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
