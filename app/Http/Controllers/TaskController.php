<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Services\TaskGeneratorService;

class TaskController extends Controller
{
    use AuthorizesRequests;

    /* ------------------------------------------------ Board ----------- */
    public function index(Project $project)
    {
        $this->authorize('view', $project);

        $raw   = $project->tasks()->with(['creator','assignee'])
                     ->orderBy('created_at')->get()->groupBy('status');

        $tasks = [
            'todo'       => $raw->get('todo', collect())->values(),
            'inprogress' => $raw->get('inprogress', collect())->values(),
            'done'       => $raw->get('done', collect())->values(),
        ];

        $users = User::select('id','name')->get();

        return Inertia::render('Tasks/Board', compact('project','tasks','users'));
    }

    /* -------------------------- Store manual task -------------------- */
    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        $val = $request->validate([
            'title'          => 'required|string|max:255',
            'description'    => 'nullable|string',
            'execution_date' => 'nullable|date',
            'assignee_id'    => 'nullable|exists:users,id',
            'status'         => 'nullable|in:todo,inprogress,done',
        ]);

        $project->tasks()->create([
            'title'          => $val['title'],
            'description'    => $val['description']    ?? '',
            'execution_date' => $val['execution_date'] ?? null,
            'creator_id'     => $request->user()->id,
            'assignee_id'    => $val['assignee_id']    ?? $request->user()->id,
            'status'         => $val['status']         ?? 'todo',
        ]);

        return back()->with('success', 'Task created.');
    }

    /* ---------------------------- Update task ------------------------ */
    public function update(Request $request, Project $project, Task $task): RedirectResponse
    {
        $this->authorize('update', $task);

        $task->update(
            $request->validate([
                'title'          => 'sometimes|required|string|max:255',
                'description'    => 'sometimes|nullable|string',
                'execution_date' => 'sometimes|nullable|date',
                'assignee_id'    => 'sometimes|nullable|exists:users,id',
                'status'         => 'sometimes|in:todo,inprogress,done',
            ])
        );

        return back()->with('success', 'Task updated.');
    }

    /* ---------------------------- Delete task ------------------------ */
    public function destroy(Project $project, Task $task): RedirectResponse
    {
        $this->authorize('delete', $task);
        $task->delete();
        return back()->with('success', 'Task deleted.');
    }

    /* ========= AI FLOW ========= */

    /* 1️⃣  ORIGINAL: generate & save immediately */
    public function generateWithAI(
        Request $request, Project $project, TaskGeneratorService $generator
    ): RedirectResponse {
        $this->authorize('view', $project);

        $val = $request->validate([
            'count'  => ['required','integer','min:1','max:50'],
            'prompt' => ['nullable','string','max:2000'],
        ]);

        $tasks = $generator->generateTasks($project, $val['count'], $val['prompt'] ?? '');

        foreach ($tasks as $t) {
            if (! $t['title']) continue;
            $project->tasks()->create([
                'title'          => $t['title'],
                'description'    => $t['description'],
                'execution_date' => $t['execution_date'],
                'status'         => 'todo',
                'creator_id'     => $request->user()->id,
            ]);
        }

        return redirect()->route('tasks.index', $project)
                         ->with('success', $val['count'].' AI-generated tasks added.');
    }

    /* 2️⃣  PREVIEW — generate tasks but do NOT save */
    public function previewWithAI(
        Request $request, Project $project, TaskGeneratorService $generator
    ) {
        $this->authorize('view', $project);

        $val = $request->validate([
            'count'  => ['required','integer','min:1','max:50'],
            'prompt' => ['nullable','string','max:2000'],
        ]);

        try {
            $tasks = $generator->generateTasks($project, $val['count'], $val['prompt'] ?? '');
        } catch (\Throwable $e) {
            return back()->withErrors(['ai' => 'AI error: '.$e->getMessage()])->withInput();
        }

        return Inertia::render('Tasks/AITasksPreview', [
            'project'       => $project,
            'generated'     => $tasks,
            'originalInput' => $val,
        ]);
    }

    /* 3️⃣  ACCEPT — persist tasks after preview */
    public function acceptGenerated(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        $tasks = $request->validate([
            'tasks'                   => 'required|array',
            'tasks.*.title'           => 'required|string|max:255',
            'tasks.*.description'     => 'nullable|string',
            'tasks.*.execution_date'  => 'nullable|date',
        ])['tasks'];

        foreach ($tasks as $t) {
            $project->tasks()->create([
                'title'          => $t['title'],
                'description'    => $t['description']    ?? '',
                'execution_date' => $t['execution_date'] ?? null,
                'status'         => 'todo',
                'creator_id'     => $request->user()->id,
            ]);
        }

        return redirect()->route('tasks.index', $project)
                         ->with('success', count($tasks).' AI-generated tasks added.');
    }
}
