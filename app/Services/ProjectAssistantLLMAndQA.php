<?php

// File: app/Services/ProjectAssistantLLMAndQA.php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\ProjectAssistantConstants as PA;
use Carbon\Carbon;
use Throwable;

trait ProjectAssistantLLMAndQA
{
    private function buildEnhancedSnapshot(Project $project): array
    {
        $project->loadMissing(['tasks']);

        $byStatus = ['todo' => 0, 'inprogress' => 0, 'review' => 0, 'done' => 0];
        $byPriority = ['low' => 0, 'medium' => 0, 'high' => 0, 'urgent' => 0];
        $overdue = 0;
        $taskDetails = [];

        foreach ($project->tasks as $task) {
            $status = in_array($task->status, PA::SERVER_STATUSES, true) ? $task->status : 'todo';
            $priority = in_array($task->priority, PA::PRIORITIES, true) ? $task->priority : 'medium';
            $byStatus[$status]++;
            $byPriority[$priority]++;

            if (! empty($task->end_date) && $status !== 'done') {
                try {
                    if (Carbon::parse($task->end_date)->isPast()) {
                        $overdue++;
                    }
                } catch (Throwable $e) {
                }
            }

            $assignee = null;
            if ($task->assignee_id) {
                $u = User::find($task->assignee_id);
                $assignee = $u ? ['id' => $u->id, 'name' => $u->name, 'email' => $u->email] : null;
            }
            $creator = null;
            if ($task->creator_id) {
                $u = User::find($task->creator_id);
                $creator = $u ? ['id' => $u->id, 'name' => $u->name] : null;
            }

            $taskDetails[] = [
                'id' => $task->id,
                'title' => $task->title,
                'status' => $status,
                'priority' => $priority,
                'assignee' => $assignee,
                'creator' => $creator,
                'created_at' => $task->created_at ? $task->created_at->toDateString() : null,
                'end_date' => $task->end_date,
                'is_overdue' => ! empty($task->end_date) && $status !== 'done' && (function ($d) {
                    try {
                        return Carbon::parse($d)->isPast();
                    } catch (Throwable $e) {
                        return false;
                    }
                })($task->end_date),
            ];
        }

        return [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'start_date' => $project->start_date,
                'end_date' => $project->end_date,
                'created_at' => $project->created_at ? $project->created_at->toDateString() : null,
                'methodology' => $this->currentMethodology($project),
            ],
            'tasks' => [
                'total' => array_sum($byStatus),
                'by_status' => $byStatus,
                'by_priority' => $byPriority,
                'overdue' => $overdue,
                'details' => array_slice($taskDetails, 0, 20),
            ],
        ];
    }

    private function buildSnapshot(Project $project): array
    {
        return $this->buildEnhancedSnapshot($project);
    }

    private function questionAnswerWithOpenAI(Project $project, string $original, array $history = [], ?string $rephrased = null): ?string
    {
        $apiKey = (string) env('OPENAI_API_KEY', '');
        if ($apiKey === '') {
            return null;
        }

        $snapshot = $this->buildEnhancedSnapshot($project);
        $owner = $this->projectOwner($project);
        $members = $this->projectMembers($project);
        $method = $this->currentMethodology($project);
        $labels = $this->serverToMethodPhase($method);

        $context = [
            'project' => $snapshot['project'],
            'team' => [
                'owner' => $owner ? ['name' => $owner->name, 'email' => $owner->email] : null,
                'members_count' => $members->count(),
                'members' => $members->map(fn ($u) => ['name' => $u->name, 'email' => $u->email])->values()->all(),
            ],
            'methodology' => ['type' => $method, 'labels' => $labels],
            'tasks' => $snapshot['tasks'],
        ];

        $system = <<<'SYS'
You are a knowledgeable project assistant with access to comprehensive project data. Answer questions using ONLY the provided context.

Context includes:
- Project details (name, dates, description, methodology)
- Team information (owner, members)
- Task data (titles, statuses, assignees, creators, dates, priorities)

Be specific, list task IDs where relevant, and be precise with dates. If missing data, say so.
SYS;

        $msgs = [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => "CONTEXT:\n".json_encode($context, JSON_PRETTY_PRINT)],
            ['role' => 'user', 'content' => 'QUESTION: '.($rephrased ?: $original)],
        ];

        try {
            // Prefer assistant-capable model for richer reasoning if configured
            if (method_exists($this, 'openAiChatText')) {
                $text = $this->openAiChatText($msgs, 0.2, true);
            } else {
                $text = $this->openAiChatText($msgs, 0.2); // fallback
            }
            if (! is_string($text) || trim($text) === '') {
                return null;
            }

            return $this->sanitizeAnswer($text);
        } catch (Throwable $e) {
            return null;
        }
    }

    private function sanitizeAnswer(string $text): string
    {
        $t = trim($text);
        $t = preg_replace('/```[\s\S]*?```/m', '', $t);
        $t = preg_replace('/\s+/', ' ', $t);
        if (mb_strlen($t) > 800) {
            $t = mb_substr($t, 0, 800).'…';
        }

        return trim($t);
    }

    private function answerQuestionEnhanced(Project $project, string $message): ?array
    {
        $m = strtolower(trim($message));
        $method = $this->currentMethodology($project);

        if (preg_match('/\bproject\s+(?:overview|summary|info|details)\b/i', $m)) {
            return $this->getEnhancedProjectOverview($project);
        }

        if (preg_match('/\bhow\s+many\s+tasks?\b/i', $m)) {
            return $this->handleEnhancedCountingQuery($project, $message, $method);
        }

        if (preg_match('/\b(?:who|which)\s+(?:team\s+)?members?\b/i', $m) || preg_match('/\bteam\s+(?:members?|size)\b/i', $m)) {
            return $this->getTeamMembersInfo($project);
        }

        if (preg_match('/\bwho\s+(?:is\s+)?(?:assigned\s+to|working\s+on)\s+(?:task\s+)?#?(\d+)\b/i', $m, $matches)) {
            $taskId = (int) $matches[1];

            return $this->getTaskAssignmentInfo($project, $taskId);
        }

        if (preg_match('/\bwho\s+created\s+(?:task\s+)?#?(\d+)\b/i', $m, $matches)) {
            $taskId = (int) $matches[1];

            return $this->getTaskCreatorInfo($project, $taskId);
        }

        if (preg_match('/\btasks?\s+(?:due|overdue|created)\b/i', $m)) {
            return $this->handleEnhancedDateQuery($project, $message);
        }

        if (preg_match('/\bmilestone\b/i', $m)) {
            return $this->handleMilestoneQuery($project, $message);
        }

        if (preg_match('/\bwho\b.*\b(owner|owns|created|manages?)\b/i', $m)) {
            return $this->getProjectOwnerInfo($project);
        }

        return null;
    }

    private function handleEnhancedCountingQuery(Project $project, string $message, string $method): array
    {
        $m = strtolower($message);

        if (preg_match('/\bhow\s+many\s+tasks?\s+(?:are\s+)?(?:assigned\s+to|for)\s+([a-z0-9._@\-\s]+)\b/i', $message, $matches)) {
            $assigneeHint = trim($matches[1]);
            $assigneeId = $this->resolveAssigneeId($project, $assigneeHint);
            if ($assigneeId) {
                $count = Task::where('project_id', $project->id)->where('assignee_id', $assigneeId)->count();
                $user = User::find($assigneeId);
                $name = $user ? $user->name : $assigneeHint;

                return $this->createResponse('information', 'There '.($count === 1 ? 'is' : 'are')." {$count} task".($count === 1 ? '' : 's')." assigned to {$name}.", false);
            }
        }

        if (preg_match('/\bhow\s+many\s+tasks?\s+(?:were\s+)?(?:created\s+by|from)\s+([a-z0-9._@\-\s]+)\b/i', $message, $matches)) {
            $creatorHint = trim($matches[1]);
            $creatorId = $this->resolveAssigneeId($project, $creatorHint);
            if ($creatorId) {
                $count = Task::where('project_id', $project->id)->where('creator_id', $creatorId)->count();
                $user = User::find($creatorId);
                $name = $user ? $user->name : $creatorHint;

                return $this->createResponse('information', 'There '.($count === 1 ? 'is' : 'are')." {$count} task".($count === 1 ? '' : 's')." created by {$name}.", false);
            }
        }

        if (preg_match('/\b(todo|in\s?progress|review|done)\b/i', $m, $sm)) {
            $status = $this->resolveStatusToken($project, $sm[1]);
            if ($status) {
                $count = Task::where('project_id', $project->id)->where('status', $status)->count();
                $phase = $this->prettyPhase($method, $status);

                return $this->createResponse('information', 'There '.($count === 1 ? 'is' : 'are')." {$count} task".($count === 1 ? '' : 's')." in {$phase}.", false);
            }
        }

        if (strpos($m, 'overdue') !== false) {
            $count = $this->countOverdue($project);

            return $this->createResponse('information', 'There '.($count === 1 ? 'is' : 'are')." {$count} overdue task".($count === 1 ? '' : 's').'.', false);
        }

        if (preg_match('/\b(low|medium|high|urgent)\b/i', $m, $matches)) {
            $priority = $this->resolvePriorityToken($matches[1]);
            if ($priority) {
                $count = Task::where('project_id', $project->id)->where('priority', $priority)->count();

                return $this->createResponse('information', 'There '.($count === 1 ? 'is' : 'are')." {$count} {$priority} priority task".($count === 1 ? '' : 's').'.', false);
            }
        }

        $count = Task::where('project_id', $project->id)->count();

        return $this->createResponse('information', "Total tasks in project: {$count}", false);
    }

    private function getTaskAssignmentInfo(Project $project, int $taskId): array
    {
        $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();
        if (! $task) {
            return $this->createResponse('information', "Task #{$taskId} not found in this project.", false);
        }
        if (! $task->assignee_id) {
            return $this->createResponse('information', "Task #{$taskId} \"{$task->title}\" is currently unassigned.", false);
        }
        $assignee = User::find($task->assignee_id);
        $name = $assignee ? $assignee->name : "User #{$task->assignee_id}";
        $email = $assignee && $assignee->email ? " ({$assignee->email})" : '';

        return $this->createResponse('information', "Task #{$taskId} \"{$task->title}\" is assigned to {$name}{$email}.", false);
    }

    private function getTaskCreatorInfo(Project $project, int $taskId): array
    {
        $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();
        if (! $task) {
            return $this->createResponse('information', "Task #{$taskId} not found in this project.", false);
        }
        if (! $task->creator_id) {
            return $this->createResponse('information', "Task #{$taskId} \"{$task->title}\" has no recorded creator.", false);
        }
        $creator = User::find($task->creator_id);
        $name = $creator ? $creator->name : "User #{$task->creator_id}";
        $created = $task->created_at ? $task->created_at->format('M d, Y') : 'unknown date';

        return $this->createResponse('information', "Task #{$taskId} \"{$task->title}\" was created by {$name} on {$created}.", false);
    }

    private function handleEnhancedDateQuery(Project $project, string $message): array
    {
        $m = strtolower($message);

        if (preg_match('/\btasks?\s+due\s+(today|tomorrow|this\s+week|next\s+week)\b/i', $m, $matches)) {
            $period = strtolower(str_replace(' ', '_', $matches[1]));

            return $this->getTasksByDuePeriod($project, $period);
        }

        if (preg_match('/\btasks?\s+created\s+(today|yesterday|this\s+week|last\s+week)\b/i', $m, $matches)) {
            $period = strtolower(str_replace(' ', '_', $matches[1]));

            return $this->getTasksByCreatedPeriod($project, $period);
        }

        if (strpos($m, 'overdue') !== false) {
            return $this->getOverdueTasks($project);
        }

        return $this->createResponse('information', 'Please specify a time period (today, tomorrow, this week, etc.).', false);
    }

    private function getTasksByDuePeriod(Project $project, string $period): array
    {
        $dateRange = $this->getDateRange($period);
        if (! $dateRange) {
            return $this->createResponse('information', 'Invalid time period specified.', false);
        }

        $tasks = Task::where('project_id', $project->id)
            ->whereNotNull('end_date')
            ->whereBetween('end_date', [$dateRange[0]->toDateString(), $dateRange[1]->toDateString()])
            ->orderBy('end_date')->get(['id', 'title', 'end_date', 'status', 'assignee_id']);

        $count = $tasks->count();
        $periodLabel = str_replace('_', ' ', $period);

        if ($count === 0) {
            return $this->createResponse('information', "No tasks due {$periodLabel}.", false);
        }

        $message = "{$count} task".($count === 1 ? '' : 's')." due {$periodLabel}:\n\n";
        foreach ($tasks->take(10) as $task) {
            $assignee = 'Unassigned';
            if ($task->assignee_id) {
                $user = User::find($task->assignee_id);
                $assignee = $user ? $user->name : "User #{$task->assignee_id}";
            }
            $due = Carbon::parse($task->end_date)->format('M d');
            $status = $this->prettyPhase($this->currentMethodology($project), $task->status);
            $message .= "• **#{$task->id}**: {$task->title}\n";
            $message .= "  Due: {$due} | Status: {$status} | Assignee: {$assignee}\n\n";
        }
        if ($count > 10) {
            $message .= '... and '.($count - 10).' more tasks';
        }

        return $this->createResponse('information', $message, false);
    }

    private function getTasksByCreatedPeriod(Project $project, string $period): array
    {
        $dateRange = $this->getDateRange($period);
        if (! $dateRange) {
            return $this->createResponse('information', 'Invalid time period specified.', false);
        }

        $tasks = Task::where('project_id', $project->id)
            ->whereBetween('created_at', [$dateRange[0], $dateRange[1]])
            ->orderBy('created_at', 'desc')
            ->get(['id', 'title', 'created_at', 'creator_id']);

        $count = $tasks->count();
        $periodLabel = str_replace('_', ' ', $period);

        if ($count === 0) {
            return $this->createResponse('information', "No tasks created {$periodLabel}.", false);
        }

        $message = "{$count} task".($count === 1 ? '' : 's')." created {$periodLabel}:\n\n";
        foreach ($tasks->take(10) as $task) {
            $creator = 'Unknown';
            if ($task->creator_id) {
                $user = User::find($task->creator_id);
                $creator = $user ? $user->name : "User #{$task->creator_id}";
            }
            $created = $task->created_at->format('M d, H:i');
            $message .= "• **#{$task->id}**: {$task->title}\n";
            $message .= "  Created: {$created} by {$creator}\n\n";
        }
        if ($count > 10) {
            $message .= '... and '.($count - 10).' more tasks';
        }

        return $this->createResponse('information', $message, false);
    }

    private function getOverdueTasks(Project $project): array
    {
        $tasks = Task::where('project_id', $project->id)
            ->whereNotNull('end_date')
            ->whereDate('end_date', '<', Carbon::now()->toDateString())
            ->whereIn('status', ['todo', 'inprogress', 'review'])
            ->orderBy('end_date')
            ->get(['id', 'title', 'end_date', 'status', 'assignee_id']);

        $count = $tasks->count();
        if ($count === 0) {
            return $this->createResponse('information', 'No overdue tasks found.', false);
        }

        $message = "⚠️ {$count} overdue task".($count === 1 ? '' : 's').":\n\n";
        foreach ($tasks->take(10) as $task) {
            $assignee = 'Unassigned';
            if ($task->assignee_id) {
                $user = User::find($task->assignee_id);
                $assignee = $user ? $user->name : "User #{$task->assignee_id}";
            }
            $daysOverdue = Carbon::parse($task->end_date)->diffInDays(Carbon::now());
            $status = $this->prettyPhase($this->currentMethodology($project), $task->status);
            $message .= "• **#{$task->id}**: {$task->title}\n";
            $message .= "  {$daysOverdue} days overdue | Status: {$status} | Assignee: {$assignee}\n\n";
        }
        if ($count > 10) {
            $message .= '... and '.($count - 10).' more tasks';
        }

        return $this->createResponse('information', $message, false);
    }

    private function handleMilestoneQuery(Project $project, string $message): array
    {
        try {
            if (method_exists($project, 'milestones')) {
                $milestones = $project->milestones()->get();
                if ($milestones->isEmpty()) {
                    return $this->createResponse('information', 'No milestones found in this project.', false);
                }

                $message = "📍 Project Milestones:\n\n";
                foreach ($milestones as $milestone) {
                    $taskCount = Task::where('project_id', $project->id)->where('milestone_id', $milestone->id)->count();
                    $due = $milestone->due_date ? Carbon::parse($milestone->due_date)->format('M d, Y') : 'No due date';
                    $message .= "• **{$milestone->name}**\n";
                    $message .= "  Tasks: {$taskCount} | Due: {$due}\n\n";
                }

                return $this->createResponse('information', $message, false);
            }
        } catch (Throwable $e) {
        }

        return $this->createResponse('information', 'Milestone feature is not available in this project.', false);
    }

    private function getProjectOwnerInfo(Project $project): array
    {
        $owner = $this->projectOwner($project);
        $name = $owner ? $owner->name : 'Unknown';
        $email = $owner ? $owner->email : '';

        return $this->createResponse('information', "Project owner: {$name}".($email ? " ({$email})" : ''), false);
    }

    private function getTeamMembersInfo(Project $project): array
    {
        $members = $this->projectMembers($project);
        if ($members->isEmpty()) {
            return $this->createResponse('information', 'This project has no listed members.', false);
        }
        $lines = $members->map(fn ($u) => "• {$u->name}".($u->email ? " ({$u->email})" : ''))->implode("\n");

        return $this->createResponse('information', "👥 Team Members:\n\n{$lines}", false);
    }

    private function provideHelp(Project $project): array
    {
        $labels = $this->labelsFor($project);

        $message = "🤖 **Project Assistant Help**\n\n";
        $message .= "**📋 Task Operations:**\n";
        $message .= "• Create task \"Fix login bug\"\n";
        $message .= "• Show task #42\n";
        $message .= "• Move #42 to {$labels['done']}\n";
        $message .= "• Assign #42 to Alex\n";
        $message .= "• Delete task #42\n";
        $message .= "• Find tasks assigned to Sarah\n";
        $message .= "• Find tasks created by John\n\n";
        $message .= "**📊 Project Questions:**\n";
        $message .= "• How many tasks are {$labels['done']}?\n";
        $message .= "• Who is the project owner?\n";
        $message .= "• Show project overview\n";
        $message .= "• Tasks due this week\n";
        $message .= "• Tasks created yesterday\n";
        $message .= "• Who created task #42?\n\n";
        if (method_exists($this, 'isProjectCreator') && $this->isProjectCreator($project)) {
            $message .= "**🏗️ Project Management:**\n";
            $message .= "• Set project name to \"New Name\"\n";
            $message .= "• Set project due date to Dec 31\n";
            $message .= "• Update project description\n\n";
        }
        $message .= "**💡 Tips:**\n";
        $message .= "• Use # followed by task ID (e.g., #42)\n";
        $message .= "• Reference team members by name or email\n";
        $message .= "• Use natural language for dates\n";
        $message .= '• Combine filters: "urgent tasks for Alice"';

        return $this->createResponse('information', $message, false);
    }

    private function provideSuggestions(Project $project, string $message): array
    {
        $m = strtolower($message);
        $suggestions = "I couldn't understand that command. ";

        // Recognize weekly progress style queries and route to Q&A for deterministic answer
        if (preg_match('/\b(weekly|week)\b.*\b(progress|report|summary)\b/', $m) || str_contains($m, 'weekly progress')) {
            if (class_exists(QuestionAnsweringService::class)) {
                try {
                    $qas = app(QuestionAnsweringService::class);
                    $ans = $qas->answer($project, 'Weekly progress report', [], null);

                    return $this->createResponse('information', $ans, false);
                } catch (\Throwable $e) {
                    // fall through to suggestions if something fails
                }
            }
        }

        if (strpos($m, 'task') !== false) {
            $suggestions .= "Try:\n• Create task \"Your task title\"\n• Show task #123\n• Find tasks assigned to John";
        } elseif (strpos($m, 'project') !== false) {
            $suggestions .= "Try:\n• Project overview\n• Set project name to \"New Name\"\n• Project due date";
        } elseif (strpos($m, 'who') !== false || strpos($m, 'team') !== false) {
            $suggestions .= "Try:\n• Who are the team members?\n• Who created task #123?\n• Who is assigned to task #456?";
        } else {
            $suggestions .= "Try commands like:\n• Create task \"Task title\"\n• Show task #123\n• Project overview\n• Tasks due this week\n• Weekly progress report";
        }

        return $this->createResponse('information', $suggestions, false);
    }

    private function countOverdue(Project $project): int
    {
        $count = 0;
        $q = Task::where('project_id', $project->id)->whereIn('status', ['todo', 'inprogress', 'review'])->whereNotNull('end_date');
        foreach ($q->get() as $t) {
            try {
                if (Carbon::parse($t->end_date)->isPast()) {
                    $count++;
                }
            } catch (\Throwable $e) {
            }
        }

        return $count;
    }
}
