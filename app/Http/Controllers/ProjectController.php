<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class ProjectController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a list of the authenticated user’s projects.
     */
 public function index(Request $request)
{
    $projects = $request->user()->projects()
        ->with(['tasks:id,project_id,title,status'])   // light eager-load
        ->get()
        ->map(function (Project $p) {
            /* group and flatten to plain arrays */
            $grouped = [
                'todo'       => $p->tasks
                                   ->where('status', 'todo')
                                   ->values()
                                   ->map->only('id', 'title')
                                   ->all(),           // <- array, not Collection
                'inprogress' => $p->tasks
                                   ->where('status', 'inprogress')
                                   ->values()
                                   ->map->only('id', 'title')
                                   ->all(),
                'done'       => $p->tasks
                                   ->where('status', 'done')
                                   ->values()
                                   ->map->only('id', 'title')
                                   ->all(),
            ];

            return [
                'id'          => $p->id,
                'name'        => $p->name,
                'description' => $p->description,
                'tasks'       => $grouped,   // 👍 now pure arrays
            ];
        });

    return Inertia::render('Projects/Index', [   // or 'Dashboard', if that’s your page
        'projects' => $projects,
    ]);
}
    /**
     * Show the “create new project” form.
     */
    public function create()
    {
        return Inertia::render('Projects/Create');
    }

    /**
     * Persist a new project and redirect to its board.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $project = $request->user()->projects()->create($validated);

        return redirect()->route('projects.show', $project);
    }

    /**
     * Show the Kanban board for a single project.
     */
    public function show(Project $project)
    {
        $this->authorize('view', $project);

        $rawTasks = $project->tasks()
            ->with(['creator', 'assignee'])
            ->orderBy('created_at')
            ->get()
            ->groupBy('status');

        $tasks = [
            'todo'       => $rawTasks->get('todo', collect())->values(),
            'inprogress' => $rawTasks->get('inprogress', collect())->values(),
            'done'       => $rawTasks->get('done', collect())->values(),
        ];

        return Inertia::render('Tasks/Board', [
            'project' => $project,
            'tasks'   => $tasks,
        ]);
    }

    /**
     * Delete the specified project.
     *
     * @param  \App\Models\Project  $project
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy(Project $project): RedirectResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return redirect()
            ->route('dashboard')
            ->with('flash', 'Project deleted successfully.');
    }
}
