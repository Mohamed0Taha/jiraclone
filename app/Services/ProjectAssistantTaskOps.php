<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Str;
use Throwable;

use App\Services\ProjectAssistantConstants as PA;

/**
 * Task identification & search operations extracted for clarity.
 *
 * This trait assumes the consuming class (e.g., ProjectAssistantService)
 * implements the following helper methods:
 * - resolveAssigneeId(Project $project, string $hint): ?int
 * - resolveStatusToken(Project $project, string $token): ?string
 * - currentMethodology(Project $project): string
 * - prettyPhase(string $method, string $serverStatus): string
 * - createResponse(string $type, string $message, bool $requiresConfirmation, array $data = []): array
 */
trait ProjectAssistantTaskOps
{
    /**
     * Determine if the message looks like a task-identification query.
     */
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

    /**
     * Identify tasks from a natural-language message using multiple strategies.
     */
    private function identifyTasks(Project $project, string $message): array
    {
        $tasks = [];
        $m = strtolower($message);

        // 1) By ID
        if (preg_match(PA::TASK_ID_PATTERNS['by_id'], $message, $matches)) {
            $taskId = (int) $matches[1];
            $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();
            if ($task) {
                return [$task];
            }
        }

        // 2) By assignee
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

        // 3) By creator
        if (preg_match(PA::TASK_ID_PATTERNS['by_creator'], $message, $matches)) {
            $creatorHint = trim($matches[1]);
            $creatorId = $this->resolveAssigneeId($project, $creatorHint); // reuse
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

        // 4) By milestone
        if (preg_match(PA::TASK_ID_PATTERNS['by_milestone'], $message, $matches)) {
            $milestoneHint = trim($matches[1]);
            $tasks = $this->findTasksByMilestone($project, $milestoneHint);
            if (!empty($tasks)) {
                return $tasks;
            }
        }

        // 5) Status + Assignee combo
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

        // 6) By date ranges
        $tasks = $this->findTasksByDateRange($project, $message);
        if (!empty($tasks)) {
            return $tasks;
        }

        // 7) By title/description keywords
        $tasks = $this->findTasksByKeywords($project, $message);
        if (!empty($tasks)) {
            return $tasks;
        }

        return [];
    }

    /**
     * Find tasks by milestone (if milestone relation exists).
     */
    private function findTasksByMilestone(Project $project, string $milestoneHint): array
    {
        try {
            if (method_exists(Task::class, 'milestone') && method_exists($project, 'milestones')) {
                $milestone = $project->milestones()
                    ->where('name', 'LIKE', '%' . $milestoneHint . '%')
                    ->first();

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
            // Milestones not available or other error; fall through
        }

        return [];
    }

    /**
     * Find tasks based on natural-language date expressions.
     */
    private function findTasksByDateRange(Project $project, string $message): array
    {
        $m = strtolower($message);

        // Created in relative period
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

        // Due in relative period
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

    /**
     * Find tasks by quoted strings or significant keywords in title/description.
     */
    private function findTasksByKeywords(Project $project, string $message): array
    {
        $keywords = [];

        // quoted strings
        if (preg_match_all('/["\']([^"\']+)["\']/', $message, $matches)) {
            $keywords = array_merge($keywords, $matches[1]);
        }

        // significant words
        $commonWords = ['task', 'tasks', 'find', 'show', 'get', 'with', 'from', 'that', 'have', 'contains'];
        $words = preg_split('/\s+/', strtolower($message));
        foreach ($words as $word) {
            if (strlen($word) > 3 && !in_array($word, $commonWords, true) && !preg_match('/^\d+$/', $word)) {
                $keywords[] = $word;
            }
        }

        $keywords = array_values(array_unique(array_filter(array_map('trim', $keywords), static fn ($w) => $w !== '')));
        if (empty($keywords)) {
            return [];
        }

        $query = Task::where('project_id', $project->id);

        $query->where(function ($q) use ($keywords) {
            foreach ($keywords as $keyword) {
                $q->orWhere('title', 'LIKE', '%' . $keyword . '%')
                  ->orWhere('description', 'LIKE', '%' . $keyword . '%');
            }
        });

        return $query->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->toArray();
    }

    /**
     * Return a Carbon range [start, end] for a named period.
     */
    private function getDateRange(string $period, string $field = 'created_at'): ?array
    {
        $now = Carbon::now();

        switch ($period) {
            case 'today':
                return [$now->copy()->startOfDay(), $now->copy()->endOfDay()];
            case 'yesterday':
                return [$now->copy()->subDay()->startOfDay(), $now->copy()->subDay()->endOfDay()];
            case 'tomorrow':
                return [$now->copy()->addDay()->startOfDay(), $now->copy()->addDay()->endOfDay()];
            case 'this_week':
                return [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()];
            case 'last_week':
                return [$now->copy()->subWeek()->startOfWeek(), $now->copy()->subWeek()->endOfWeek()];
            case 'next_week':
                return [$now->copy()->addWeek()->startOfWeek(), $now->copy()->addWeek()->endOfWeek()];
            default:
                return null;
        }
    }
}
