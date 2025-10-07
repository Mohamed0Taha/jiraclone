<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\AssistantManagerService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Carbon\Carbon;
use Exception;

/**
 * AutopilotService
 * 
 * Provides autonomous project management capabilities using AI.
 * Acts as an AI Project Manager that can:
 * - Optimize task scheduling and priorities
 * - Request updates from team members
 * - Respond to comments and questions
 * - Reduce project costs and improve efficiency
 * - Make strategic project decisions
 */
class AutopilotService
{
    public function __construct(
        private AssistantManagerService $assistantManager
    ) {}

    /**
     * Step machine order and nominal durations (in seconds)
     */
    private const STEP_ORDER = [
        'analyze',               // dependency and health analysis
        'optimize_priorities',   // reprioritize tasks
        'assign_tasks',          // assign unassigned
        'request_updates',       // comment pings
        'analyze_timeline',      // deadline adjustments
        'break_down_tasks',      // split large tasks
        'done',
    ];

    private const STEP_DURATIONS = [
        // Keep short so users see actions within ~30s total
        'analyze' => 6,
        'optimize_priorities' => 5,
        'assign_tasks' => 5,
        'request_updates' => 3,
        'analyze_timeline' => 5,
        'break_down_tasks' => 6,
    ];

    /**
     * Start autopilot mode for a project
     */
    public function startAutopilot(Project $project): array
    {
        try {
            Log::info('Starting autopilot for project', ['project_id' => $project->id]);

            // Store autopilot state in project meta (backwards compatible keys retained)
            $meta = $project->meta ?? [];
            $startTime = now();
            $sessionId = 'autopilot-' . time() . '-' . uniqid();

            $autopilot = [
                'enabled' => true,
                'session_id' => $sessionId,
                'started_at' => $startTime->toISOString(),
                'step' => 'analyze',
                'step_started_at' => $startTime->toISOString(),
                'step_started_ts' => $startTime->timestamp,
                'history' => [],
                'completed_steps' => [],
                'update_requests' => [],
            ];

            $project->update([
                'meta' => array_merge($meta, [
                    // New structured state
                    'autopilot' => $autopilot,
                    // Legacy keys (kept so existing UI doesn’t break)
                    'autopilot_enabled' => true,
                    'autopilot_started_at' => $startTime->toISOString(),
                    'autopilot_session_id' => $sessionId,
                    'autopilot_progress' => 0,
                    'autopilot_last_action' => null,
                ])
            ]);

            Log::info('Autopilot started', [
                'project_id' => $project->id,
                'started_at' => $startTime,
                'session_id' => $sessionId
            ]);

            // Initialize autopilot analysis
            $analysis = $this->analyzeProjectState($project);
            
            // Generate initial autopilot actions
            $actions = $this->generateAutopilotActions($project, $analysis);

            return [
                'success' => true,
                'session_id' => $meta['autopilot_session_id'] ?? 'autopilot-' . time(),
                'analysis' => $analysis,
                'actions' => $actions,
                'message' => 'AI Autopilot activated. Analyzing project and optimizing workflow...'
            ];

        } catch (Exception $e) {
            Log::error('Failed to start autopilot', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to start autopilot: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Stop autopilot mode for a project
     */
    public function stopAutopilot(Project $project): array
    {
        try {
            $meta = $project->meta ?? [];
            $autopilot = $meta['autopilot'] ?? [];
            $autopilot['enabled'] = false;
            $autopilot['stopped_at'] = now()->toISOString();

            $project->update([
                'meta' => array_merge($meta, [
                    'autopilot' => $autopilot,
                    'autopilot_enabled' => false,
                    'autopilot_stopped_at' => $autopilot['stopped_at'],
                    'autopilot_progress' => 0, // Reset progress
                ])
            ]);

            return [
                'success' => true,
                'message' => 'AI Autopilot deactivated. Manual control restored.'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Failed to stop autopilot: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Check if autopilot is enabled for a project
     */
    public function isAutopilotEnabled(Project $project): bool
    {
        $meta = $project->meta ?? [];
        return $meta['autopilot_enabled'] ?? false;
    }

    /**
     * Get current autopilot status and active tasks
     */
    public function getAutopilotStatus(Project $project): array
    {
        $meta = $project->meta ?? [];
        $isEnabled = $this->isAutopilotEnabled($project);

        if (!$isEnabled) {
            return [
                'enabled' => false,
                'active_tasks' => [],
                'last_action' => null
            ];
        }

        // Advance state machine and compute active tasks
        $activeTasks = $this->getCurrentAutopilotTasks($project);

        // Snapshot of current state for richer client diagnostics
        $autopilot = $meta['autopilot'] ?? [];

        return [
            'enabled' => true,
            'session_id' => data_get($meta, 'autopilot.session_id', $meta['autopilot_session_id'] ?? null),
            'started_at' => data_get($meta, 'autopilot.started_at', $meta['autopilot_started_at'] ?? null),
            'active_tasks' => $activeTasks,
            'last_action' => $meta['autopilot_last_action'] ?? null,
            'actions_count' => $meta['autopilot_actions_count'] ?? 0,
            'step' => $autopilot['step'] ?? null,
            'history' => $autopilot['history'] ?? [],
            'overall_progress' => $meta['autopilot_progress'] ?? 0,
            'completed_steps' => $autopilot['completed_steps'] ?? [],
        ];
    }

    /**
     * Analyze current project state
     */
    private function analyzeProjectState(Project $project): array
    {
        $tasks = $project->tasks()->with(['assignee'])->get();
        $members = $project->members()->get();

        // Include project owner in team count if not already a member
        $teamSize = $members->count();
        if ($project->user && !$members->contains('id', $project->user_id)) {
            $teamSize += 1;
        }

        $analysis = [
            'total_tasks' => $tasks->count(),
            'completed_tasks' => $tasks->where('status', 'done')->count(),
            'overdue_tasks' => $tasks->where('end_date', '<', now())->where('status', '!=', 'done')->count(),
            'unassigned_tasks' => $tasks->whereNull('assignee_id')->count(),
            'team_size' => $teamSize,
            'project_health' => 'good', // Will be calculated
            'bottlenecks' => [],
            'recommendations' => []
        ];

        // Calculate project health
        $completionRate = $analysis['total_tasks'] > 0 ?
            ($analysis['completed_tasks'] / $analysis['total_tasks']) * 100 : 0;

        if ($completionRate >= 80) {
            $analysis['project_health'] = 'excellent';
        } elseif ($completionRate >= 60) {
            $analysis['project_health'] = 'good';
        } elseif ($completionRate >= 40) {
            $analysis['project_health'] = 'fair';
        } else {
            $analysis['project_health'] = 'needs_attention';
        }

        // Identify bottlenecks
        if ($analysis['overdue_tasks'] > 0) {
            $analysis['bottlenecks'][] = 'overdue_tasks';
        }
        if ($analysis['unassigned_tasks'] > 0) {
            $analysis['bottlenecks'][] = 'unassigned_tasks';
        }

        // Generate recommendations
        $analysis['recommendations'] = $this->generateRecommendations($analysis, $tasks);

        // Store analysis in project meta for future reference
        $meta = $project->meta ?? [];
        $meta['autopilot_analysis'] = $analysis;
        $project->update(['meta' => $meta]);

        return [
            'success' => true,
            'message' => "Analyzed project: {$analysis['total_tasks']} tasks, {$analysis['overdue_tasks']} overdue, {$analysis['unassigned_tasks']} unassigned. Health: {$analysis['project_health']}",
            'analysis' => $analysis
        ];
    }

    /**
     * Generate autopilot actions based on project analysis
     */
    private function generateAutopilotActions(Project $project, array $analysis): array
    {
        $actions = [];

        // Action 1: Optimize task priorities
        if ($analysis['overdue_tasks'] > 0) {
            $actions[] = [
                'type' => 'optimize_priorities',
                'title' => 'Optimizing Task Priorities',
                'description' => 'Reordering tasks based on deadlines and dependencies',
                'status' => 'in_progress',
                'estimated_duration' => '2 minutes'
            ];
        }

        // Action 2: Assign unassigned tasks
        if ($analysis['unassigned_tasks'] > 0) {
            $actions[] = [
                'type' => 'assign_tasks',
                'title' => 'Assigning Tasks to Team Members',
                'description' => 'Distributing unassigned tasks based on workload and expertise',
                'status' => 'pending',
                'estimated_duration' => '3 minutes'
            ];
        }

        // Action 3: Request status updates
        $actions[] = [
            'type' => 'request_updates',
            'title' => 'Requesting Status Updates',
            'description' => 'Asking team members for progress updates on active tasks',
            'status' => 'pending',
            'estimated_duration' => '1 minute'
        ];

        // Action 4: Analyze project timeline
        $actions[] = [
            'type' => 'analyze_timeline',
            'title' => 'Analyzing Project Timeline',
            'description' => 'Reviewing deadlines and suggesting timeline optimizations',
            'status' => 'pending',
            'estimated_duration' => '4 minutes'
        ];

        // Action 5: Break down large tasks if any detected (only tasks without existing children)
        $largeTasks = $project->tasks()
            ->where('status', '!=', 'done')
            ->whereNull('parent_id')
            ->doesntHave('children')
            ->whereNotNull('description')
            ->whereRaw('CHAR_LENGTH(description) > 500')
            ->count();

        if ($largeTasks > 0) {
            $actions[] = [
                'type' => 'break_down_tasks',
                'title' => 'Breaking Down Large Tasks',
                'description' => 'Splitting complex tasks into manageable subtasks',
                'status' => 'pending',
                'estimated_duration' => '5 minutes',
                'tasks_detected' => $largeTasks,
            ];
        }

        return $actions;
    }

    /**
     * Generate recommendations based on analysis
     */
    private function generateRecommendations(array $analysis, Collection $tasks): array
    {
        $recommendations = [];

        if ($analysis['overdue_tasks'] > 0) {
            $recommendations[] = 'Focus on completing overdue tasks first';
        }

        if ($analysis['unassigned_tasks'] > 0) {
            $recommendations[] = 'Assign tasks to team members to improve workflow';
        }

        if ($analysis['project_health'] === 'needs_attention') {
            $recommendations[] = 'Consider adding more resources or extending timeline';
        }

        return $recommendations;
    }

    /**
     * Get current active autopilot tasks
     */
    private function getCurrentAutopilotTasks(Project $project): array
    {
        $meta = $project->meta ?? [];

        // Load structured autopilot state (fallback to legacy keys if needed)
        $autopilot = $meta['autopilot'] ?? [
            'enabled' => $meta['autopilot_enabled'] ?? false,
            'session_id' => $meta['autopilot_session_id'] ?? null,
            'started_at' => $meta['autopilot_started_at'] ?? now()->toISOString(),
            'step' => 'analyze',
            'step_started_at' => $meta['autopilot_started_at'] ?? now()->toISOString(),
            'history' => $meta['autopilot_history'] ?? [],
            'completed_steps' => [],
            'update_requests' => [],
        ];

        if (!($autopilot['enabled'] ?? false)) {
            return [];
        }

        // Advance state machine based on elapsed time
        $step = $autopilot['step'] ?? 'analyze';
        $duration = self::STEP_DURATIONS[$step] ?? 8; // seconds
        $stepTs = $autopilot['step_started_ts'] ?? null;
        if ($stepTs === null) {
            $stepStartedAt = Carbon::parse($autopilot['step_started_at'] ?? now());
            $stepTs = $stepStartedAt->timestamp;
        }
        $elapsed = max(0, now()->timestamp - (int) $stepTs);
        $progress = min(100, (int) floor(($elapsed / $duration) * 100));

        // Execute action once when a step completes, then move to next step
        if ($step === 'done') {
            // Final state; ensure legacy progress is 100 and return completed tasks
            $meta['autopilot_progress'] = 100;
            $meta['autopilot_last_action'] = $meta['autopilot_last_action'] ?? 'analyze_timeline';
        } elseif ($progress >= 100) {
            // Mark step as completed - action execution is handled by executeAutopilotAction
            // Just move to next step if it's ready
            $alreadyCompleted = false;
            if (isset($autopilot['history'])) {
                foreach ($autopilot['history'] as $historyItem) {
                    if (isset($historyItem['step']) && $historyItem['step'] === $step) {
                        $alreadyCompleted = true;
                        break;
                    }
                }
            }

            if ($alreadyCompleted) {
                // Step is already completed, move to next step
                $nextIdx = array_search($step, self::STEP_ORDER, true) + 1;
                $nextStep = self::STEP_ORDER[$nextIdx] ?? 'done';
                $autopilot['step'] = $nextStep;
                $autopilot['step_started_at'] = now()->toISOString();
                $autopilot['step_started_ts'] = now()->timestamp;
                $progress = 0; // reset for new step
            }
        }

        // Compute overall progress for legacy key
        $currentIdx = array_search($autopilot['step'], self::STEP_ORDER, true);
        $completedSteps = max(0, ($currentIdx ?? 0));
        $totalRealSteps = count(self::STEP_ORDER) - 1; // exclude 'done'
        $overall = $autopilot['step'] === 'done'
            ? 100
            : min(100, (int) floor(($completedSteps * 100 + $progress) / ($totalRealSteps)));
        $meta['autopilot_progress'] = $overall;

        // Persist state
        $meta['autopilot'] = $autopilot;
        $project->update(['meta' => $meta]);

        Log::info('Autopilot tick', [
            'project_id' => $project->id,
            'step' => $autopilot['step'],
            'step_progress' => $progress,
            'overall' => $overall,
        ]);

        // Prepare UI tasks (two main cards in overlay)
        // Task 1: Analyzing dependencies (maps to step 'analyze')
        $analyzeStatus = 'completed';
        $analyzeProgress = 100;
        $currentStep = $autopilot['step'];
        if ($currentStep === 'analyze') {
            $analyzeStatus = 'in_progress';
            $analyzeProgress = $progress;
        } elseif (array_search('analyze', self::STEP_ORDER, true) < array_search($currentStep, self::STEP_ORDER, true)) {
            $analyzeStatus = 'completed';
            $analyzeProgress = 100;
        }

        $tasks = [];
        $tasks[] = [
            'id' => 'autopilot-task-1',
            'type' => 'analyze_timeline', // generic icon
            'title' => 'Analyzing task dependencies',
            'description' => $analyzeStatus === 'completed' ? 'Task analysis completed successfully' : 'Examining task relationships and identifying bottlenecks',
            'status' => $analyzeStatus,
            'progress' => $analyzeProgress,
            'started_at' => $autopilot['started_at'] ?? now()->toISOString(),
        ];

        // Task 2: Optimizing team workload distribution (maps to 'assign_tasks')
        $workloadStatus = 'pending';
        $workloadProgress = 0;

        if ($currentStep === 'assign_tasks') {
            $workloadStatus = 'in_progress';
            $workloadProgress = $progress;
        } elseif (in_array($currentStep, ['request_updates', 'analyze_timeline', 'done'], true)) {
            $workloadStatus = 'completed';
            $workloadProgress = 100;
        } elseif (in_array($currentStep, ['optimize_priorities'], true)) {
            // show warming up state
            $workloadStatus = 'pending';
            $workloadProgress = 0;
        }

        $tasks[] = [
            'id' => 'autopilot-task-2',
            'type' => 'assign_tasks',
            'title' => 'Optimizing team workload distribution',
            'description' => $workloadStatus === 'completed' ? 'Task assignments optimized successfully' : 'Balancing task assignments across team members',
            'status' => $workloadStatus,
            'progress' => $workloadProgress,
        ];

        return $tasks;
    }

    /**
     * Execute a specific autopilot action
     */
    public function executeAutopilotAction(Project $project, string $actionType): array
    {
        Log::info('Autopilot: Executing action', [
            'project_id' => $project->id,
            'action_type' => $actionType
        ]);

        try {
            $meta = $project->meta ?? [];
            $autopilot = $meta['autopilot'] ?? [];
            $completedSteps = $autopilot['completed_steps'] ?? [];

            if (in_array($actionType, $completedSteps, true)) {
                return [
                    'success' => true,
                    'message' => ucfirst(str_replace('_', ' ', $actionType)) . ' already completed in this session.',
                    'skipped' => true,
                ];
            }

            $result = null;
            switch ($actionType) {
                case 'analyze':
                    $analysis = $this->analyzeProjectState($project);
                    $result = [
                        'success' => true,
                        'message' => 'Analysis completed',
                        'analysis' => $analysis,
                    ];
                    break;

                case 'optimize_priorities':
                    $result = $this->optimizeTaskPriorities($project);
                    break;

                case 'assign_tasks':
                    $result = $this->assignUnassignedTasks($project);
                    break;

                case 'request_updates':
                    $result = $this->requestStatusUpdates($project);
                    break;

                case 'optimize_timeline':
                case 'analyze_timeline': // Keep for backward compatibility
                    $result = $this->analyzeProjectTimeline($project);
                    break;

                case 'break_down_tasks':
                    $result = $this->breakDownLargeTasks($project);
                    break;

                default:
                    $result = [
                        'success' => false,
                        'message' => 'Unknown action type: ' . $actionType
                    ];
            }

            // Update autopilot state after successful execution
            if ($result['success'] ?? false) {
                $completedSteps[] = $actionType;
                $autopilot['completed_steps'] = array_values(array_unique($completedSteps));

                // Append history entry
                $autopilot['history'][] = [
                    'step' => $actionType,
                    'completed_at' => now()->toISOString(),
                    'result' => $result,
                ];

                // Move to next step
                $idx = array_search($actionType, self::STEP_ORDER, true);
                $nextStep = $idx === false ? 'done' : (self::STEP_ORDER[$idx + 1] ?? 'done');
                $autopilot['step'] = $nextStep;
                $autopilot['step_started_at'] = now()->toISOString();
                $autopilot['step_started_ts'] = now()->timestamp;

                $meta['autopilot'] = $autopilot;
                $meta['autopilot_last_action'] = $actionType;

                // Update legacy progress
                $currentIdx = array_search($nextStep, self::STEP_ORDER, true);
                $completedSteps = max(0, ($currentIdx ?? count(self::STEP_ORDER)));
                $totalRealSteps = count(self::STEP_ORDER) - 1; // exclude 'done'
                $meta['autopilot_progress'] = $nextStep === 'done' ? 100 : min(100, (int) floor(($completedSteps * 100 + 0) / $totalRealSteps));

                $project->update(['meta' => $meta]);
            }

            Log::info('Autopilot: Action completed', [
                'action_type' => $actionType,
                'result' => $result
            ]);

            return $result;
        } catch (Exception $e) {
            Log::error('Autopilot action failed', [
                'project_id' => $project->id,
                'action_type' => $actionType,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Action failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Optimize task priorities based on AI analysis
     */
    private function optimizeTaskPriorities(Project $project): array
    {
        $tasks = $project->tasks()->where('status', '!=', 'done')->get();
        $optimized = 0;
        $priority_changes = [];

        Log::info('Autopilot: Starting priority optimization', [
            'project_id' => $project->id,
            'total_tasks' => $tasks->count()
        ]);

        foreach ($tasks as $task) {
            // AI logic to determine optimal priority
            $newPriority = $this->calculateOptimalPriority($task);

            if ($task->priority !== $newPriority) {
                $oldPriority = $task->priority;
                $task->update(['priority' => $newPriority]);
                $optimized++;

                $priority_changes[] = [
                    'task_id' => $task->id,
                    'task_title' => $task->title,
                    'old_priority' => $oldPriority,
                    'new_priority' => $newPriority,
                ];

                Log::info('Autopilot: Updated task priority', [
                    'task_id' => $task->id,
                    'title' => $task->title,
                    'old_priority' => $oldPriority,
                    'new_priority' => $newPriority
                ]);
            }
        }

        Log::info('Autopilot: Priority optimization completed', [
            'tasks_optimized' => $optimized
        ]);

        return [
            'success' => true,
            'message' => "Optimized priorities for {$optimized} tasks",
            'tasks_affected' => $optimized,
            'priority_changes' => $priority_changes,
        ];
    }

    /**
     * Calculate optimal priority for a task
     */
    private function calculateOptimalPriority(Task $task): string
    {
        $score = 0;

        // Factor 1: Due date proximity
        if ($task->end_date) {
            $daysUntilDue = now()->diffInDays($task->end_date, false);
            if ($daysUntilDue < 0) $score += 100; // Overdue
            elseif ($daysUntilDue <= 1) $score += 80; // Due soon
            elseif ($daysUntilDue <= 3) $score += 60; // Due this week
        }

        // Factor 2: Current priority
        switch ($task->priority) {
            case 'high': $score += 50; break;
            case 'medium': $score += 30; break;
            case 'low': $score += 10; break;
        }

        // Factor 3: Task age
        $ageInDays = $task->created_at->diffInDays(now());
        if ($ageInDays > 7) $score += 20;

        // Determine new priority
        if ($score >= 80) return 'high';
        if ($score >= 40) return 'medium';
        return 'low';
    }

    /**
     * Assign unassigned tasks to team members
     */
    private function assignUnassignedTasks(Project $project): array
    {
        $unassignedTasks = $project->tasks()->whereNull('assignee_id')->get();
        $teamMembers = $project->members()->get();

        // Include project owner if not already a member
        if ($project->user && !$teamMembers->contains('id', $project->user_id)) {
            $teamMembers = $teamMembers->push($project->user);
        }

        $assigned = 0;
        $task_assignments = [];

        Log::info('Autopilot: Starting task assignment', [
            'project_id' => $project->id,
            'unassigned_tasks' => $unassignedTasks->count(),
            'team_members' => $teamMembers->count()
        ]);

        if ($teamMembers->isEmpty()) {
            Log::info('Autopilot: No team members available for assignment');
            return [
                'success' => false,
                'message' => 'No team members available for task assignment',
                'tasks_assigned' => 0,
                'task_assignments' => [],
            ];
        }

        // Build workload map (open tasks per member)
        $counts = \App\Models\Task::select('assignee_id', DB::raw('COUNT(*) as c'))
            ->where('project_id', $project->id)
            ->where('status', '!=', 'done')
            ->whereNotNull('assignee_id')
            ->groupBy('assignee_id')
            ->pluck('c', 'assignee_id');

        $pool = $teamMembers->map(function ($u) use ($counts) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'count' => (int) ($counts[$u->id] ?? 0),
            ];
        })->values()->all();

        $leastLoadedIndex = function () use (&$pool) {
            $minIdx = 0;
            for ($i = 1; $i < count($pool); $i++) {
                if ($pool[$i]['count'] < $pool[$minIdx]['count']) {
                    $minIdx = $i;
                }
            }
            return $minIdx;
        };

        foreach ($unassignedTasks as $task) {
            $idx = $leastLoadedIndex();
            $assigneeId = $pool[$idx]['id'];
            $assigneeName = $pool[$idx]['name'];
            $task->update(['assignee_id' => $assigneeId]);
            $pool[$idx]['count']++;
            $assigned++;

            $task_assignments[] = [
                'task_id' => $task->id,
                'task_title' => $task->title,
                'assignee_id' => $assigneeId,
                'assignee_name' => $assigneeName,
            ];

            Log::info('Autopilot: Assigned task (balanced)', [
                'task_id' => $task->id,
                'task_title' => $task->title,
                'assignee_id' => $assigneeId,
                'assignee_name' => $assigneeName,
            ]);
        }

        Log::info('Autopilot: Task assignment completed', [
            'tasks_assigned' => $assigned
        ]);

        return [
            'success' => true,
            'message' => "Assigned {$assigned} tasks to team members (balanced)",
            'tasks_assigned' => $assigned,
            'task_assignments' => $task_assignments,
        ];
    }

    /**
     * Request status updates from team members
     */
    private function requestStatusUpdates(Project $project): array
    {
        $activeTasks = $project->tasks()
            ->where('status', '!=', 'done')
            ->whereNotNull('assignee_id')
            ->with(['assignee'])
            ->get();

        $requestsSent = 0;
        $update_requests = [];
        // Respect last comment from the project owner: if it is within 24 hours, skip pinging again
        $cutoff = now()->subHours(24);
        $prefix = '🤖 **AI Autopilot Status Request**';

        $meta = $project->meta ?? [];
        $autopilot = $meta['autopilot'] ?? [];
        $requestLog = $autopilot['update_requests'] ?? [];

        foreach ($activeTasks as $task) {
            $logTimestamp = isset($requestLog[$task->id]) ? Carbon::parse($requestLog[$task->id]) : null;
            if ($logTimestamp && $logTimestamp->greaterThan($cutoff)) {
                continue; // already pinged recently this session/window
            }

            // If the latest comment on the task is from the project owner within the last 24h, skip
            $latestOwnerComment = \App\Models\Comment::where('task_id', $task->id)
                ->where('user_id', $project->user_id)
                ->orderBy('created_at', 'desc')
                ->first();

            if ($latestOwnerComment && $latestOwnerComment->created_at->greaterThanOrEqualTo($cutoff)) {
                $requestLog[$task->id] = now()->toISOString();
                continue;
            }

            // As an additional safeguard, avoid duplicates of the same autopilot prefix within the window
            $already = \App\Models\Comment::where('task_id', $task->id)
                ->where('user_id', $project->user_id)
                ->where('content', 'like', $prefix . '%')
                ->where('created_at', '>=', $cutoff)
                ->exists();
            if ($already) {
                $requestLog[$task->id] = now()->toISOString();
                continue;
            }

            // Build a task-specific prompt
            $dueStr = $task->end_date ? $task->end_date->format('M d, Y') : 'no due date';
            $daysLeft = $task->end_date ? now()->diffInDays($task->end_date, false) : null;
            $duePhrase = $task->end_date ? ($daysLeft < 0 ? abs($daysLeft) . ' days overdue' : ($daysLeft === 0 ? 'due today' : 'due in ' . $daysLeft . ' day' . ($daysLeft === 1 ? '' : 's'))) : 'due date not set';
            $priority = $task->priority ?: 'medium';
            $contextLine = "Title: {$task->title}\nPriority: {$priority}\nDeadline: {$dueStr} ({$duePhrase})";

            $content = $prefix . "\n\n@{$task->assignee->name}, quick status check for this task:\n\n" . $contextLine . "\n\nPlease share:\n- Current progress/ETA\n- Any blockers or support needed\n- If dates/priority need adjustment\n\n_Automated by AI Autopilot_";

            $comment = \App\Models\Comment::create([
                'task_id' => $task->id,
                'user_id' => $project->user_id,
                'content' => $content,
            ]);

            $requestLog[$task->id] = now()->toISOString();

            $requestsSent++;
            $update_requests[] = [
                'task_id' => $task->id,
                'task_title' => $task->title,
                'assignee_name' => $task->assignee->name,
                'comment_id' => $comment->id,
            ];
        }

        $autopilot['update_requests'] = $requestLog;
        $meta['autopilot'] = $autopilot;
        $project->update(['meta' => $meta]);

        return [
            'success' => true,
            'message' => "Requested updates for {$requestsSent} active tasks",
            'requests_sent' => $requestsSent,
            'update_requests' => $update_requests,
        ];
    }

    /**
     * Analyze project timeline and suggest optimizations
     */
    private function analyzeProjectTimeline(Project $project): array
    {
        $tasks = $project->tasks()->where('status', '!=', 'done')->get();
        $updated = 0;
        $timeline_changes = [];

        $projectStart = $project->start_date ?: now();
        $projectEnd = $project->end_date; // may be null

        foreach ($tasks as $task) {
            $changed = false;

            $estimatedDays = $task->estimated_hours ? max(1, (int) ceil($task->estimated_hours / 6)) : 2; // 6h/day pace

            // If both dates missing, set pragmatic window within project
            if (!$task->start_date && !$task->end_date) {
                $start = now()->greaterThan($projectStart) ? now()->copy() : $projectStart->copy();
                $end = $start->copy()->addDays($estimatedDays);
                if ($projectEnd && $end->greaterThan($projectEnd)) {
                    $end = $projectEnd->copy();
                    if ($end->lte($start)) {
                        $end = $start->copy()->addDay();
                    }
                }
                $task->update(['start_date' => $start, 'end_date' => $end]);
                $changed = true;
                $timeline_changes[] = [
                    'task_id' => $task->id,
                    'task_title' => $task->title,
                    'change_type' => 'dates_initialized',
                    'start' => $start->format('Y-m-d'),
                    'end' => $end->format('Y-m-d'),
                ];
            }

            // Fix overdue deadlines but clamp to project end if set
            if ($task->end_date && $task->end_date->isPast()) {
                $daysOverdue = now()->diffInDays($task->end_date);
                $proposed = now()->addDays(min(10, $daysOverdue + max(2, (int) ceil($estimatedDays / 2))));
                $newDeadline = $projectEnd && $proposed->greaterThan($projectEnd) ? $projectEnd->copy() : $proposed;
                if ($newDeadline->lte(now())) {
                    $newDeadline = now()->addDay();
                }
                $oldDeadline = $task->end_date;
                $task->update(['end_date' => $newDeadline]);
                \App\Models\Comment::create([
                    'task_id' => $task->id,
                    'user_id' => $project->user_id,
                    'content' => "🤖 **AI Autopilot Timeline Optimization**\n\nThis task was {$daysOverdue} days overdue. Deadline adjusted to " . $newDeadline->format('M d, Y') . " considering the project timeline.\n\n_Automated by AI Autopilot_",
                ]);
                $changed = true;
                $timeline_changes[] = [
                    'task_id' => $task->id,
                    'task_title' => $task->title,
                    'change_type' => 'deadline_adjusted',
                    'old_deadline' => $oldDeadline?->format('Y-m-d'),
                    'new_deadline' => $newDeadline->format('Y-m-d'),
                ];
            }

            // If only end_date exists, add reasonable start
            if (!$task->start_date && $task->end_date) {
                $start = now()->copy();
                if ($projectStart && $projectStart->greaterThan($start)) {
                    $start = $projectStart->copy();
                }
                if ($start->gte($task->end_date)) {
                    $start = $task->end_date->copy()->subDays(min($estimatedDays, 2));
                }
                $task->update(['start_date' => $start]);
                $changed = true;
                $timeline_changes[] = [
                    'task_id' => $task->id,
                    'task_title' => $task->title,
                    'change_type' => 'start_added',
                    'start' => $start->format('Y-m-d'),
                ];
            }

            // Enforce minimum reasonable durations
            if ($task->start_date && $task->end_date) {
                $duration = $task->start_date->diffInDays($task->end_date);
                $minDays = min(7, max(1, (int) ceil(($task->estimated_hours ?: 6) / 6)));
                if ($duration < $minDays) {
                    $newEnd = $task->start_date->copy()->addDays($minDays);
                    if ($projectEnd && $newEnd->greaterThan($projectEnd)) {
                        $newEnd = $projectEnd->copy();
                        if ($newEnd->lte($task->start_date)) {
                            $newEnd = $task->start_date->copy()->addDay();
                        }
                    }
                    $oldEnd = $task->end_date;
                    $task->update(['end_date' => $newEnd]);
                    $changed = true;
                    $timeline_changes[] = [
                        'task_id' => $task->id,
                        'task_title' => $task->title,
                        'change_type' => 'duration_normalized',
                        'old_end_date' => $oldEnd?->format('Y-m-d'),
                        'new_end_date' => $newEnd->format('Y-m-d'),
                    ];
                }
            }

            if ($changed) {
                $updated++;
            }
        }

        return [
            'success' => true,
            'message' => "Timeline optimized: {$updated} tasks updated",
            'tasks_updated' => $updated,
            'timeline_changes' => $timeline_changes,
        ];
    }

    /**
     * Break down large tasks into smaller subtasks
     */
    private function breakDownLargeTasks(Project $project): array
    {
        $tasks = $project->tasks()
            ->where('status', '!=', 'done')
            ->whereNull('parent_id') // Only parent tasks
            ->doesntHave('children') // Skip tasks already broken down
            ->get();

        $broken_down = 0;
        $subtasks_created = 0;
        $tasks_broken_down = [];

        foreach ($tasks as $task) {
            // Consider a task "large" if description is very long (>500 chars)
            $is_large = strlen($task->description ?? '') > 500;

            if (!$is_large) {
                continue;
            }

            // Create subtasks based on task type/context
            $subtasks = $this->generateSubtasks($task);

            foreach ($subtasks as $subtask_data) {
                try {
                    $subtask = Task::create([
                        'title' => $subtask_data['title'],
                        'description' => $subtask_data['description'],
                        'project_id' => $project->id,
                        'creator_id' => $project->user_id,
                        'parent_id' => $task->id, // This is a subtask of the parent task
                        'status' => 'todo',
                        'priority' => $task->priority,
                        'assignee_id' => $task->assignee_id,
                        // Removed estimated_hours since it may not exist in all schemas
                    ]);
                    $subtasks_created++;
                    $tasks_broken_down[] = [
                        'task_id' => $task->id,
                        'task_title' => $task->title,
                        'subtask_id' => $subtask->id,
                        'subtask_title' => $subtask->title,
                    ];
                } catch (Exception $e) {
                    Log::warning('Failed to create subtask', [
                        'task_id' => $task->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            if (count($subtasks) > 0) {
                // Add comment to parent task
                try {
                    $task->comments()->create([
                        'user_id' => $project->user_id,
                        'content' => "🤖 **AI Autopilot**: This task has been broken down into " . count($subtasks) . " subtasks for better manageability."
                    ]);
                } catch (Exception $e) {
                    Log::warning('Failed to create breakdown comment', [
                        'task_id' => $task->id,
                        'error' => $e->getMessage()
                    ]);
                }
                $broken_down++;
            }
        }

        return [
            'success' => true,
            'message' => "Broke down {$broken_down} large tasks into {$subtasks_created} subtasks",
            'tasks_affected' => $broken_down,
            'subtasks_created' => $subtasks_created,
            'tasks_broken_down' => $tasks_broken_down,
        ];
    }

    /**
     * Generate subtasks for a large task
     */
    private function generateSubtasks(Task $task): array
    {
        $subtasks = [];
        $title_lower = strtolower($task->title);

        // Pattern-based subtask generation
        if (str_contains($title_lower, 'develop') || str_contains($title_lower, 'build') || str_contains($title_lower, 'implement')) {
            $subtasks[] = [
                'title' => 'Design and Architecture for: ' . $task->title,
                'description' => 'Plan the architecture and design approach',
                'estimated_hours' => ceil(($task->estimated_hours ?? 10) * 0.2)
            ];
            $subtasks[] = [
                'title' => 'Implementation of: ' . $task->title,
                'description' => 'Core development work',
                'estimated_hours' => ceil(($task->estimated_hours ?? 10) * 0.5)
            ];
            $subtasks[] = [
                'title' => 'Testing for: ' . $task->title,
                'description' => 'Write and execute tests',
                'estimated_hours' => ceil(($task->estimated_hours ?? 10) * 0.2)
            ];
            $subtasks[] = [
                'title' => 'Documentation for: ' . $task->title,
                'description' => 'Document the implementation',
                'estimated_hours' => ceil(($task->estimated_hours ?? 10) * 0.1)
            ];
        } elseif (str_contains($title_lower, 'research') || str_contains($title_lower, 'analysis')) {
            $subtasks[] = [
                'title' => 'Data Collection: ' . $task->title,
                'description' => 'Gather relevant data and information',
                'estimated_hours' => ceil(($task->estimated_hours ?? 10) * 0.3)
            ];
            $subtasks[] = [
                'title' => 'Analysis: ' . $task->title,
                'description' => 'Analyze collected data',
                'estimated_hours' => ceil(($task->estimated_hours ?? 10) * 0.4)
            ];
            $subtasks[] = [
                'title' => 'Report: ' . $task->title,
                'description' => 'Create findings report',
                'estimated_hours' => ceil(($task->estimated_hours ?? 10) * 0.3)
            ];
        } else {
            // Generic breakdown
            $subtasks[] = [
                'title' => 'Planning: ' . $task->title,
                'description' => 'Plan the approach and requirements',
                'estimated_hours' => ceil(($task->estimated_hours ?? 10) * 0.25)
            ];
            $subtasks[] = [
                'title' => 'Execution: ' . $task->title,
                'description' => 'Execute the main work',
                'estimated_hours' => ceil(($task->estimated_hours ?? 10) * 0.5)
            ];
            $subtasks[] = [
                'title' => 'Review: ' . $task->title,
                'description' => 'Review and finalize',
                'estimated_hours' => ceil(($task->estimated_hours ?? 10) * 0.25)
            ];
        }

        return $subtasks;
    }

    /**
     * React to a newly created comment on a task while in standby mode.
     * Heuristics: recognizes "done/completed", "blocked", "delay/extend", and adjusts status/due dates accordingly,
     * then replies with a brief confirmation.
     */
    public function handleTaskComment(Project $project, Task $task, \App\Models\Comment $comment): void
    {
        $text = strtolower($comment->content ?? '');
        $changed = false;
        $notes = [];

        // If user says done/completed -> move to review (or done if no review workflow)
        if (preg_match('/\b(done|completed|finished)\b/', $text)) {
            if ($task->status !== 'review' && $task->status !== 'done') {
                $task->update(['status' => 'review']);
                $changed = true; $notes[] = 'moved to review';
            }
        }

        // If mentions blocked or blocker -> raise priority and optionally extend deadline
        if (preg_match('/\b(blocked|blocker|stuck|cannot|can\'t)\b/', $text)) {
            if ($task->priority !== 'high') {
                $task->update(['priority' => 'high']);
                $changed = true; $notes[] = 'priority set to high';
            }
            if ($task->end_date && $task->end_date->lte(now())) {
                $task->update(['end_date' => now()->addDays(2)]);
                $changed = true; $notes[] = 'deadline extended by 2 days';
            }
        }

        // If mentions delay/extend/more time -> extend deadline moderately
        if (preg_match('/\b(delay|extend|more\s+time|push|postpone)\b/', $text)) {
            if ($task->end_date) {
                $task->update(['end_date' => $task->end_date->copy()->addDays(2)]);
                $changed = true; $notes[] = 'deadline extended by 2 days';
            } else {
                $task->update(['end_date' => now()->addDays(3)]);
                $changed = true; $notes[] = 'deadline set in 3 days';
            }
        }

        if ($changed) {
            \App\Models\Comment::create([
                'task_id' => $task->id,
                'user_id' => $project->user_id,
                'content' => '🤖 AI Autopilot: Noted your update and ' . implode(', ', $notes) . '. If this needs further adjustment, reply here and I will adapt.',
            ]);
        }
    }
}
