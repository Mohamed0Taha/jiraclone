<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProjectDataController extends Controller
{
    /**
     * Get tasks for a specific project
     */
    public function getTasks(Request $request, $id): JsonResponse
    {
        try {
            $project = Project::with(['tasks' => function($query) {
                $query->select([
                    'id', 'title', 'description', 'status', 'priority', 'end_date',
                    'created_at', 'updated_at', 'project_id', 'assignee_id'
                ])->with('assignee:id,name,email');
            }])->findOrFail($id);

            // Check if user has access to this project
            if (!$this->userCanAccessProject($request->user(), $project)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Access denied'
                ], 403);
            }

            $tasks = $project->tasks->map(function($task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'due_date' => $task->end_date,
                    'created_at' => $task->created_at,
                    'updated_at' => $task->updated_at,
                    'assignee' => $task->assignee ? [
                        'id' => $task->assignee->id,
                        'name' => $task->assignee->name,
                        'email' => $task->assignee->email
                    ] : null
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'project' => [
                        'id' => $project->id,
                        'name' => $project->name,
                        'description' => $project->description
                    ],
                    'tasks' => $tasks,
                    'summary' => [
                        'total_tasks' => $tasks->count(),
                        'completed_tasks' => $tasks->where('status', 'done')->count(),
                        'pending_tasks' => $tasks->where('status', '!=', 'done')->count(),
                        'high_priority_tasks' => $tasks->where('priority', 'high')->count()
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching project tasks', [
                'project_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch project tasks'
            ], 500);
        }
    }

    /**
     * Get comprehensive dashboard data for a project
     */
    public function getDashboardData(Request $request, $id): JsonResponse
    {
        try {
            $project = Project::with([
                'tasks.assignee:id,name,email',
                'team_members:id,name,email'
            ])->findOrFail($id);

            if (!$this->userCanAccessProject($request->user(), $project)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Access denied'
                ], 403);
            }

            $tasks = $project->tasks;

            // Generate comprehensive analytics
            $analytics = [
                'task_status_distribution' => $this->getTaskStatusDistribution($tasks),
                'priority_distribution' => $this->getPriorityDistribution($tasks),
                'assignee_workload' => $this->getAssigneeWorkload($tasks),
                'completion_trends' => $this->getCompletionTrends($tasks),
                'overdue_tasks' => $this->getOverdueTasks($tasks),
                'recent_activity' => $this->getRecentActivity($tasks)
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'project' => [
                        'id' => $project->id,
                        'name' => $project->name,
                        'description' => $project->description,
                        'created_at' => $project->created_at,
                        'team_size' => $project->team_members->count()
                    ],
                    'tasks' => $tasks,
                    'analytics' => $analytics,
                    'endpoint_info' => [
                        'base_url' => url("/api/project/{$id}"),
                        'available_endpoints' => [
                            'tasks' => "/api/project/{$id}/tasks",
                            'dashboard_data' => "/api/project/{$id}/dashboard-data"
                        ]
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching dashboard data', [
                'project_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch dashboard data'
            ], 500);
        }
    }

    private function userCanAccessProject($user, $project): bool
    {
        return $user->id === $project->user_id || 
               $project->team_members->contains('id', $user->id);
    }

    private function getTaskStatusDistribution($tasks): array
    {
        return $tasks->groupBy('status')->map->count()->toArray();
    }

    private function getPriorityDistribution($tasks): array
    {
        return $tasks->groupBy('priority')->map->count()->toArray();
    }

    private function getAssigneeWorkload($tasks): array
    {
        return $tasks->groupBy('assignee_id')->map(function($assigneeTasks) {
            $assignee = $assigneeTasks->first()->assignee;
            return [
                'assignee' => $assignee ? $assignee->name : 'Unassigned',
                'total_tasks' => $assigneeTasks->count(),
                'completed_tasks' => $assigneeTasks->where('status', 'done')->count(),
                'pending_tasks' => $assigneeTasks->where('status', '!=', 'done')->count()
            ];
        })->values()->toArray();
    }

    private function getCompletionTrends($tasks): array
    {
        $completedTasks = $tasks->where('status', 'done');
        
        $trends = $completedTasks->groupBy(function($task) {
            return $task->updated_at->format('Y-m-d');
        })->map->count();

        return $trends->take(30)->toArray(); // Last 30 days
    }

    private function getOverdueTasks($tasks): array
    {
        $overdue = $tasks->filter(function($task) {
            return $task->end_date && 
                   $task->end_date < now() && 
                   $task->status !== 'done';
        });

        return $overdue->map(function($task) {
            return [
                'id' => $task->id,
                'title' => $task->title,
                'due_date' => $task->end_date,
                'days_overdue' => now()->diffInDays($task->end_date)
            ];
        })->values()->toArray();
    }

    private function getRecentActivity($tasks): array
    {
        return $tasks->sortByDesc('updated_at')
                    ->take(10)
                    ->map(function($task) {
                        return [
                            'id' => $task->id,
                            'title' => $task->title,
                            'status' => $task->status,
                            'updated_at' => $task->updated_at,
                            'assignee' => $task->assignee ? $task->assignee->name : 'Unassigned'
                        ];
                    })->values()->toArray();
    }
}
