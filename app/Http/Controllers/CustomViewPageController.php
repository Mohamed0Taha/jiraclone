<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class CustomViewPageController extends Controller
{
    public function show(Request $request, Project $project, string $name)
    {
        // Authorize access: project owner or members may view
        $this->authorize('view', $project);

        $methodology = $project->meta['methodology'] ?? 'kanban';

        $tasks = $project->tasks()
            ->with(['creator:id,name', 'assignee:id,name'])
            ->get()
            ->groupBy('status');

        $tasksByStatus = [
            'todo' => $tasks->get('todo', collect())->values(),
            'inprogress' => $tasks->get('inprogress', collect())->values(),
            'review' => $tasks->get('review', collect())->values(),
            'done' => $tasks->get('done', collect())->values(),
            'backlog' => $tasks->get('backlog', collect())->values(),
            'testing' => $tasks->get('testing', collect())->values(),
        ];

        $allTasks = $project->tasks()->with(['creator:id,name', 'assignee:id,name'])->get();

        $users = $project->members()->select('users.id', 'users.name', 'users.email')->get();
        if ($users->isEmpty()) {
            $projectOwner = $project->user()->select('id', 'name', 'email')->first();
            if ($projectOwner) {
                $users = collect([$projectOwner]);
            }
        }

        Log::info('Custom view route data being sent', [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'methodology' => $methodology,
            'tasks_by_status_count' => [
                'todo' => $tasksByStatus['todo']->count(),
                'inprogress' => $tasksByStatus['inprogress']->count(),
                'review' => $tasksByStatus['review']->count(),
                'done' => $tasksByStatus['done']->count(),
            ],
            'all_tasks_count' => $allTasks->count(),
            'all_tasks_is_empty' => $allTasks->isEmpty(),
            'users_count' => $users->count(),
            'users_is_empty' => $users->isEmpty(),
            'all_tasks_sample' => $allTasks->take(2)->toArray(),
            'users_sample' => $users->take(2)->toArray(),
        ]);

        return Inertia::render('Tasks/CustomView', [
            'project' => $project,
            'tasks' => $tasksByStatus,
            'allTasks' => $allTasks->isEmpty() ? [] : $allTasks->toArray(),
            'users' => $users->isEmpty() ? [] : $users->toArray(),
            'methodology' => $methodology,
            'viewName' => $name,
            'isPro' => $request->user()?->hasActiveSubscription() ?? false,
            'auth' => $request->user() ? $request->user()->only(['id', 'name', 'email']) : null,
        ]);
    }
}
