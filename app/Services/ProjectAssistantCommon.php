<?php

// File: app/Services/ProjectAssistantCommon.php

namespace App\Services;

use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Throwable;

trait ProjectAssistantCommon
{
    // Canonical server-side statuses and priorities
    private const SERVER_STATUSES = ['todo', 'inprogress', 'review', 'done'];

    private const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    // Supported methodologies
    private const METH_KANBAN = 'kanban';

    private const METH_SCRUM = 'scrum';

    private const METH_AGILE = 'agile';

    private const METH_WATERFALL = 'waterfall';

    private const METH_LEAN = 'lean';

    // Enhanced action patterns for task identification
    private const ENHANCED_ACTION_PATTERNS = [
        'find_task' => [
            '/\b(?:find|search|locate|show|get)\s+(?:task|tasks)\b/i',
            '/\b(?:which|what)\s+task\b/i',
            '/\btask\s+(?:by|with|from|created by|assigned to)\b/i',
        ],
        'project_info' => [
            '/\b(?:project|this project)\s+(?:info|details|summary|overview)\b/i',
            '/\bwhen\s+(?:was\s+)?(?:this\s+)?project\s+(?:created|started)\b/i',
            '/\bproject\s+(?:start|end|due)\s+date\b/i',
        ],
        'update_project' => [
            '/\b(?:update|change|modify|set)\s+project\b/i',
            '/\bproject\s+(?:name|title|description|due|start)\b/i',
        ],
    ];

    // Task identification patterns
    private const TASK_ID_PATTERNS = [
        'by_id' => '/\b(?:task\s+)?#?(\d+)\b/i',
        'by_assignee' => '/\b(?:task[s]?\s+)?(?:assigned\s+to|for|by)\s+([a-z0-9._@\-\s]+)\b/i',
        'by_creator' => '/\b(?:task[s]?\s+)?(?:created\s+by|from)\s+([a-z0-9._@\-\s]+)\b/i',
        'by_milestone' => '/\b(?:task[s]?\s+)?(?:in|from)\s+milestone\s+([a-z0-9._\-\s]+)\b/i',
        'by_status_combo' => '/\b([a-z\-\s]+)\s+(?:task[s]?\s+)?(?:assigned\s+to|for)\s+([a-z0-9._@\-\s]+)\b/i',
    ];

    private function looksLikeSecrets(string $text): bool
    {
        $needles = [
            'api_key', 'api-key', 'apikey', 'secret=', 'password=', 'pwd=', 'token=', 'bearer ', 'ghp_',
            '-----BEGIN ', 'PRIVATE KEY', 'aws_access_key_id', 'aws_secret_access_key',
        ];
        $low = strtolower($text);
        foreach ($needles as $n) {
            if (strpos($low, strtolower($n)) !== false) {
                return true;
            }
        }

        return false;
    }

    private function logException(Throwable $e, array $context = []): void
    {
        try {
            Log::error('[ProjectAssistantService] '.$e->getMessage(), array_merge($context, [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]));
        } catch (Throwable $ignore) {
        }
    }

    private function currentMethodology(Project $project): string
    {
        try {
            $meta = $project->meta ?? null;
            if (is_array($meta) && ! empty($meta['methodology'])) {
                $m = strtolower((string) $meta['methodology']);
                if (in_array($m, [self::METH_KANBAN, self::METH_SCRUM, self::METH_AGILE, self::METH_WATERFALL, self::METH_LEAN], true)) {
                    return $m;
                }
            }
        } catch (Throwable $e) {
        }

        return self::METH_KANBAN;
    }

    private function serverToMethodPhase(string $method): array
    {
        switch ($method) {
            case self::METH_SCRUM:
            case self::METH_AGILE:
                return ['todo' => 'todo', 'inprogress' => 'inprogress', 'review' => 'review', 'done' => 'done'];
            case self::METH_WATERFALL:
                return ['todo' => 'requirements', 'inprogress' => 'design', 'review' => 'verification', 'done' => 'maintenance'];
            case self::METH_LEAN:
                return ['todo' => 'backlog', 'inprogress' => 'todo', 'review' => 'testing', 'done' => 'done'];
            case self::METH_KANBAN:
            default:
                return ['todo' => 'todo', 'inprogress' => 'inprogress', 'review' => 'review', 'done' => 'done'];
        }
    }

    private function methodPhaseToServer(string $method): array
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

    private function resolveStatusToken(Project $project, string $token): ?string
    {
        $method = $this->currentMethodology($project);
        $t = $this->norm($token);
        if ($t === '') {
            return null;
        }

        if (in_array($t, self::SERVER_STATUSES, true)) {
            return $t;
        }

        $phaseToServer = $this->methodPhaseToServer($method);
        if (array_key_exists($t, $phaseToServer)) {
            return $phaseToServer[$t];
        }

        if ($t === 'in progress') {
            return 'inprogress';
        }

        return null;
    }

    private function resolvePriorityToken(string $token): ?string
    {
        $t = $this->norm($token);
        if (in_array($t, self::PRIORITIES, true)) {
            return $t;
        }

        $map = [
            'lowest' => 'low', 'normal' => 'medium', 'medium priority' => 'medium', 'moderate' => 'medium',
            'higher' => 'high', 'highest' => 'urgent', 'critical' => 'urgent', 'blocker' => 'urgent',
            'p3' => 'low', 'prio 3' => 'low', 'p2' => 'medium', 'prio 2' => 'medium', 'p1' => 'high', 'prio 1' => 'high', 'p0' => 'urgent', 'prio 0' => 'urgent',
        ];
        if (isset($map[$t])) {
            return $map[$t];
        }

        return null;
    }

    private function prettyPhase(string $method, string $serverStatus): string
    {
        $map = $this->serverToMethodPhase($method);

        return $map[$serverStatus] ?? $serverStatus;
    }

    private function labelsFor(Project $project): array
    {
        $method = $this->currentMethodology($project);

        return $this->serverToMethodPhase($method);
    }

    private function norm(string $text): string
    {
        $t = strtolower(trim($text));
        $t = str_replace(['_', '-'], ' ', $t);
        $t = preg_replace('/\b(status|column|phase|stage)\b/', '', $t);
        $t = preg_replace('/\s+/', ' ', $t);

        return trim($t);
    }

    private function parseOrdinalWindow(string $mLow): ?array
    {
        $wordsToNum = ['one' => 1, 'two' => 2, 'three' => 3, 'four' => 4, 'five' => 5, 'six' => 6, 'seven' => 7, 'eight' => 8, 'nine' => 9, 'ten' => 10];

        if (preg_match('/\b(?:only\s+)?(?:the\s+)?(first|last|top)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i', $mLow, $mm)) {
            $kind = strtolower($mm[1]);
            $nRaw = strtolower($mm[2]);
            $n = ctype_digit($nRaw) ? (int) $nRaw : ($wordsToNum[$nRaw] ?? null);
            if ($n && $n > 0) {
                $order = ($kind === 'last') ? 'desc' : 'asc';

                return ['limit' => $n, 'order_by' => 'created_at', 'order' => $order];
            }
        }

        if (preg_match('/\b(first|last)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i', $mLow, $mm)) {
            $kind = strtolower($mm[1]);
            $nRaw = strtolower($mm[2]);
            $n = ctype_digit($nRaw) ? (int) $nRaw : ($wordsToNum[$nRaw] ?? null);
            if ($n && $n > 0) {
                $order = ($kind === 'last') ? 'desc' : 'asc';

                return ['limit' => $n, 'order_by' => 'created_at', 'order' => $order];
            }
        }

        return null;
    }

    private function parseDate(string $text): ?Carbon
    {
        $text = trim($text);
        if ($text === '') {
            return null;
        }
        try {
            return Carbon::parse($text);
        } catch (Throwable $e) {
            return null;
        }
    }

    private function normalizeType(?string $type): ?string
    {
        if (! $type) {
            return null;
        }
        $t = strtolower(trim($type));

        $map = [
            'create' => 'create_task', 'create-task' => 'create_task', 'new_task' => 'create_task', 'new-task' => 'create_task',
            'update' => 'task_update', 'update_task' => 'task_update', 'update-task' => 'task_update', 'edit_task' => 'task_update', 'edit-task' => 'task_update', 'move_task' => 'task_update', 'move-task' => 'task_update',
            'delete' => 'task_delete', 'delete_task' => 'task_delete', 'delete-task' => 'task_delete', 'remove_task' => 'task_delete', 'remove-task' => 'task_delete',
            'bulkupdate' => 'bulk_update', 'bulk-update' => 'bulk_update', 'mass_update' => 'bulk_update', 'mass-update' => 'bulk_update',
            'assign' => 'bulk_assign', 'bulk_assign' => 'bulk_assign', 'bulk-assign' => 'bulk_assign', 'assign_all' => 'bulk_assign', 'assign-all' => 'bulk_assign',
            'bulk-delete' => 'bulk_delete', 'bulkdelete' => 'bulk_delete', 'delete_filtered' => 'bulk_delete', 'delete-filtered' => 'bulk_delete',
            'delete_overdue' => 'bulk_delete_overdue', 'delete-overdue' => 'bulk_delete_overdue', 'bulk_delete_overdue' => 'bulk_delete_overdue', 'bulk-delete-overdue' => 'bulk_delete_overdue',
            'delete_all' => 'bulk_delete_all', 'delete-all' => 'bulk_delete_all', 'clear_all' => 'bulk_delete_all', 'clear-all' => 'bulk_delete_all', 'bulk_delete_all' => 'bulk_delete_all', 'bulk-delete-all' => 'bulk_delete_all',
            'find' => 'find_task', 'find_task' => 'find_task', 'find-task' => 'find_task', 'search_task' => 'find_task', 'search-task' => 'find_task',
            'update_project' => 'update_project', 'update-project' => 'update_project', 'project_update' => 'update_project', 'project-update' => 'update_project',
        ];

        return $map[$t] ?? $t;
    }

    private function createResponse(string $type, string $message, bool $requiresConfirmation, array $data = []): array
    {
        $response = [
            'type' => $type,
            'message' => $message,
            'requires_confirmation' => $requiresConfirmation,
        ];
        if (! empty($data)) {
            $response['data'] = $data;
        }
        if ($type === 'information') {
            $response['ui'] = ['show_snapshot' => ! empty($data)];
        }

        return $response;
    }

    private function projectOwner(Project $project): ?User
    {
        try {
            return $project->user ?? User::find($project->user_id);
        } catch (Throwable $e) {
            return User::find($project->user_id);
        }
    }

    private function projectMembers(Project $project)
    {
        try {
            if (method_exists($project, 'members')) {
                return $project->members()->get(['users.id', 'users.name', 'users.email']);
            }
        } catch (Throwable $e) {
        }

        return collect();
    }

    private function userIsProjectMember(Project $project, User $user): bool
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

    private function currentUserId(Project $project): ?int
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
}
