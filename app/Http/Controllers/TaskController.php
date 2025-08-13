<?php

namespace App\Http\Controllers;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Log;
use App\Services\TaskGeneratorService;
use App\Services\SuggestionChipService;
use Illuminate\Support\Facades\Session;

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
        $rule = 'in:' . implode(',', $this->statuses());
        return $nullable ? 'nullable|' . $rule : $rule;
    }

    protected function prioritiesRule(bool $nullable = true): string
    {
        $rule = 'in:' . implode(',', $this->priorities());
        return $nullable ? 'nullable|' . $rule : $rule;
    }

    /* ------------------------------------------------ Board ----------- */
    public function index(Project $project)
    {
        $this->authorize('view', $project);

        $raw = $project->tasks()
            ->with(['creator:id,name', 'assignee:id,name', 'comments.user:id,name'])
            ->orderBy('created_at')
            ->get()
            ->groupBy('status');

        $map = function ($collection) {
            return $collection->values()->map(function (Task $t) {
                return [
                    'id'             => $t->id,
                    'title'          => $t->title,
                    'description'    => $t->description,
                    'start_date'     => $t->start_date ? $t->start_date->format('Y-m-d') : null,
                    'end_date'       => $t->end_date ? $t->end_date->format('Y-m-d') : null,
                    'status'         => $t->status,
                    'priority'       => $t->priority ?? 'medium',
                    'milestone'      => $t->milestone ?? false,
                    'creator'        => $t->creator ? ['id' => $t->creator->id, 'name' => $t->creator->name] : null,
                    'assignee'       => $t->assignee ? ['id' => $t->assignee->id, 'name' => $t->assignee->name] : null,
                    'comments_count' => $t->comments->count(),
                ];
            });
        };

        $tasks = [];
        foreach ($this->statuses() as $status) {
            $tasks[$status] = $map($raw->get($status, collect()));
        }

        $users = User::select('id', 'name')->get();

        return Inertia::render('Tasks/Board', compact('project', 'tasks', 'users'));
    }

    /* ------------------------------------------------ Timeline -------- */
    public function timeline(Project $project)
    {
        $this->authorize('view', $project);

        Log::info("🔥 TASKCONTROLLER TIMELINE METHOD CALLED FOR PROJECT {$project->id}");

        $raw = $project->tasks()
            ->with(['creator:id,name', 'assignee:id,name', 'comments.user:id,name'])
            ->orderBy('created_at')
            ->get()
            ->groupBy('status');

        $map = function ($collection) {
            return $collection->values()->map(function (Task $t) {
                return [
                    'id'             => $t->id,
                    'title'          => $t->title,
                    'description'    => $t->description,
                    'start_date'     => $t->start_date ? $t->start_date->format('Y-m-d') : null,
                    'end_date'       => $t->end_date ? $t->end_date->format('Y-m-d') : null,
                    'status'         => $t->status,
                    'priority'       => $t->priority ?? 'medium',
                    'milestone'      => $t->milestone ?? false,
                    'creator'        => $t->creator ? ['id' => $t->creator->id, 'name' => $t->creator->name] : null,
                    'assignee'       => $t->assignee ? ['id' => $t->assignee->id, 'name' => $t->assignee->name] : null,
                    'comments_count' => $t->comments->count(),
                ];
            });
        };

        $tasks = [];
        foreach ($this->statuses() as $status) {
            $tasks[$status] = $map($raw->get($status, collect()));
        }

        $users = User::select('id', 'name')->get();

        Log::info("🚀 TASKCONTROLLER TIMELINE SENDING DATA", [
            'tasks_count' => collect($tasks)->sum(function ($group) { return $group->count(); }),
            'sample_task' => collect($tasks)->flatten()->first()
        ]);

        // IMPORTANT: must match resources/js/Pages/Timeline/Timeline.jsx
        return Inertia::render('Timeline/Timeline', compact('project', 'tasks', 'users'));
    }

    /* -------------------------- Store manual task -------------------- */
    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        $val = $request->validate([
            'title'          => 'required|string|max:255',
            'description'    => 'nullable|string',
            'start_date'     => 'nullable|date',
            'end_date'       => 'nullable|date|after_or_equal:start_date',
            'assignee_id'    => 'nullable|exists:users,id',
            'status'         => $this->statusesRule(),
            'priority'       => $this->prioritiesRule(),
            'milestone'      => 'nullable|boolean',
        ]);

        $task = $project->tasks()->create([
            'title'          => $val['title'],
            'description'    => $val['description']    ?? '',
            'start_date'     => $val['start_date']     ?? null,
            'end_date'       => $val['end_date']       ?? null,
            'creator_id'     => $request->user()->id,
            'assignee_id'    => $val['assignee_id']    ?? $request->user()->id,
            'status'         => $val['status']         ?? 'todo',
            'priority'       => $val['priority']       ?? 'medium',
            'milestone'      => $val['milestone']      ?? false,
        ]);

        TaskCreated::dispatch($task);

        return back()->with('success', 'Task created.');
    }

    /* ---------------------------- Update task ------------------------ */
    public function update(Request $request, Project $project, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'title'          => 'sometimes|required|string|max:255',
            'description'    => 'sometimes|nullable|string',
            'start_date'     => 'sometimes|nullable|date',
            'end_date'       => 'sometimes|nullable|date|after_or_equal:start_date',
            'assignee_id'    => 'sometimes|nullable|exists:users,id',
            'status'         => 'sometimes|' . $this->statusesRule(false),
            'priority'       => 'sometimes|' . $this->prioritiesRule(false),
            'milestone'      => 'sometimes|nullable|boolean',
        ]);

        $task->update($validated);

        $changes = array_keys($validated);
        TaskUpdated::dispatch($task, $changes);

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
            }
        ]);

        $taskData = [
            'id'             => $task->id,
            'title'          => $task->title,
            'description'    => $task->description,
            'start_date'     => $task->start_date ? $task->start_date->format('Y-m-d') : null,
            'end_date'       => $task->end_date ? $task->end_date->format('Y-m-d') : null,
            'status'         => $task->status,
            'priority'       => $task->priority ?? 'medium',
            'milestone'      => $task->milestone ?? false,
            'creator'        => $task->creator ? ['id' => $task->creator->id, 'name' => $task->creator->name] : null,
            'assignee'       => $task->assignee ? ['id' => $task->assignee->id, 'name' => $task->assignee->name] : null,
            'comments'       => $task->comments->map(function ($comment) {
                return [
                    'id'         => $comment->id,
                    'content'    => $comment->content,
                    'user'       => ['id' => $comment->user->id, 'name' => $comment->user->name],
                    'created_at' => $comment->created_at->format('Y-m-d H:i:s'),
                    'replies'    => $comment->replies->map(function ($reply) {
                        return [
                            'id'         => $reply->id,
                            'content'    => $reply->content,
                            'user'       => ['id' => $reply->user->id, 'name' => $reply->user->name],
                            'created_at' => $reply->created_at->format('Y-m-d H:i:s'),
                        ];
                    }),
                ];
            }),
        ];

        $users = User::select('id', 'name')->get();
        $priorities = $this->priorities();

        return Inertia::render('Tasks/Show', compact('project', 'taskData', 'users', 'priorities'));
    }

    /* ========= AI FLOW ========= */

    public function generateWithAI(Request $request, Project $project, TaskGeneratorService $generator): RedirectResponse
    {
        $this->authorize('view', $project);

        $val = $request->validate([
            'count'  => ['required', 'integer', 'min:1', 'max:50'],
            'prompt' => ['nullable', 'string', 'max:2000'],
        ]);

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
                ->withErrors(['ai' => 'AI error: ' . $e->getMessage()])
                ->withInput();
        }

        foreach ($tasks as $t) {
            if (!($t['title'] ?? null)) continue;

            $project->tasks()->create([
                'title'          => $t['title'],
                'description'    => $t['description']    ?? '',
                'start_date'     => $t['start_date']     ?? null,
                'end_date'       => $t['end_date']       ?? null,
                'status'         => 'todo',
                'creator_id'     => $request->user()->id,
                'milestone'      => $t['milestone']      ?? false,
            ]);
        }

        return redirect()
            ->route('tasks.index', $project)
            ->with('success', $val['count'] . ' AI-generated tasks added.');
    }

    public function previewWithAI(Request $request, Project $project, TaskGeneratorService $generator)
    {
        $this->authorize('view', $project);

        $val = $request->validate([
            'count'  => ['required', 'integer', 'min:1', 'max:50'],
            'prompt' => ['nullable', 'string', 'max:2000'],
        ]);

        $apiKey = config('openai.api_key');
        if (empty($apiKey)) {
            $payload = [
                'message' => 'AI is not configured on this server. Set OPENAI_API_KEY.',
                'errors'  => ['api' => ['Missing OPENAI_API_KEY on server']],
            ];
            // For Inertia requests, always redirect back with errors, never return JSON
            return back()->withErrors($payload['errors'])->withInput();
        }

        try {
            $tasks = $generator->generateTasks($project, $val['count'], $val['prompt'] ?? '');
        } catch (\Throwable $e) {
            $payload = [
                'message' => 'AI error: ' . $e->getMessage(),
                'errors'  => ['ai' => ['AI error: ' . $e->getMessage()]],
            ];
            // For Inertia requests, always redirect back with errors, never return JSON
            return back()->withErrors($payload['errors'])->withInput();
        }

        // Stash preview in session, then 303 redirect to a GET that renders it (Inertia best practice)
        Session::put("ai_preview.{$project->id}", [
            'generated'     => $tasks,
            'originalInput' => $val,
            'ts'            => now()->toISOString(),
        ]);

        return redirect()
            ->route('tasks.ai.preview.show', $project)
            ->setStatusCode(303);
    }

    /**
     * GET view for the preview (reads from session).
     */
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

    public function acceptGenerated(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        $tasks = $request->validate([
            'tasks'                  => 'required|array',
            'tasks.*.title'          => 'required|string|max:255',
            'tasks.*.description'    => 'nullable|string',
            'tasks.*.start_date'     => 'nullable|date',
            'tasks.*.end_date'       => 'nullable|date|after_or_equal:tasks.*.start_date',
            'tasks.*.milestone'      => 'nullable|boolean',
        ])['tasks'];

        foreach ($tasks as $t) {
            $project->tasks()->create([
                'title'          => $t['title'],
                'description'    => $t['description']    ?? '',
                'start_date'     => $t['start_date']     ?? null,
                'end_date'       => $t['end_date']       ?? null,
                'status'         => 'todo',
                'creator_id'     => $request->user()->id,
                'milestone'      => $t['milestone']      ?? false,
            ]);
        }

        // Clear preview after acceptance
        Session::forget("ai_preview.{$project->id}");

        return redirect()
            ->route('tasks.index', $project)
            ->with('success', count($tasks) . ' AI-generated tasks added.');
    }

    public function suggestionsAI(Request $request, Project $project, SuggestionChipService $chips)
    {
        $this->authorize('view', $project);

        $max = (int) ($request->integer('max') ?: 8);
        $max = max(3, min(10, $max));

        try {
            $suggestions = $chips->fromProject($project, $max);
        } catch (\Throwable $e) {
            Log::error('SuggestionChipService failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $suggestions = [
                'Define project milestones',
                'Create task checklist',
                'Schedule team meeting',
                'Review requirements',
                'Update documentation'
            ];
        }

        return response()->json([
            'project_id'  => $project->id,
            'suggestions' => $suggestions,
        ]);
    }

    /**
     * Accept the previewed tasks and save them to the project.
     */
    public function acceptAIPreview(Request $request, Project $project)
    {
        $this->authorize('view', $project);

        $data = Session::get("ai_preview.{$project->id}");
        if (!$data) {
            return redirect()
                ->route('tasks.ai.form', $project)
                ->withErrors(['ai' => 'No pending AI preview found. Please generate again.']);
        }

        $generated = $data['generated'] ?? [];
        $accepted = 0;

        foreach ($generated as $t) {
            if (!($t['title'] ?? null)) continue;

            $project->tasks()->create([
                'title'          => $t['title'],
                'description'    => $t['description']    ?? '',
                'start_date'     => $t['start_date']     ?? null,
                'end_date'       => $t['end_date']       ?? null,
                'status'         => 'todo',
                'creator_id'     => $request->user()->id,
                'milestone'      => $t['milestone']      ?? false,
            ]);
            $accepted++;
        }

        // Clear the session data
        Session::forget("ai_preview.{$project->id}");

        return redirect()
            ->route('tasks.index', $project)
            ->with('success', "$accepted AI-generated tasks added to the project.");
    }

    /**
     * Reject the AI preview and clear session.
     */
    public function rejectAIPreview(Project $project)
    {
        $this->authorize('view', $project);

        Session::forget("ai_preview.{$project->id}");

        return redirect()
            ->route('tasks.ai.form', $project)
            ->with('info', 'AI preview discarded. You can generate new tasks.');
    }
}
