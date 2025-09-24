<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $ownedProjects = $user->projects()
            ->with(['tasks:id,project_id,title,status', 'user:id,name'])
            ->get();

        $memberProjects = $user->memberProjects()
            ->with(['tasks:id,project_id,title,status', 'user:id,name'])
            ->get();

        $allProjects = $ownedProjects->merge($memberProjects)->unique('id');

        $projects = $allProjects->map(function ($p) use ($user) {
            $group = fn (string $status) => $p->tasks
                ->where('status', $status)
                ->values()
                ->map->only('id', 'title')
                ->all();

            return [
                'id' => $p->id,
                'name' => $p->name,
                'description' => $p->description,
                'status' => $p->status ?? 'active',
                'is_owner' => $p->user_id === $user->id,
                'owner' => [
                    'id' => $p->user->id,
                    'name' => $p->user->name,
                ],
                'tasks' => [
                    'todo' => $group('todo'),
                    'inprogress' => $group('inprogress'),
                    'review' => $group('review'),
                    'done' => $group('done'),
                ],
            ];
        });

        return Inertia::render('Dashboard', [
            'projects' => $projects,
            'appsumo_welcome' => session('appsumo_welcome'),
            'message' => session('message'),
        ]);
    }
}

