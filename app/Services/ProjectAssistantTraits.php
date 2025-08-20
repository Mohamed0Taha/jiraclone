<?php

namespace App\Services;

use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Trait ProjectAssistantTraits
 *
 * Cross-cutting helpers used by ProjectAssistantService and companion traits.
 * Uses internal constants to avoid dependency issues.
 */
trait ProjectAssistantTraits
{
    private const SERVER_STATUSES = ['todo','inprogress','review','done'];
    private const PRIORITIES = ['low','medium','high','urgent'];

    private function createResponse(string $type, string $message, bool $requiresConfirmation, array $data = []): array
    {
        $response = [
            'type' => $type,
            'message' => $message,
            'requires_confirmation' => $requiresConfirmation,
        ];
        if (!empty($data)) {
            $response['data'] = $data;
        }
        if ($type === 'information') {
            $response['ui'] = ['show_snapshot' => !empty($data)];
        }
        return $response;
    }

    private function looksLikeSecrets(string $text): bool
    {
        $needles = [
            'api_key','api-key','apikey','secret=','password=','pwd=','token=','bearer ','ghp_',
            '-----BEGIN ','PRIVATE KEY','aws_access_key_id','aws_secret_access_key',
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

    /**
     * Determine the current methodology for the project.
     * Uses literals to satisfy static analyzers.
     *
     * @return string One of: 'kanban','scrum','agile','waterfall','lean'
     */
    private function currentMethodology(Project $project): string
    {
        try {
            $meta = $project->meta ?? null;
            if (is_array($meta) && !empty($meta['methodology'])) {
                $m = strtolower((string)$meta['methodology']);
                $allowed = ['kanban','scrum','agile','waterfall','lean'];
                if (in_array($m, $allowed, true)) {
                    return $m;
                }
            }
        } catch (Throwable $e) {
            // ignore and fall back
        }
        return 'kanban';
    }

    /**
     * Map server statuses to user-facing phase labels based on methodology.
     * Returns an array keyed by server status: todo|inprogress|review|done
     */
    private function serverToMethodPhase(string $method): array
    {
        switch ($method) {
            case 'scrum':
            case 'agile':
                return ['todo'=>'todo','inprogress'=>'inprogress','review'=>'review','done'=>'done'];
            case 'waterfall':
                return ['todo'=>'requirements','inprogress'=>'design','review'=>'verification','done'=>'maintenance'];
            case 'lean':
                return ['todo'=>'backlog','inprogress'=>'todo','review'=>'testing','done'=>'done'];
            case 'kanban':
            default:
                return ['todo'=>'todo','inprogress'=>'inprogress','review'=>'review','done'=>'done'];
        }
    }

    /**
     * Inverse of serverToMethodPhase: map various methodology labels back to server statuses.
     */
    private function methodPhaseToServer(string $method): array
    {
        switch ($method) {
            case 'waterfall':
                return [
                    'requirements'=>'todo','specification'=>'todo','analysis'=>'todo',
                    'design'=>'inprogress','implementation'=>'inprogress','construction'=>'inprogress',
                    'verification'=>'review','validation'=>'review','testing phase'=>'review',
                    'maintenance'=>'done','done'=>'done','complete'=>'done'
                ];
            case 'lean':
                return [
                    'backlog'=>'todo','kanban backlog'=>'todo',
                    'todo'=>'inprogress','value stream'=>'inprogress',
                    'testing'=>'review','qa'=>'review',
                    'done'=>'done','complete'=>'done'
                ];
            case 'scrum':
            case 'agile':
                return [
                    'product backlog'=>'todo','sprint backlog'=>'todo','backlog'=>'todo','todo'=>'todo',
                    'inprogress'=>'inprogress','in progress'=>'inprogress','doing'=>'inprogress','wip'=>'inprogress',
                    'review'=>'review','code review'=>'review','qa'=>'review','testing'=>'review',
                    'done'=>'done','complete'=>'done','finished'=>'done'
                ];
            case 'kanban':
            default:
                return [
                    'todo'=>'todo','to do'=>'todo','backlog'=>'todo',
                    'inprogress'=>'inprogress','in progress'=>'inprogress','doing'=>'inprogress','wip'=>'inprogress',
                    'review'=>'review','code review'=>'review','qa'=>'review','testing'=>'review',
                    'done'=>'done','complete'=>'done','finished'=>'done'
                ];
        }
    }

    private function prettyPhase(string $method, string $serverStatus): string
    {
        $map = $this->serverToMethodPhase($method);
        return $map[$serverStatus] ?? $serverStatus;
    }

    private function labelsFor(Project $project): array
    {
        return $this->serverToMethodPhase($this->currentMethodology($project));
    }

    private function norm(string $text): string
    {
        $t = strtolower(trim($text));
        $t = str_replace(['_', '-'], ' ', $t);
        $t = preg_replace('/\b(status|column|phase|stage)\b/', '', $t);
        $t = preg_replace('/\s+/', ' ', $t);
        return trim($t);
    }

    /**
     * Parse ordinal window instructions like "first two" / "last 3".
     * Returns filters: ['limit'=>N, 'order_by'=>'created_at', 'order'=>'asc|desc']
     */
    private function parseOrdinalWindow(string $mLow): ?array
    {
        $wordsToNum = ['one'=>1,'two'=>2,'three'=>3,'four'=>4,'five'=>5,'six'=>6,'seven'=>7,'eight'=>8,'nine'=>9,'ten'=>10];

        if (preg_match('/\b(?:only\s+)?(?:the\s+)?(first|last|top)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i', $mLow, $mm)) {
            $kind = strtolower($mm[1]);
            $nRaw = strtolower($mm[2]);
            $n = ctype_digit($nRaw) ? (int)$nRaw : ($wordsToNum[$nRaw] ?? null);
            if ($n && $n > 0) {
                $order = ($kind === 'last') ? 'desc' : 'asc';
                return ['limit' => $n, 'order_by' => 'created_at', 'order' => $order];
            }
        }

        if (preg_match('/\b(first|last)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i', $mLow, $mm)) {
            $kind = strtolower($mm[1]);
            $nRaw = strtolower($mm[2]);
            $n = ctype_digit($nRaw) ? (int)$nRaw : ($wordsToNum[$nRaw] ?? null);
            if ($n && $n > 0) {
                $order = ($kind === 'last') ? 'desc' : 'asc';
                return ['limit' => $n, 'order_by' => 'created_at', 'order' => $order];
            }
        }

        return null;
    }

    private function projectOwner(Project $project): ?User
    {
        try {
            return $project->user ?? User::find($project->user_id);
        } catch (Throwable $e) {
            return User::find($project->user_id);
        }
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    private function projectMembers(Project $project): Collection
    {
        try {
            if (method_exists($project, 'members')) {
                $res = $project->members()->get(['users.id','users.name','users.email']);
                return $res ?: collect();
            }
        } catch (Throwable $e) {
        }
        return collect();
    }

    private function resolveAssigneeId(Project $project, string $hint): ?int
    {
        $hint = trim($hint);
        if ($hint === '') return null;

        $hint = ltrim($hint, '@');
        $hint = preg_replace("/'s$/u", '', $hint);

        if (in_array(mb_strtolower($hint), ['me','myself','__me__'], true)) {
            $me = $this->currentUserId($project);
            return $me ?: null;
        }

        if (in_array(mb_strtolower($hint), ['owner','project owner','__owner__'], true)) {
            $owner = $this->projectOwner($project);
            return $owner?->id ?: null;
        }

        if (ctype_digit($hint)) {
            $user = User::find((int)$hint);
            if ($user && $this->userIsProjectMember($project, $user)) return $user->id;
            return null;
        }

        if (filter_var($hint, FILTER_VALIDATE_EMAIL)) {
            $user = User::where('email', $hint)->first();
            if ($user && $this->userIsProjectMember($project, $user)) return $user->id;
            return null;
        }

        $candidates = collect();
        $owner = $this->projectOwner($project);
        if ($owner) $candidates->push($owner);
        $members = $this->projectMembers($project);
        $candidates = $candidates->merge($members)->unique('id');

        $match = $candidates->first(function($u) use ($hint) {
            return mb_strtolower($u->name) === mb_strtolower($hint);
        });
        if ($match) return (int)$match->id;

        $match = $candidates->first(function($u) use ($hint) {
            return Str::contains(mb_strtolower($u->name), mb_strtolower($hint));
        });
        if ($match) return (int)$match->id;

        return null;
    }

    private function userIsProjectMember(Project $project, User $user): bool
    {
        if ((int)$project->user_id === (int)$user->id) return true;
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
            if ($id) return (int)$id;
        } catch (Throwable $e) {
        }
        return $project->user_id ?? null;
    }

    private function parseDate(string $text): ?Carbon
    {
        $text = trim($text);
        if ($text === '') return null;
        try {
            return Carbon::parse($text);
        } catch (Throwable $e) {
            return null;
        }
    }

    private function normalizeType(?string $type): ?string
    {
        if (!$type) return null;
        $t = strtolower(trim($type));

        $map = [
            'create' => 'create_task','create-task' => 'create_task','new_task' => 'create_task','new-task' => 'create_task',
            'update' => 'task_update','update_task' => 'task_update','update-task' => 'task_update','edit_task' => 'task_update','edit-task' => 'task_update','move_task' => 'task_update','move-task' => 'task_update',
            'delete' => 'task_delete','delete_task' => 'task_delete','delete-task' => 'task_delete','remove_task' => 'task_delete','remove-task' => 'task_delete',
            'bulkupdate' => 'bulk_update','bulk-update' => 'bulk_update','mass_update' => 'bulk_update','mass-update' => 'bulk_update',
            'assign' => 'bulk_assign','bulk_assign' => 'bulk_assign','bulk-assign' => 'bulk_assign','assign_all' => 'bulk_assign','assign-all' => 'bulk_assign',
            'bulk-delete' => 'bulk_delete','bulkdelete' => 'bulk_delete','delete_filtered' => 'bulk_delete','delete-filtered' => 'bulk_delete',
            'delete_overdue' => 'bulk_delete_overdue','delete-overdue' => 'bulk_delete_overdue','bulk_delete_overdue' => 'bulk_delete_overdue','bulk-delete-overdue' => 'bulk_delete_overdue',
            'delete_all' => 'bulk_delete_all','delete-all' => 'bulk_delete_all','clear_all' => 'bulk_delete_all','clear-all' => 'bulk_delete_all','bulk_delete_all' => 'bulk_delete_all','bulk-delete-all' => 'bulk_delete_all',
            'find' => 'find_task','find_task' => 'find_task','find-task' => 'find_task','search_task' => 'find_task','search-task' => 'find_task',
            'update_project' => 'update_project','update-project' => 'update_project','project_update' => 'update_project','project-update' => 'update_project',
        ];

        return $map[$t] ?? $t;
    }

    private function resolvePriorityToken(string $token): ?string
    {
        $t = $this->norm($token);
        if (in_array($t, self::PRIORITIES, true)) return $t;

        $map = [
            'lowest' => 'low','normal' => 'medium','medium priority' => 'medium','moderate' => 'medium',
            'higher' => 'high','highest' => 'urgent','critical' => 'urgent','blocker' => 'urgent',
            'p3' => 'low','prio 3' => 'low','p2' => 'medium','prio 2' => 'medium','p1' => 'high','prio 1' => 'high','p0' => 'urgent','prio 0' => 'urgent',
        ];
        if (isset($map[$t])) return $map[$t];

        return null;
    }

    private function resolveStatusToken(Project $project, string $token): ?string
    {
        $method = $this->currentMethodology($project);
        $t = $this->norm($token);
        if ($t === '') return null;

        if (in_array($t, self::SERVER_STATUSES, true)) return $t;

        $phaseToServer = $this->methodPhaseToServer($method);
        if (array_key_exists($t, $phaseToServer)) return $phaseToServer[$t];

        if ($t === 'in progress') return 'inprogress';

        return null;
    }

    private function nthStageToStatus(Project $project, string $ordinal): ?string
    {
        $order = ['first'=>0,'second'=>1,'third'=>2,'fourth'=>3];
        $idx   = $order[$ordinal] ?? null;
        if ($idx === null) return null;

        $pipeline = ['todo','inprogress','review','done'];
        return $pipeline[$idx] ?? null;
    }

    private function synthesizeWithLLMEnhanced(Project $project, string $message, array $history = []): array
    {
        return [];
    }

    private function provideSuggestions(Project $project, string $message): array
    {
        $m = strtolower($message);
        $suggestions = "I couldn't understand that command. ";

        if (strpos($m, 'task') !== false) {
            $suggestions .= "Try:\n• Create task \"Your task title\"\n• Show task #123\n• Find tasks assigned to John";
        } elseif (strpos($m, 'project') !== false) {
            $suggestions .= "Try:\n• Project overview\n• Set project name to \"New Name\"\n• Project due date";
        } elseif (strpos($m, 'who') !== false || strpos($m, 'team') !== false) {
            $suggestions .= "Try:\n• Who are the team members?\n• Who created task #123?\n• Who is assigned to task #456?";
        } else {
            $suggestions .= "Try commands like:\n• Create task \"Task title\"\n• Show task #123\n• Project overview\n• Tasks due this week";
        }

        return $this->createResponse('information', $suggestions, false);
    }
}