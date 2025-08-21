<?php

// File: app/Services/ProjectAssistantTaskOps.php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\ProjectAssistantConstants as PA;
use Carbon\Carbon;
use Illuminate\Support\Str;
use Throwable;

/**
 * Task identification, search, and presentation operations.
 */
trait ProjectAssistantTaskOps
{
    private function isTaskIdentificationQuery(string $message): bool
    {
        foreach (PA::ENHANCED_ACTION_PATTERNS['find_task'] as $pattern) {
            if (preg_match($pattern, $message)) {
                return true;
            }
        }
        foreach (PA::TASK_ID_PATTERNS as $pattern) {
            if (preg_match($pattern, $message)) {
                return true;
            }
        }

        return false;
    }

    private function handleTaskIdentification(Project $project, string $message, array $history = []): array
    {
        $identifiedTasks = $this->identifyTasks($project, $message);

        if (empty($identifiedTasks)) {
            return $this->createResponse('information', 'No tasks found matching your criteria.', false);
        }

        if (count($identifiedTasks) === 1) {
            return $this->getDetailedTaskInfo($project, $identifiedTasks[0]);
        }

        return $this->getMultipleTasksInfo($project, $identifiedTasks, $message);
    }

    private function identifyTasks(Project $project, string $message): array
    {
        $tasks = [];
        $m = strtolower($message);

        if (preg_match(PA::TASK_ID_PATTERNS['by_id'], $message, $matches)) {
            $taskId = (int) $matches[1];
            $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();
            if ($task) {
                return [$task];
            }
        }

        if (preg_match(PA::TASK_ID_PATTERNS['by_assignee'], $message, $matches)) {
            $assigneeHint = trim($matches[1]);
            $assigneeId = $this->resolveAssigneeId($project, $assigneeHint);
            if ($assigneeId) {
                $tasks = Task::where('project_id', $project->id)
                    ->where('assignee_id', $assigneeId)
                    ->orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get();
                if ($tasks->isNotEmpty()) {
                    return $tasks->toArray();
                }
            }
        }

        if (preg_match(PA::TASK_ID_PATTERNS['by_creator'], $message, $matches)) {
            $creatorHint = trim($matches[1]);
            $creatorId = $this->resolveAssigneeId($project, $creatorHint);
            if ($creatorId) {
                $tasks = Task::where('project_id', $project->id)
                    ->where('creator_id', $creatorId)
                    ->orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get();
                if ($tasks->isNotEmpty()) {
                    return $tasks->toArray();
                }
            }
        }

        if (preg_match(PA::TASK_ID_PATTERNS['by_milestone'], $message, $matches)) {
            $milestoneHint = trim($matches[1]);
            $tasks = $this->findTasksByMilestone($project, $milestoneHint);
            if (! empty($tasks)) {
                return $tasks;
            }
        }

        if (preg_match(PA::TASK_ID_PATTERNS['by_status_combo'], $message, $matches)) {
            $statusHint = trim($matches[1]);
            $assigneeHint = trim($matches[2]);

            $status = $this->resolveStatusToken($project, $statusHint);
            $assigneeId = $this->resolveAssigneeId($project, $assigneeHint);

            if ($status && $assigneeId) {
                $tasks = Task::where('project_id', $project->id)
                    ->where('status', $status)
                    ->where('assignee_id', $assigneeId)
                    ->orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get();
                if ($tasks->isNotEmpty()) {
                    return $tasks->toArray();
                }
            }
        }

        $tasks = $this->findTasksByDateRange($project, $message);
        if (! empty($tasks)) {
            return $tasks;
        }

        $tasks = $this->findTasksByKeywords($project, $message);
        if (! empty($tasks)) {
            return $tasks;
        }

        return [];
    }

    private function findTasksByMilestone(Project $project, string $milestoneHint): array
    {
        try {
            if (method_exists(Task::class, 'milestone') && method_exists($project, 'milestones')) {
                $milestone = $project->milestones()->where('name', 'LIKE', "%{$milestoneHint}%")->first();
                if ($milestone) {
                    return Task::where('project_id', $project->id)
                        ->where('milestone_id', $milestone->id)
                        ->orderBy('created_at', 'desc')
                        ->limit(10)
                        ->get()
                        ->toArray();
                }
            }
        } catch (Throwable $e) {
        }

        return [];
    }

    private function findTasksByDateRange(Project $project, string $message): array
    {
        $m = strtolower($message);

        if (preg_match('/\btasks?\s+(?:created|from)\s+(today|yesterday|this\s+week|last\s+week)\b/i', $m, $matches)) {
            $period = strtolower(str_replace(' ', '_', $matches[1]));
            $dateRange = $this->getDateRange($period);
            if ($dateRange) {
                return Task::where('project_id', $project->id)
                    ->whereBetween('created_at', $dateRange)
                    ->orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get()
                    ->toArray();
            }
        }

        if (preg_match('/\btasks?\s+due\s+(today|tomorrow|this\s+week|next\s+week)\b/i', $m, $matches)) {
            $period = strtolower(str_replace(' ', '_', $matches[1]));
            $dateRange = $this->getDateRange($period, 'end_date');
            if ($dateRange) {
                return Task::where('project_id', $project->id)
                    ->whereNotNull('end_date')
                    ->whereBetween('end_date', $dateRange)
                    ->orderBy('end_date')
                    ->limit(10)
                    ->get()
                    ->toArray();
            }
        }

        return [];
    }

    private function findTasksByKeywords(Project $project, string $message): array
    {
        $keywords = [];

        if (preg_match_all('/["\']([^"\']+)["\']/', $message, $matches)) {
            $keywords = array_merge($keywords, $matches[1]);
        }

        $commonWords = ['task', 'tasks', 'find', 'show', 'get', 'with', 'from', 'that', 'have', 'contains'];
        $words = preg_split('/\s+/', strtolower($message));
        foreach ($words as $word) {
            if (strlen($word) > 3 && ! in_array($word, $commonWords, true) && ! preg_match('/^\d+$/', $word)) {
                $keywords[] = $word;
            }
        }

        $keywords = array_values(array_unique(array_filter(array_map('trim', $keywords), fn ($w) => $w !== '')));
        if (empty($keywords)) {
            return [];
        }

        $query = Task::where('project_id', $project->id);
        $query->where(function ($q) use ($keywords) {
            foreach ($keywords as $keyword) {
                $q->orWhere('title', 'LIKE', "%{$keyword}%")
                    ->orWhere('description', 'LIKE', "%{$keyword}%");
            }
        });

        return $query->orderBy('created_at', 'desc')->limit(10)->get()->toArray();
    }

    private function getDateRange(string $period, string $field = 'created_at'): ?array
    {
        $now = Carbon::now();
        switch ($period) {
            case 'today':      return [$now->copy()->startOfDay(), $now->copy()->endOfDay()];
            case 'yesterday':  return [$now->copy()->subDay()->startOfDay(), $now->copy()->subDay()->endOfDay()];
            case 'tomorrow':   return [$now->copy()->addDay()->startOfDay(), $now->copy()->addDay()->endOfDay()];
            case 'this_week':  return [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()];
            case 'last_week':  return [$now->copy()->subWeek()->startOfWeek(), $now->copy()->subWeek()->endOfWeek()];
            case 'next_week':  return [$now->copy()->addWeek()->startOfWeek(), $now->copy()->addWeek()->endOfWeek()];
            default: return null;
        }
    }

    private function getDetailedTaskInfo(Project $project, $task): array
    {
        $task = (object) $task;
        $method = $this->currentMethodology($project);

        $assignee = 'Unassigned';
        if (! empty($task->assignee_id)) {
            $user = User::find($task->assignee_id);
            $assignee = $user ? $user->name : "User #{$task->assignee_id}";
        }

        $creator = 'Unknown';
        if (! empty($task->creator_id)) {
            $user = User::find($task->creator_id);
            $creator = $user ? $user->name : "User #{$task->creator_id}";
        }

        $phase = $this->prettyPhase($method, (string) ($task->status ?? 'todo'));
        $due = ! empty($task->end_date) ? Carbon::parse($task->end_date)->format('M d, Y') : 'No due date';
        $created = ! empty($task->created_at) ? Carbon::parse($task->created_at)->format('M d, Y') : 'Unknown';
        $priority = isset($task->priority) ? ucfirst((string) $task->priority) : 'Medium';

        $message = "📋 **Task #{$task->id}: {$task->title}**\n\n";
        $message .= "• **Status:** {$phase}\n";
        $message .= "• **Priority:** {$priority}\n";
        $message .= "• **Assigned to:** {$assignee}\n";
        $message .= "• **Created by:** {$creator}\n";
        $message .= "• **Created:** {$created}\n";
        $message .= "• **Due:** {$due}\n";

        if (! empty($task->description)) {
            $message .= '• **Description:** '.Str::limit((string) $task->description, 200)."\n";
        }

        if (! empty($task->end_date)) {
            try {
                if (Carbon::parse($task->end_date)->isPast() && ($task->status ?? '') !== 'done') {
                    $daysOverdue = Carbon::parse($task->end_date)->diffInDays(Carbon::now());
                    $message .= "\n⚠️ **{$daysOverdue} days overdue**";
                }
            } catch (Throwable $e) {
            }
        }

        return $this->createResponse('information', $message, false);
    }

    private function getMultipleTasksInfo(Project $project, array $tasks, string $originalMessage): array
    {
        $count = count($tasks);
        $displayed = array_slice($tasks, 0, 10);

        $message = "🔍 Found {$count} task(s):\n\n";
        foreach ($displayed as $item) {
            $task = (object) $item;
            $assignee = 'Unassigned';
            if (! empty($task->assignee_id)) {
                $user = User::find($task->assignee_id);
                $assignee = $user ? $user->name : "User #{$task->assignee_id}";
            }
            $phase = $this->prettyPhase($this->currentMethodology($project), (string) ($task->status ?? 'todo'));
            $due = ! empty($task->end_date) ? Carbon::parse($task->end_date)->format('M d') : 'No due';

            $message .= "• **#{$task->id}**: {$task->title}\n";
            $message .= "  Status: {$phase} | Assignee: {$assignee} | Due: {$due}\n\n";
        }

        if ($count > 10) {
            $message .= '... and '.($count - 10)." more tasks\n";
        }

        $message .= "\n💡 *Use \"show task #ID\" for detailed information*";

        return $this->createResponse('information', $message, false);
    }
}
