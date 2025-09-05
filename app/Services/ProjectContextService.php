<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Throwable;

class ProjectContextService
{
    private const SERVER_STATUSES = ['todo', 'inprogress', 'review', 'done'];

    private const METH_KANBAN = 'kanban';

    private const METH_SCRUM = 'scrum';

    private const METH_AGILE = 'agile';

    private const METH_WATERFALL = 'waterfall';

    private const METH_LEAN = 'lean';

    /**
     * Unified cross–methodology status alias map.
     * Each canonical status (server value) maps to an array of phrases users might say.
     * These include methodology-specific phase names and common synonyms.
     */
    private const STATUS_ALIASES = [
        'todo' => [
            'todo','to do','backlog','product backlog','sprint backlog','icebox','ideas','idea backlog',
            'requirements','specification','specifications','analysis','planning','plan','pending','not started','open'
        ],
        'inprogress' => [
            'in progress','inprogress','doing','wip','work in progress','active','ongoing','started','progress',
            'design','implementation','construction','build','building','development','dev','executing','execution'
        ],
        'review' => [
            'review','code review','peer review','qa','quality assurance','testing','test','verification','validation',
            'test phase','staging','approval','awaiting review','awaiting approval','ready for review'
        ],
        'done' => [
            'done','complete','completed','finished','closed','resolved','shipped','deployed','released','maintenance',
            'live','accepted','closed out'
        ],
    ];

    /** Cached flattened alias lookup */
    private static array $aliasLookup = [];

    /**
     * Normalize a single user-provided status phrase to canonical server status.
     */
    public function normalizeStatusAlias(string $phrase, ?string $methodology = null): ?string
    {
        $p = strtolower(trim(preg_replace('/\s+/', ' ', str_replace(['_', '-'], ' ', $phrase))));
        if ($p === '') return null;

        // Build lookup once
        if (empty(self::$aliasLookup)) {
            foreach (self::STATUS_ALIASES as $canonical => $list) {
                foreach ($list as $alias) {
                    self::$aliasLookup[$alias] = $canonical;
                }
            }
        }

        if (isset(self::$aliasLookup[$p])) {
            return self::$aliasLookup[$p];
        }

        // Fallback to methodology specific mapping (existing logic)
        if ($methodology) {
            $methodMap = $this->methodPhaseToServer($methodology);
            if (isset($methodMap[$p])) {
                return $methodMap[$p];
            }
        } else {
            // Try each methodology map if none supplied
            foreach ([self::METH_KANBAN,self::METH_SCRUM,self::METH_AGILE,self::METH_WATERFALL,self::METH_LEAN] as $m) {
                $methodMap = $this->methodPhaseToServer($m);
                if (isset($methodMap[$p])) return $methodMap[$p];
            }
        }

        return null;
    }

    /**
     * Attempt to extract the first recognizable status alias from a free-form text string.
     */
    public function extractStatusFromText(string $text, ?string $methodology = null): ?string
    {
        $t = strtolower($text);
        // Check multi-word aliases first (sorted by length desc so longer phrases win)
        $multi = [];
        foreach (self::STATUS_ALIASES as $canonical => $aliases) {
            foreach ($aliases as $a) { if (str_contains($a, ' ')) { $multi[$a] = $canonical; } }
        }
        uksort($multi, fn($a,$b)=> strlen($b) <=> strlen($a));
        foreach ($multi as $alias => $canonical) {
            $pattern = '/\b'.preg_quote($alias,'/').'\b/';
            if (preg_match($pattern, $t)) return $canonical;
        }
        // Single word aliases
        $single = [];
        foreach (self::STATUS_ALIASES as $canonical => $aliases) {
            foreach ($aliases as $a) { if (!str_contains($a,' ')) { $single[$a] = $canonical; } }
        }
        foreach ($single as $alias => $canonical) {
            if (preg_match('/\b'.preg_quote($alias,'/').'\b/', $t)) return $canonical;
        }
        // Fallback to methodology map scanning
    $method = $methodology ?? $this->getCurrentMethodologyFromTextContext($text) ?? self::METH_KANBAN;
        $map = $this->methodPhaseToServer($method);
        foreach ($map as $phase => $canonical) {
            if (preg_match('/\b'.preg_quote($phase,'/').'\b/', $t)) return $canonical;
        }
        return null;
    }

    /** Basic heuristic to guess methodology mention inside text (very lightweight) */
    private function getCurrentMethodologyFromTextContext(string $text): ?string
    {
        $t = strtolower($text);
        foreach ([self::METH_SCRUM,self::METH_AGILE,self::METH_WATERFALL,self::METH_LEAN,self::METH_KANBAN] as $m) {
            if (str_contains($t, $m)) return $m;
        }
        return null;
    }

    public function getProjectOwner(Project $project): ?User
    {
        try {
            return $project->user ?? User::find($project->user_id);
        } catch (Throwable $e) {
            return User::find($project->user_id);
        }
    }

    public function getProjectMembers(Project $project)
    {
        try {
            if (method_exists($project, 'members')) {
                return $project->members()->get(['users.id', 'users.name', 'users.email']);
            }
        } catch (Throwable $e) {
        }

        return collect();
    }

    public function getCurrentUserId(Project $project): ?int
    {
        try {
            $id = Auth::id();
            if ($id) {
                return (int) $id;
            }
        } catch (Throwable $e) {
        }

        return $project->user_id ?? null;
    }

    public function buildSnapshot(Project $project): array
    {
        $project->loadMissing(['tasks']);
        $byStatus = ['todo' => 0, 'inprogress' => 0, 'review' => 0, 'done' => 0];
        $byPriority = ['low' => 0, 'medium' => 0, 'high' => 0, 'urgent' => 0];
        $totalEstimatedHours = 0;
        $completedEstimatedHours = 0;

        foreach ($project->tasks as $t) {
            $s = in_array($t->status, self::SERVER_STATUSES, true) ? $t->status : 'todo';
            $byStatus[$s] = ($byStatus[$s] ?? 0) + 1;

            $p = in_array($t->priority, Task::PRIORITIES, true) ? $t->priority : 'medium';
            $byPriority[$p] = ($byPriority[$p] ?? 0) + 1;

            // Track estimated hours if available
            if (isset($t->estimated_hours)) {
                $totalEstimatedHours += $t->estimated_hours;
                if ($t->status === 'done') {
                    $completedEstimatedHours += $t->estimated_hours;
                }
            }
        }

        return [
            'tasks' => [
                'total' => array_sum($byStatus),
                'by_status' => $byStatus,
                'by_priority' => $byPriority,
                'overdue' => $this->countOverdue($project),
                'milestones' => $project->tasks->where('milestone', true)->count(),
                'estimated_hours' => [
                    'total' => $totalEstimatedHours,
                    'completed' => $completedEstimatedHours,
                    'remaining' => $totalEstimatedHours - $completedEstimatedHours,
                ],
            ],
        ];
    }

    /**
     * Get complete sanitized context for LLM including all project and task data
     *
     * @param  array  $options  Options for context generation
     *                          - include_tasks: bool (default: true) - Include full task details
     *                          - include_comments: bool (default: false) - Include task comments
     *                          - task_limit: int|null (default: null) - Limit number of tasks
     *                          - task_filters: array (default: []) - Filters for tasks
     */
    public function getSanitizedContextForLLM(Project $project, array $options = []): array
    {
        // Default options
        $options = array_merge([
            'include_tasks' => true,
            'include_comments' => false,
            'task_limit' => null,
            'task_filters' => [],
        ], $options);

        // Load relationships
        $relationships = ['user', 'members'];
        if ($options['include_tasks']) {
            $relationships[] = 'tasks';
            $relationships[] = 'tasks.creator';
            $relationships[] = 'tasks.assignee';
            if ($options['include_comments']) {
                $relationships[] = 'tasks.comments';
                $relationships[] = 'tasks.comments.user';
            }
        }
        $project->loadMissing($relationships);

        $snapshot = $this->buildSnapshot($project);
        $owner = $this->getProjectOwner($project);
        $members = $this->getProjectMembers($project);
        $method = $this->getCurrentMethodology($project);
        $labels = $this->serverToMethodPhase($method);

        // Build base context
        $context = [
            'project' => [
                'id' => $project->id,
                'name' => (string) ($project->name ?? 'Untitled'),
                'key' => $project->key,
                'description' => $project->description,
                'methodology' => $method,
                'labels' => $labels,
                'dates' => [
                    'start_date' => $project->start_date ? $project->start_date->format('Y-m-d') : null,
                    'end_date' => $project->end_date ? $project->end_date->format('Y-m-d') : null,
                    'created_at' => $project->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $project->updated_at->format('Y-m-d H:i:s'),
                ],
                'meta' => $this->sanitizeMeta($project->meta),
                'owner' => $owner ? [
                    'id' => $owner->id,
                    'name' => $owner->name,
                    'email' => $owner->email,
                ] : null,
                'members_count' => $members->count(),
                'members' => $members->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->pivot->role ?? null,
                    'joined_at' => $u->pivot->joined_at ?? null,
                ])->values()->all(),
                'statistics' => $snapshot['tasks'],
                'progress' => $this->calculateProjectProgress($project),
            ],
        ];

        // Add detailed task information if requested
        if ($options['include_tasks']) {
            $context['tasks'] = $this->getTasksContext($project, $options);
        }

        // Add automation context if exists
        if ($project->automations && $project->automations->count() > 0) {
            $context['automations'] = [
                'count' => $project->automations->count(),
                'active' => $project->automations->where('active', true)->count(),
            ];
        }

        return $context;
    }

    /**
     * Get detailed task context for LLM
     */
    private function getTasksContext(Project $project, array $options): array
    {
        $query = $this->buildTaskQuery($project, $options['task_filters']);

        if ($options['task_limit']) {
            $query->limit($options['task_limit']);
        }

        $tasks = $query->get();

        return $tasks->map(function ($task) use ($options) {
            $taskData = [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status,
                'priority' => $task->priority,
                'milestone' => $task->milestone,
                'dates' => [
                    'start_date' => $task->start_date ? $task->start_date->format('Y-m-d') : null,
                    'end_date' => $task->end_date ? $task->end_date->format('Y-m-d') : null,
                    'created_at' => $task->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $task->updated_at->format('Y-m-d H:i:s'),
                ],
                'creator' => $task->creator ? [
                    'id' => $task->creator->id,
                    'name' => $task->creator->name,
                    'email' => $task->creator->email,
                ] : null,
                'assignee' => $task->assignee ? [
                    'id' => $task->assignee->id,
                    'name' => $task->assignee->name,
                    'email' => $task->assignee->email,
                ] : null,
                'is_overdue' => $this->isTaskOverdue($task),
                'days_until_due' => $this->getDaysUntilDue($task),
            ];

            // Add comments if requested
            if ($options['include_comments'] && $task->comments) {
                $taskData['comments'] = $task->comments->map(fn ($c) => [
                    'id' => $c->id,
                    'content' => $c->content,
                    'user' => $c->user ? [
                        'name' => $c->user->name,
                        'email' => $c->user->email,
                    ] : null,
                    'created_at' => $c->created_at->format('Y-m-d H:i:s'),
                ])->values()->all();
                $taskData['comments_count'] = count($taskData['comments']);
            }

            return $taskData;
        })->values()->all();
    }

    /**
     * Calculate overall project progress
     */
    private function calculateProjectProgress(Project $project): array
    {
        $totalTasks = $project->tasks->count();
        if ($totalTasks === 0) {
            return [
                'percentage' => 0,
                'status' => 'not_started',
                'health' => 'unknown',
            ];
        }

        $completedTasks = $project->tasks->where('status', 'done')->count();
        $percentage = round(($completedTasks / $totalTasks) * 100, 2);

        // Determine project health
        $overdueTasks = $this->countOverdue($project);
        $health = 'good';
        if ($overdueTasks > $totalTasks * 0.3) {
            $health = 'at_risk';
        } elseif ($overdueTasks > $totalTasks * 0.1) {
            $health = 'warning';
        }

        // Determine status
        $status = 'in_progress';
        if ($percentage === 0) {
            $status = 'not_started';
        } elseif ($percentage === 100) {
            $status = 'completed';
        } elseif ($percentage > 75) {
            $status = 'nearing_completion';
        }

        return [
            'percentage' => $percentage,
            'status' => $status,
            'health' => $health,
            'completed_tasks' => $completedTasks,
            'total_tasks' => $totalTasks,
        ];
    }

    /**
     * Check if a task is overdue
     */
    private function isTaskOverdue(Task $task): bool
    {
        if (! $task->end_date || in_array($task->status, ['done'])) {
            return false;
        }

        return $task->end_date->isPast();
    }

    /**
     * Get days until task is due
     */
    private function getDaysUntilDue(Task $task): ?int
    {
        if (! $task->end_date || $task->status === 'done') {
            return null;
        }

        return Carbon::now()->diffInDays($task->end_date, false);
    }

    /**
     * Sanitize meta data for LLM context
     */
    private function sanitizeMeta($meta): array
    {
        if (! is_array($meta)) {
            return [];
        }

        // Remove any sensitive keys if present
        $sensitiveKeys = ['api_keys', 'tokens', 'passwords', 'secrets'];
        foreach ($sensitiveKeys as $key) {
            unset($meta[$key]);
        }

        return $meta;
    }

    /**
     * Get comprehensive project summary for LLM
     */
    public function getProjectSummary(Project $project): string
    {
        $context = $this->getSanitizedContextForLLM($project, [
            'include_tasks' => true,
            'task_limit' => 10, // Limit to most recent/important tasks
        ]);

        $summary = "Project: {$context['project']['name']}\n";
        $summary .= "Methodology: {$context['project']['methodology']}\n";
        $summary .= "Progress: {$context['project']['progress']['percentage']}% complete\n";
        $summary .= "Health: {$context['project']['progress']['health']}\n";
        $summary .= "Tasks: {$context['project']['statistics']['total']} total, ";
        $summary .= "{$context['project']['statistics']['overdue']} overdue\n";
        $summary .= "Team: {$context['project']['members_count']} members\n";

        if (! empty($context['project']['description'])) {
            $summary .= "\nDescription: {$context['project']['description']}\n";
        }

        return $summary;
    }

    public function buildTaskQuery(Project $project, array $filters): Builder
    {
        $q = Task::where('project_id', $project->id);

        if (! empty($filters['ids']) && is_array($filters['ids'])) {
            $q->whereIn('id', array_map('intval', $filters['ids']));
        }
        if (! empty($filters['status'])) {
            $q->where('status', $filters['status']);
        }
        if (! empty($filters['priority'])) {
            $q->where('priority', $filters['priority']);
        }
        if (! empty($filters['overdue'])) {
            $q->whereNotNull('end_date')->whereIn('status', ['todo', 'inprogress', 'review'])->whereDate('end_date', '<', Carbon::now());
        }
        if (! empty($filters['unassigned'])) {
            $q->whereNull('assignee_id');
        }
        if (! empty($filters['assigned_to_hint'])) {
            $assigneeId = $this->resolveAssigneeId($project, $filters['assigned_to_hint']);
            $q->where('assignee_id', $assigneeId ?? -1);
        }

        $orderBy = $filters['order_by'] ?? 'id';
        $order = in_array(strtolower($filters['order'] ?? 'asc'), ['asc', 'desc']) ? ($filters['order'] ?? 'asc') : 'asc';
        $q->orderBy($orderBy, $order);

        if (! empty($filters['limit'])) {
            $q->limit(max(1, (int) $filters['limit']));
        }

        return $q;
    }

    public function countAffected(Project $project, array $filters): int
    {
        $query = $this->buildTaskQuery($project, $filters);

        return $query->count();
    }

    public function countOverdue(Project $project): int
    {
        return Task::where('project_id', $project->id)
            ->whereIn('status', ['todo', 'inprogress', 'review'])
            ->whereNotNull('end_date')
            ->whereDate('end_date', '<', Carbon::now())
            ->count();
    }

    public function resolveAssigneeId(Project $project, string $hint): ?int
    {
        $hint = trim(preg_replace("/'s$/u", '', ltrim($hint, '@')));
        if ($hint === '') {
            return null;
        }

        if (in_array(mb_strtolower($hint), ['me', 'myself', '__me__'], true)) {
            return $this->getCurrentUserId($project);
        }
        if (in_array(mb_strtolower($hint), ['owner', 'project owner', '__owner__'], true)) {
            return $this->getProjectOwner($project)?->id;
        }
        if (ctype_digit($hint)) {
            $user = User::find((int) $hint);

            return ($user && $this->userIsProjectMember($project, $user)) ? $user->id : null;
        }
        if (filter_var($hint, FILTER_VALIDATE_EMAIL)) {
            $user = User::where('email', $hint)->first();

            return ($user && $this->userIsProjectMember($project, $user)) ? $user->id : null;
        }
        $needle = mb_strtolower($hint);
        $tokens = array_values(array_filter(preg_split('/\s+/', $needle)));
        $candidates = $this->getProjectMembers($project)->push($this->getProjectOwner($project))->filter()->unique('id');

        // Exact full-name match
        $exact = $candidates->first(fn($u)=> mb_strtolower($u->name) === $needle);
        if ($exact) return (int)$exact->id;

        // Match if all tokens appear somewhere in candidate name (order agnostic)
        if (!empty($tokens)) {
            $multi = $candidates->first(function($u) use ($tokens) {
                $ln = mb_strtolower($u->name);
                foreach ($tokens as $t) {
                    if (!str_contains($ln, $t)) return false;
                }
                return true;
            });
            if ($multi) return (int)$multi->id;
        }

        // Partial contains fallback (single token or substring)
        $partial = $candidates->first(fn($u)=> str_contains(mb_strtolower($u->name), $needle));
        if ($partial) return (int)$partial->id;

        return null;
    }

    public function userIsProjectMember(Project $project, User $user): bool
    {
        if ((int) $project->user_id === (int) $user->id) {
            return true;
        }
        try {
            if (method_exists($project, 'members')) {
                return $project->members()->where('users.id', $user->id)->exists();
            }
        } catch (Throwable $e) {
        }

        return false;
    }

    public function getCurrentMethodology(Project $project): string
    {
        $meta = $project->meta ?? null;
        $m = is_array($meta) ? strtolower((string) ($meta['methodology'] ?? '')) : '';
        if (in_array($m, [self::METH_KANBAN, self::METH_SCRUM, self::METH_AGILE, self::METH_WATERFALL, self::METH_LEAN])) {
            return $m;
        }

        return self::METH_KANBAN;
    }

    public function serverToMethodPhase(string $method): array
    {
        switch ($method) {
            case self::METH_SCRUM: case self::METH_AGILE: return ['todo' => 'Backlog', 'inprogress' => 'In Progress', 'review' => 'Review', 'done' => 'Done'];
            case self::METH_WATERFALL: return ['todo' => 'Requirements', 'inprogress' => 'Design', 'review' => 'Verification', 'done' => 'Maintenance'];
            case self::METH_LEAN: return ['todo' => 'Backlog', 'inprogress' => 'In Progress', 'review' => 'Testing', 'done' => 'Done'];
            default: return ['todo' => 'To Do', 'inprogress' => 'In Progress', 'review' => 'Review', 'done' => 'Done'];
        }
    }

    public function methodPhaseToServer(string $method): array
    {
        switch ($method) {
            case self::METH_WATERFALL:
                return [
                    'requirements' => 'todo', 'specification' => 'todo', 'analysis' => 'todo',
                    'design' => 'inprogress', 'implementation' => 'inprogress', 'construction' => 'inprogress',
                    'verification' => 'review', 'validation' => 'review', 'testing phase' => 'review',
                    'maintenance' => 'done', 'done' => 'done', 'complete' => 'done',
                ];
            case self::METH_LEAN:
                return [
                    'backlog' => 'todo', 'kanban backlog' => 'todo',
                    'todo' => 'inprogress', 'value stream' => 'inprogress',
                    'testing' => 'review', 'qa' => 'review',
                    'done' => 'done', 'complete' => 'done',
                ];
            case self::METH_SCRUM:
            case self::METH_AGILE:
                return [
                    'product backlog' => 'todo', 'sprint backlog' => 'todo', 'backlog' => 'todo', 'todo' => 'todo',
                    'inprogress' => 'inprogress', 'in progress' => 'inprogress', 'doing' => 'inprogress', 'wip' => 'inprogress',
                    'review' => 'review', 'code review' => 'review', 'qa' => 'review', 'testing' => 'review',
                    'done' => 'done', 'complete' => 'done', 'finished' => 'done',
                ];
            case self::METH_KANBAN:
            default:
                return [
                    'todo' => 'todo', 'to do' => 'todo', 'backlog' => 'todo',
                    'inprogress' => 'inprogress', 'in progress' => 'inprogress', 'doing' => 'inprogress', 'wip' => 'inprogress',
                    'review' => 'review', 'code review' => 'review', 'qa' => 'review', 'testing' => 'review',
                    'done' => 'done', 'complete' => 'done', 'finished' => 'done',
                ];
        }
    }
}
