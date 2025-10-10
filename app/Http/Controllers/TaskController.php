<?php

namespace App\Http\Controllers;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\SuggestionChipService;
use App\Services\TaskGeneratorService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;

class TaskController extends Controller
{
    use AuthorizesRequests;

    protected function statuses(): array
    {
        return Task::STATUSES; // ['todo','inprogress','review','done']
    }

    protected function priorities(): array
    {
        return Task::PRIORITIES; // ['low','medium','high','urgent']
    }

    protected function statusesRule(bool $nullable = true): string
    {
        $rule = 'in:'.implode(',', $this->statuses());

        return $nullable ? 'nullable|'.$rule : $rule;
    }

    protected function prioritiesRule(bool $nullable = true): string
    {
        $rule = 'in:'.implode(',', $this->priorities());

        return $nullable ? 'nullable|'.$rule : $rule;
    }

    /**
     * Check if setting a parent would create a circular dependency
     */
    private function wouldCreateCircularDependency(Task $task, $parentId): bool
    {
        // If the potential parent is a child of this task, it would create a circle
        $potentialParent = Task::find($parentId);
        if (! $potentialParent) {
            return false;
        }

        // Check if the potential parent is already a descendant of this task
        return $this->isDescendantOf($potentialParent, $task->id);
    }

    /**
     * Check if a task is a descendant of another task
     */
    private function isDescendantOf(Task $task, $ancestorId): bool
    {
        if ($task->parent_id === $ancestorId) {
            return true;
        }

        if ($task->parent_id) {
            $parent = Task::find($task->parent_id);
            if ($parent) {
                return $this->isDescendantOf($parent, $ancestorId);
            }
        }

        return false;
    }

    /**
     * Get all descendant IDs of a task
     */
    private function getDescendantIds(Task $task): array
    {
        $descendants = [];

        foreach ($task->children as $child) {
            $descendants[] = $child->id;
            $descendants = array_merge($descendants, $this->getDescendantIds($child));
        }

        return $descendants;
    }

    /* ------------------------------------------------ Board ----------- */
    public function index(Project $project)
    {
        $this->authorize('view', $project);

        // Check if this is an AJAX request for cache updates
        if (request()->wantsJson()) {
            // Get project members
            $members = $project->members()->select('users.id', 'users.name')->get();
            
            // Get project owner
            $owner = User::select('id', 'name')->find($project->user_id);
            
            // Combine and remove duplicates
            $projectUsers = $members->push($owner)->unique('id')->values()->map(function($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                ];
            });

            return response()->json([
                'tasks' => $this->getTasksData($project),
                'users' => $projectUsers,
            ]);
        }

        // Only expose project members (including owner) instead of every system user
        $members = $project->members()->select('users.id', 'users.name')->get();
        $owner = User::select('id', 'name')->find($project->user_id);
        
        $projectUsers = $members->push($owner)->unique('id')->values()->map(function($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
            ];
        });

        return Inertia::render('Tasks/Board', [
            'project' => $project,
            'tasks' => $this->getTasksData($project),
            'users' => $projectUsers,
        ]);
    }

    /**
     * Get optimized tasks data for board
     */
    private function getTasksData(Project $project)
    {

        $raw = $project->tasks()
            ->with(['creator:id,name', 'assignee:id,name', 'comments.user:id,name', 'attachments', 'duplicateOf:id,title', 'duplicates:id,title', 'parent:id,title', 'children:id,title'])
            ->orderBy('created_at')
            ->get()
            ->groupBy('status');

        $map = function ($collection) {
            return $collection->values()->map(function (Task $t) {
                return [
                    'id' => $t->id,
                    'title' => $t->title,
                    'description' => $t->description,
                    'cover_image' => optional($t->attachments->firstWhere('kind', 'image'))?->url,
                    'start_date' => $t->start_date ? $t->start_date->format('Y-m-d') : null,
                    'end_date' => $t->end_date ? $t->end_date->format('Y-m-d') : null,
                    'status' => $t->status,
                    'priority' => $t->priority ?? 'medium',
                    'milestone' => $t->milestone ?? false,
                    'creator' => $t->creator ? ['id' => $t->creator->id, 'name' => $t->creator->name] : null,
                    'assignee' => $t->assignee ? ['id' => $t->assignee->id, 'name' => $t->assignee->name] : null,
                    'comments_count' => $t->comments->count(),
                    'attachments_count' => $t->attachments->count(),
                    // Duplicate information
                    'duplicate_of' => $t->duplicateOf ? ['id' => $t->duplicateOf->id, 'title' => $t->duplicateOf->title] : null,
                    'is_duplicate' => (bool) $t->duplicate_of,
                    'duplicates' => $t->duplicates->map(function ($duplicate) {
                        return ['id' => $duplicate->id, 'title' => $duplicate->title];
                    })->values()->toArray(),
                    'has_duplicates' => $t->duplicates->count() > 0,
                    // Parent/child information
                    'parent' => $t->parent ? ['id' => $t->parent->id, 'title' => $t->parent->title] : null,
                    'is_sub_task' => (bool) $t->parent_id,
                    'children' => $t->children->map(function ($child) {
                        return ['id' => $child->id, 'title' => $child->title];
                    })->values()->toArray(),
                    'has_sub_tasks' => $t->children->count() > 0,
                ];
            });
        };

        $tasks = [];
        foreach ($this->statuses() as $status) {
            $tasks[$status] = $map($raw->get($status, collect()));
        }

        return $tasks;
    }

    /* ------------------------------------------------ Timeline -------- */
    public function timeline(Project $project)
    {
        $this->authorize('view', $project);

        Log::info("🔥 TASKCONTROLLER TIMELINE METHOD CALLED FOR PROJECT {$project->id}");

        $raw = $project->tasks()
            ->with(['creator:id,name', 'assignee:id,name', 'comments.user:id,name', 'attachments'])
            ->orderBy('created_at')
            ->get()
            ->groupBy('status');

        $map = function ($collection) {
            return $collection->values()->map(function (Task $t) {
                return [
                    'id' => $t->id,
                    'title' => $t->title,
                    'description' => $t->description,
                    'cover_image' => optional($t->attachments->firstWhere('kind', 'image'))?->url,
                    'start_date' => $t->start_date ? $t->start_date->format('Y-m-d') : null,
                    'end_date' => $t->end_date ? $t->end_date->format('Y-m-d') : null,
                    'status' => $t->status,
                    'priority' => $t->priority ?? 'medium',
                    'milestone' => $t->milestone ?? false,
                    'creator' => $t->creator ? ['id' => $t->creator->id, 'name' => $t->creator->name] : null,
                    'assignee' => $t->assignee ? ['id' => $t->assignee->id, 'name' => $t->assignee->name] : null,
                    'comments_count' => $t->comments->count(),
                    'attachments_count' => $t->attachments->count(),
                ];
            });
        };

        $tasks = [];
        foreach ($this->statuses() as $status) {
            $tasks[$status] = $map($raw->get($status, collect()));
        }

        // Only project members + owner (match board logic)
        $users = $project->members()->select('users.id', 'users.name')->get()
            ->push(User::select('id', 'name')->find($project->user_id))
            ->unique('id')
            ->values();

        Log::info('🚀 TASKCONTROLLER TIMELINE SENDING DATA', [
            'tasks_count' => collect($tasks)->sum(function ($group) {
                return $group->count();
            }),
            'sample_task' => collect($tasks)->flatten()->first(),
        ]);

        // IMPORTANT: must match resources/js/Pages/Timeline/Timeline.jsx
        return Inertia::render('Timeline/Timeline', compact('project', 'tasks', 'users'));
    }

    /* -------------------------- Store manual task -------------------- */
    public function store(Request $request, Project $project)
    {
        $this->authorize('view', $project);

        $val = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'assignee_id' => 'nullable|exists:users,id',
            'status' => $this->statusesRule(),
            'priority' => $this->prioritiesRule(),
            'milestone' => 'nullable|boolean',
            'duplicate_of' => [
                'nullable',
                'exists:tasks,id',
                function ($attribute, $value, $fail) use ($project) {
                    if ($value && ! $project->tasks()->where('id', $value)->exists()) {
                        $fail('The selected task must belong to the same project.');
                    }
                },
            ],
            'parent_id' => [
                'nullable',
                'exists:tasks,id',
                function ($attribute, $value, $fail) use ($project) {
                    if ($value && ! $project->tasks()->where('id', $value)->exists()) {
                        $fail('The selected parent task must belong to the same project.');
                    }
                },
            ],
        ]);

        $task = $project->tasks()->create([
            'title' => $val['title'],
            'description' => $val['description'] ?? '',
            'start_date' => $val['start_date'] ?? null,
            'end_date' => $val['end_date'] ?? null,
            'creator_id' => $request->user()->id,
            'assignee_id' => $val['assignee_id'] ?? $request->user()->id,
            'status' => $val['status'] ?? 'todo',
            'priority' => $val['priority'] ?? 'medium',
            'milestone' => $val['milestone'] ?? false,
            'duplicate_of' => $val['duplicate_of'] ?? null,
            'parent_id' => $val['parent_id'] ?? null,
        ]);

        TaskCreated::dispatch($task);

        // Always load relations for structured responses
        $task->load(['creator:id,name', 'assignee:id,name', 'duplicateOf:id,title', 'duplicates:id,title', 'parent:id,title', 'children:id,title']);

        $payload = [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'start_date' => $task->start_date ? $task->start_date->format('Y-m-d') : null,
            'end_date' => $task->end_date ? $task->end_date->format('Y-m-d') : null,
            'status' => $task->status,
            'priority' => $task->priority ?? 'medium',
            'milestone' => $task->milestone ?? false,
            'creator' => $task->creator ? ['id' => $task->creator->id, 'name' => $task->creator->name] : null,
            'assignee' => $task->assignee ? ['id' => $task->assignee->id, 'name' => $task->assignee->name] : null,
            'comments_count' => 0,
            'attachments_count' => 0,
            'cover_image' => null,
            'duplicate_of' => $task->duplicateOf ? ['id' => $task->duplicateOf->id, 'title' => $task->duplicateOf->title] : null,
            'is_duplicate' => (bool) $task->duplicate_of,
            'duplicates' => $task->duplicates->map(fn ($d) => ['id' => $d->id, 'title' => $d->title]),
            'has_duplicates' => $task->duplicates->count() > 0,
            'parent' => $task->parent ? ['id' => $task->parent->id, 'title' => $task->parent->title] : null,
            'is_sub_task' => (bool) $task->parent_id,
            'children' => $task->children->map(fn ($c) => ['id' => $c->id, 'title' => $c->title]),
            'has_sub_tasks' => $task->children->count() > 0,
        ];

        // Return JSON only for non-Inertia fetch/AJAX callers
        if (($request->wantsJson() || $request->expectsJson() || $request->ajax()) && ! $request->header('X-Inertia')) {
            return response()->json(['task' => $payload]);
        }

        // Inertia POST fallback (redirect back with flash)
        return back()->with(['success' => 'Task created.', 'task' => $payload]);
    }

    /* ---------------------------- Update task ------------------------ */
    public function update(Request $request, Project $project, Task $task)
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'start_date' => 'sometimes|nullable|date',
            'end_date' => 'sometimes|nullable|date|after_or_equal:start_date',
            'assignee_id' => 'sometimes|nullable|exists:users,id',
            'status' => 'sometimes|'.$this->statusesRule(false),
            'priority' => 'sometimes|'.$this->prioritiesRule(false),
            'milestone' => 'sometimes|nullable|boolean',
            'duplicate_of' => [
                'sometimes',
                'nullable',
                'exists:tasks,id',
                function ($attribute, $value, $fail) use ($task, $project) {
                    if ($value && $value == $task->id) {
                        $fail('A task cannot be a duplicate of itself.');
                    }
                    if ($value && ! $project->tasks()->where('id', $value)->exists()) {
                        $fail('The selected task must belong to the same project.');
                    }
                },
            ],
            'parent_id' => [
                'sometimes',
                'nullable',
                'exists:tasks,id',
                function ($attribute, $value, $fail) use ($task, $project) {
                    if ($value && $value == $task->id) {
                        $fail('A task cannot be a child of itself.');
                    }
                    if ($value && ! $project->tasks()->where('id', $value)->exists()) {
                        $fail('The selected parent task must belong to the same project.');
                    }
                    // Prevent circular relationships
                    if ($value && $this->wouldCreateCircularDependency($task, $value)) {
                        $fail('This would create a circular dependency.');
                    }
                },
            ],
        ]);

        $task->update($validated);

        $changes = array_keys($validated);
        TaskUpdated::dispatch($task, $changes);

        // Return JSON response for AJAX requests (Timeline, etc.)
        if ($request->expectsJson()) {
            $task->load(['assignee:id,name', 'creator:id,name', 'attachments']);
            return response()->json([
                'success' => true,
                'message' => 'Task updated successfully',
                'task' => $task
            ]);
        }

        // Return redirect for regular web requests
        return back()->with('success', 'Task updated.');
    }

    /* ---------------------------- Delete task ------------------------ */
    public function destroy(Project $project, Task $task): RedirectResponse
    {
        $this->authorize('delete', $task);
        $task->delete();

        return back()->with('success', 'Task deleted.');
    }

    /* ---------------------------- Show task with comments ----------- */
    public function show(Project $project, Task $task)
    {
        $this->authorize('view', $project);

        $task->load([
            'creator:id,name',
            'assignee:id,name',
            'comments' => function ($query) {
                $query->with(['user:id,name', 'replies.user:id,name'])
                    ->whereNull('parent_id')
                    ->orderBy('created_at');
            },
            'attachments',
            'comments.attachments',
            'duplicateOf:id,title',
            'duplicates:id,title',
            'parent:id,title',
            'children:id,title',
        ]);

        $taskData = [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'attachments' => $task->attachments->map(function ($a) {
                return [
                    'id' => $a->id,
                    'kind' => $a->kind,
                    'url' => $a->url,
                    'original_name' => $a->original_name,
                ];
            }),
            'start_date' => $task->start_date ? $task->start_date->format('Y-m-d') : null,
            'end_date' => $task->end_date ? $task->end_date->format('Y-m-d') : null,
            'status' => $task->status,
            'priority' => $task->priority ?? 'medium',
            'milestone' => $task->milestone ?? false,
            'creator' => $task->creator ? ['id' => $task->creator->id, 'name' => $task->creator->name] : null,
            'assignee' => $task->assignee ? ['id' => $task->assignee->id, 'name' => $task->assignee->name] : null,
            'comments' => $task->comments->map(function ($comment) {
                return [
                    'id' => $comment->id,
                    'content' => $comment->content,
                    'attachments' => $comment->attachments->map(function ($a) {
                        return [
                            'id' => $a->id,
                            'kind' => $a->kind,
                            'url' => $a->url,
                            'original_name' => $a->original_name,
                        ];
                    }),
                    'user' => ['id' => $comment->user->id, 'name' => $comment->user->name],
                    'created_at' => $comment->created_at->format('Y-m-d H:i:s'),
                    'replies' => $comment->replies->map(function ($reply) {
                        return [
                            'id' => $reply->id,
                            'content' => $reply->content,
                            'attachments' => $reply->attachments->map(function ($a) {
                                return [
                                    'id' => $a->id,
                                    'kind' => $a->kind,
                                    'url' => $a->url,
                                    'original_name' => $a->original_name,
                                ];
                            }),
                            'user' => ['id' => $reply->user->id, 'name' => $reply->user->name],
                            'created_at' => $reply->created_at->format('Y-m-d H:i:s'),
                        ];
                    }),
                ];
            }),
            // Duplicate information
            'duplicate_of' => $task->duplicateOf ? ['id' => $task->duplicateOf->id, 'title' => $task->duplicateOf->title] : null,
            'is_duplicate' => (bool) $task->duplicate_of,
            'duplicates' => $task->duplicates->map(function ($duplicate) {
                return ['id' => $duplicate->id, 'title' => $duplicate->title];
            }),
            'has_duplicates' => $task->duplicates->count() > 0,
            // Parent/child information
            'parent' => $task->parent ? ['id' => $task->parent->id, 'title' => $task->parent->title] : null,
            'is_sub_task' => (bool) $task->parent_id,
            'children' => $task->children->map(function ($child) {
                return ['id' => $child->id, 'title' => $child->title];
            }),
            'has_sub_tasks' => $task->children->count() > 0,
        ];

        // Only expose project members (including owner) - SECURITY: prevent user enumeration
        $users = $project->members()->select('users.id', 'users.name')->get()
            ->push(User::select('id', 'name')->find($project->user_id))
            ->unique('id')
            ->values();
        $priorities = $this->priorities();

        // Get all tasks in the project for the duplicate_of dropdown
        $allTasks = $project->tasks()
            ->select('id', 'title')
            ->where('id', '!=', $task->id) // Exclude current task
            ->orderBy('title')
            ->get();

        // Get project methodology for status options
        $methodology = $project->meta['methodology'] ?? 'kanban';

        return Inertia::render('Tasks/Show', compact('project', 'taskData', 'users', 'priorities', 'allTasks', 'methodology'));
    }

    /* ========= AI FLOW ========= */

    public function generateWithAI(Request $request, Project $project, TaskGeneratorService $generator): RedirectResponse
    {
        $this->authorize('view', $project);

        $val = $request->validate([
            'count' => ['required', 'integer', 'min:1', 'max:50'],
            'prompt' => ['nullable', 'string', 'max:2000'],
        ]);

        $user = $request->user();

        // Check if user can generate AI tasks
        if (! $user->canGenerateAiTasks($val['count'])) {
            return back()
                ->withErrors(['ai' => 'You have reached your AI task generation limit for this month. Upgrade your plan for more tasks.'])
                ->withInput();
        }

        $apiKey = config('openai.api_key');
        if (empty($apiKey)) {
            if ($request->expectsJson() || $request->header('X-Inertia')) {
                return redirect()->back()->withErrors(['ai' => 'Missing OPENAI_API_KEY on server.'])->withInput();
            }

            return redirect()->back()->withErrors(['ai' => 'Missing OPENAI_API_KEY on server.'])->withInput();
        }

        try {
            $tasks = $generator->generateTasks($project, $val['count'], $val['prompt'] ?? '');
        } catch (\Throwable $e) {
            return back()
                ->withErrors(['ai' => 'AI error: '.$e->getMessage()])
                ->withInput();
        }

        // Track usage
        $user->incrementAiTaskUsage($val['count']);

        foreach ($tasks as $t) {
            if (! ($t['title'] ?? null)) {
                continue;
            }

            $project->tasks()->create([
                'title' => $t['title'],
                'description' => $t['description'] ?? '',
                'start_date' => $t['start_date'] ?? null,
                'end_date' => $t['end_date'] ?? null,
                'status' => 'todo',
                'creator_id' => $request->user()->id,
                'milestone' => $t['milestone'] ?? false,
            ]);
        }

        return redirect()
            ->route('tasks.index', $project)
            ->with('success', $val['count'].' AI-generated tasks added.');
    }

    public function previewWithAI(Request $request, Project $project, TaskGeneratorService $generator)
    {
        $this->authorize('view', $project);

        $val = $request->validate([
            'count' => ['required', 'integer', 'min:1', 'max:8'],
            'prompt' => ['nullable', 'string', 'max:2000'],
            'pinnedTasks' => ['nullable', 'array'],
            'pinnedTasks.*.title' => ['required', 'string'],
            'pinnedTasks.*.description' => ['nullable', 'string'],
            'pinnedTasks.*.end_date' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $shouldShowOverlay = $user->shouldShowOverlay('ai_assistant'); // Overlay for free tier
        $limitExceeded = ! $user->canGenerateAiTasks($val['count']);
        $canGenerateFreely = ! $shouldShowOverlay && ! $limitExceeded;

        // Generate tasks regardless, but mark them differently for free users
        $apiKey = config('openai.api_key');
        if (empty($apiKey)) {
            $payload = [
                'message' => 'AI is not configured on this server. Set OPENAI_API_KEY.',
                'errors' => ['api' => ['Missing OPENAI_API_KEY on server']],
            ];

            // For Inertia requests, always redirect back with errors, never return JSON
            return back()->withErrors($payload['errors'])->withInput();
        }

        try {
            Log::info('TaskGeneratorService: About to generate tasks', [
                'project_id' => $project->id,
                'count' => $val['count'],
                'prompt' => $val['prompt'] ?? 'none',
            ]);

            $pinnedTasks = $val['pinnedTasks'] ?? [];
            $pinnedCount = count($pinnedTasks);
            $newTasksNeeded = max(0, $val['count'] - $pinnedCount);

            // Only generate new tasks if we need more than what's pinned
            $newTasks = [];
            if ($newTasksNeeded > 0) {
                $newTasks = $generator->generateTasks($project, $newTasksNeeded, $val['prompt'] ?? '');
            }

            // Combine pinned tasks with newly generated tasks
            $tasks = array_merge($pinnedTasks, $newTasks);

            Log::info('TaskGeneratorService: Tasks generated successfully', [
                'project_id' => $project->id,
                'pinned_count' => $pinnedCount,
                'new_tasks_count' => count($newTasks),
                'total_task_count' => count($tasks),
                'first_task' => $tasks[0]['title'] ?? 'none',
            ]);

        } catch (\Throwable $e) {
            Log::error('TaskGeneratorService: Generation failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $payload = [
                'message' => 'AI error: '.$e->getMessage(),
                'errors' => ['ai' => ['AI error: '.$e->getMessage()]],
            ];

            // For Inertia requests, always redirect back with errors, never return JSON
            return back()->withErrors($payload['errors'])->withInput();
        }

        Log::info('TaskGeneratorService: About to render preview', [
            'project_id' => $project->id,
            'task_count' => count($tasks),
        ]);

        // Instead of using session, pass data directly via Inertia render
        // This fixes session persistence issues on Heroku
        return Inertia::render('Tasks/AITasksPreview', [
            'project' => $project,
            'generated' => $tasks,
            'originalInput' => $val,
            'showOverlay' => ($shouldShowOverlay || $limitExceeded),
            'limitExceeded' => $limitExceeded,
            'canAccept' => $canGenerateFreely && ! $limitExceeded,
            'usage' => $user->getUsageSummary()['ai_tasks'] ?? null,
            'upgradeUrl' => route('billing.show'),
        ]);
    }

    /**
     * REMOVED: Old session-based preview method that was causing "No pending AI preview found" errors on Heroku
     * Now using direct rendering in previewWithAI method above
     */
    /*
    public function showAIPreview(Project $project)
    {
        $this->authorize('view', $project);

        $data = Session::get("ai_preview.{$project->id}");
        if (!$data) {
            return redirect()
                ->route('tasks.ai.form', $project)
                ->withErrors(['ai' => 'No pending AI preview found. Please generate again.']);
        }

        return Inertia::render('Tasks/AITasksPreview', [
            'project'       => $project,
            'generated'     => $data['generated'] ?? [],
            'originalInput' => $data['originalInput'] ?? [],
        ]);
    }
    */

    public function acceptGenerated(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        $tasks = $request->validate([
            'tasks' => 'required|array',
            'tasks.*.title' => 'required|string|max:255',
            'tasks.*.description' => 'nullable|string',
            'tasks.*.start_date' => 'nullable|date',
            'tasks.*.end_date' => 'nullable|date|after_or_equal:tasks.*.start_date',
            'tasks.*.milestone' => 'nullable|boolean',
        ])['tasks'];

        foreach ($tasks as $t) {
            $project->tasks()->create([
                'title' => $t['title'],
                'description' => $t['description'] ?? '',
                'start_date' => $t['start_date'] ?? null,
                'end_date' => $t['end_date'] ?? null,
                'status' => 'todo',
                'creator_id' => $request->user()->id,
                'milestone' => $t['milestone'] ?? false,
            ]);
        }

        // Clear preview after acceptance
        Session::forget("ai_preview.{$project->id}");

        return redirect()
            ->route('tasks.index', $project)
            ->with('success', count($tasks).' AI-generated tasks added.');
    }

    public function suggestionsAI(Request $request, Project $project, SuggestionChipService $chips)
    {
        $this->authorize('view', $project);

        $max = (int) ($request->integer('max') ?: 8);
        $max = max(3, min(8, $max));

        try {
            $suggestions = $chips->fromProject($project, $max);
        } catch (\Throwable $e) {
            Log::error('SuggestionChipService failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $suggestions = [
                'Define project milestones',
                'Create task checklist',
                'Schedule team meeting',
                'Review requirements',
                'Update documentation',
            ];
        }

        return response()->json([
            'project_id' => $project->id,
            'suggestions' => $suggestions,
        ]);
    }

    /**
     * Accept the previewed tasks and save them to the project.
     */
    public function acceptAIPreview(Request $request, Project $project)
    {
        $this->authorize('view', $project);

        $val = $request->validate([
            'generated' => ['required', 'array'],
            'generated.*.title' => ['required', 'string', 'max:255'],
            'generated.*.description' => ['nullable', 'string'],
            'generated.*.start_date' => ['nullable', 'string'],
            'generated.*.end_date' => ['nullable', 'string'],
        ]);

        $generated = $val['generated'] ?? [];
        $accepted = 0;
        $user = $request->user();

        // Check if user can accept these tasks
        if (! $user->canGenerateAiTasks(count($generated))) {
            return back()
                ->withErrors(['ai' => 'You have reached your AI task generation limit for this month. Upgrade your plan for more tasks.']);
        }

        // Track usage
        $user->incrementAiTaskUsage(count($generated));

        foreach ($generated as $t) {
            if (! ($t['title'] ?? null)) {
                continue;
            }

            $project->tasks()->create([
                'title' => $t['title'],
                'description' => $t['description'] ?? '',
                'start_date' => $t['start_date'] ?? null,
                'end_date' => $t['end_date'] ?? null,
                'status' => 'todo',
                'creator_id' => $request->user()->id,
                'milestone' => $t['milestone'] ?? false,
            ]);
            $accepted++;
        }

        return redirect()
            ->route('tasks.index', $project)
            ->with('success', "$accepted AI-generated tasks added to the project.");
    }

    /**
     * Reject the AI preview (no session cleanup needed anymore).
     */
    public function rejectAIPreview(Project $project)
    {
        $this->authorize('view', $project);

        return redirect()
            ->route('tasks.ai.form', $project)
            ->with('info', 'AI preview discarded. You can generate new tasks.');
    }

    /**
     * Store multiple tasks for a project (bulk creation)
     */
    public function storeBulk(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'tasks' => 'required|array|min:1|max:20',
            'tasks.*.title' => 'required|string|max:255',
            'tasks.*.description' => 'nullable|string|max:2000',
            'tasks.*.status' => 'nullable|string|in:todo,inprogress,review,done',
            'tasks.*.priority' => 'nullable|string|in:low,medium,high,urgent',
            // Note: estimated_hours column doesn't exist in tasks table
        ]);

        $createdTasks = [];

        foreach ($validated['tasks'] as $taskData) {
            $task = $project->tasks()->create([
                'title' => $taskData['title'],
                'description' => $taskData['description'] ?? '',
                'status' => $taskData['status'] ?? 'todo',
                'priority' => $taskData['priority'] ?? 'medium',
                'creator_id' => $request->user()->id,
            ]);

            $createdTasks[] = $task;
        }

        return response()->json([
            'success' => true,
            'message' => 'Tasks created successfully',
            'tasks' => $createdTasks,
            'count' => count($createdTasks),
        ]);
    }
}
