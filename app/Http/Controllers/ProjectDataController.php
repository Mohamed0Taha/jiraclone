<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProjectDataController extends Controller
{
    /**
     * Get project tasks data for API consumption by LLM
     */
    public function getTasks(Request $request, $id): JsonResponse
    {
        try {
            $project = Project::with(['tasks' => function($query) {
                $query->with(['comments.user', 'attachments'])
                      ->orderBy('created_at', 'desc');
            }, 'user:id,name,email'])
            ->findOrFail($id);

            // Check if user has access to this project
            $user = $request->user();
            $hasAccess = $project->user_id === $user->id || 
                        $project->members()->where('users.id', $user->id)->exists();
            
            if (!$hasAccess) {
                return response()->json([
                    'error' => 'Unauthorized access to project'
                ], 403);
            }

            // Format tasks data for API consumption
            $tasks = $project->tasks->map(function ($task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status,
                    'priority' => $task->priority ?? 'medium',
                    'created_at' => $task->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $task->updated_at->format('Y-m-d H:i:s'),
                    'due_date' => $task->due_date ? $task->due_date->format('Y-m-d') : null,
                    'assignee' => $task->assignee_id ? [
                        'id' => $task->assignee_id,
                        'name' => $task->assignee_name ?? 'Unknown'
                    ] : null,
                    'comments_count' => $task->comments->count(),
                    'attachments_count' => $task->attachments->count(),
                    'tags' => $task->tags ?? [],
                ];
            });

            return response()->json([
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'description' => $project->description,
                    'owner' => [
                        'id' => $project->user->id,
                        'name' => $project->user->name,
                    ],
                    'created_at' => $project->created_at->format('Y-m-d H:i:s'),
                ],
                'tasks' => $tasks,
                'meta' => [
                    'total_tasks' => $tasks->count(),
                    'by_status' => [
                        'todo' => $tasks->where('status', 'todo')->count(),
                        'inprogress' => $tasks->where('status', 'inprogress')->count(),
                        'review' => $tasks->where('status', 'review')->count(),
                        'done' => $tasks->where('status', 'done')->count(),
                    ],
                    'endpoint' => url("/api/project/{$id}/tasks"),
                    'generated_at' => now()->toISOString(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch project data',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get comprehensive dashboard data for a project
     */
    public function getDashboardData(Request $request, $id): JsonResponse
    {
        try {
            $project = Project::with(['tasks', 'user:id,name,email', 'members:id,name,email'])
                             ->findOrFail($id);

            // Check if user has access to this project
            $user = $request->user();
            $hasAccess = $project->user_id === $user->id || 
                        $project->members()->where('users.id', $user->id)->exists();
            
            if (!$hasAccess) {
                return response()->json([
                    'error' => 'Unauthorized access to project'
                ], 403);
            }

            // Get task statistics
            $tasks = $project->tasks;
            $tasksByStatus = $tasks->groupBy('status');
            $tasksByPriority = $tasks->groupBy('priority');

            // Calculate project progress
            $totalTasks = $tasks->count();
            $completedTasks = $tasksByStatus->get('done', collect())->count();
            $progressPercentage = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 2) : 0;

            return response()->json([
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'description' => $project->description,
                    'owner' => $project->user,
                    'members' => $project->members,
                    'created_at' => $project->created_at->format('Y-m-d H:i:s'),
                ],
                'statistics' => [
                    'total_tasks' => $totalTasks,
                    'completed_tasks' => $completedTasks,
                    'progress_percentage' => $progressPercentage,
                    'tasks_by_status' => [
                        'todo' => $tasksByStatus->get('todo', collect())->count(),
                        'inprogress' => $tasksByStatus->get('inprogress', collect())->count(),
                        'review' => $tasksByStatus->get('review', collect())->count(),
                        'done' => $tasksByStatus->get('done', collect())->count(),
                    ],
                    'tasks_by_priority' => [
                        'low' => $tasksByPriority->get('low', collect())->count(),
                        'medium' => $tasksByPriority->get('medium', collect())->count(),
                        'high' => $tasksByPriority->get('high', collect())->count(),
                        'urgent' => $tasksByPriority->get('urgent', collect())->count(),
                    ],
                ],
                'recent_activity' => $tasks->sortByDesc('updated_at')->take(10)->map(function ($task) {
                    return [
                        'id' => $task->id,
                        'title' => $task->title,
                        'status' => $task->status,
                        'updated_at' => $task->updated_at->format('Y-m-d H:i:s'),
                    ];
                })->values(),
                'endpoints' => [
                    'tasks' => url("/api/project/{$id}/tasks"),
                    'dashboard' => url("/api/project/{$id}/dashboard-data"),
                ],
                'generated_at' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch dashboard data',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}