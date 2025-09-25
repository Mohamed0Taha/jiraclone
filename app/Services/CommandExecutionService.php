<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * CommandExecutionService
 *
 * Executes a validated command plan against the database.
 * Enhanced with comprehensive execution methods from legacy implementation.
 */
class CommandExecutionService
{
    private ProjectContextService $contextService;

    private TaskGeneratorService $taskGenerator;

    private const SERVER_STATUSES = ['todo', 'inprogress', 'review', 'done'];

    private const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    public function __construct(ProjectContextService $contextService, TaskGeneratorService $taskGenerator)
    {
        $this->contextService = $contextService;
        $this->taskGenerator = $taskGenerator;
    }

    public function execute(Project $project, array $plan): array
    {
        try {
            $type = $this->normalizeType($plan['type'] ?? null);
            if (! $type) {
                throw new \Exception('Invalid command payload.');
            }

            Log::debug('[CommandExecutionService] Executing command', ['type' => $type, 'plan' => $plan]);

            switch ($type) {
                case 'create_task':
                    $res = $this->execCreateTask($project, $plan['payload'] ?? []);
                    break;
                case 'task_update':
                    $res = $this->execTaskUpdate($project, $plan['selector'] ?? [], $plan['changes'] ?? []);
                    break;
                case 'task_delete':
                    $res = $this->execTaskDelete($project, $plan['selector'] ?? []);
                    break;
                case 'bulk_update':
                    $res = $this->execBulkUpdate($project, $plan['filters'] ?? [], $plan['updates'] ?? []);
                    break;
                case 'bulk_assign':
                    $res = $this->execBulkAssign($project, $plan['filters'] ?? [], (string) ($plan['assignee'] ?? ''));
                    break;
                case 'bulk_delete_overdue':
                    $res = $this->execBulkDeleteOverdue($project);
                    break;
                case 'bulk_delete_all':
                    $res = $this->execBulkDeleteAll($project);
                    break;
                case 'bulk_delete':
                    $res = $this->execBulkDelete($project, $plan['filters'] ?? []);
                    break;
                case 'bulk_task_generation':
                    $res = $this->execBulkTaskGeneration($project, $plan);
                    break;
                default:
                    throw new \Exception('Unknown command type: '.$type);
            }

            $snapshot = $this->contextService->buildSnapshot($project);

            return [
                'type' => 'information',
                'message' => $res['message'] ?? 'Done.',
                'data' => $snapshot,
                'requires_confirmation' => false,
                'ui' => ['show_snapshot' => true],
                'meta' => [
                    'intent' => 'command_execution',
                    'tool' => 'command-execution',
                    'executed_plan' => $plan,
                ],
            ];
        } catch (Throwable $e) {
            Log::error('[CommandExecutionService] Execution failed', [
                'plan' => $plan,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return [
                'type' => 'error',
                'message' => 'Something went wrong. Please adjust and try again.',
                'requires_confirmation' => false,
                'meta' => [
                    'intent' => 'command_execution',
                    'tool' => 'command-execution',
                    'error' => true,
                ],
            ];
        }
    }

    private function execCreateTask(Project $project, array $payload): array
    {
        $title = trim((string) ($payload['title'] ?? ''));
        if ($title === '') {
            throw new \Exception('Task title is required.');
        }

        $task = new Task;
        $task->project_id = $project->id;
        $task->creator_id = $this->getCurrentUserId($project);
        $task->title = $title;
        $task->description = (string) ($payload['description'] ?? '');
        $task->status = in_array(($payload['status'] ?? 'todo'), self::SERVER_STATUSES, true) ? $payload['status'] : 'todo';
        $task->priority = in_array(($payload['priority'] ?? 'medium'), self::PRIORITIES, true) ? $payload['priority'] : 'medium';
        $task->start_date = $payload['start_date'] ?? null;
        $task->end_date = $payload['end_date'] ?? null;
        $task->save();

        return ['message' => "✅ Task \"{$task->title}\" created successfully."];
    }

    private function execTaskUpdate(Project $project, array $selector, array $changes): array
    {
        $taskId = (int) ($selector['id'] ?? 0);
        if ($taskId <= 0) {
            throw new \Exception('Task selector is required.');
        }

        $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();
        if (! $task) {
            throw new \Exception("Task #{$taskId} not found in this project.");
        }

        $this->applyUpdatesToTask($project, $task, $changes);
        $task->save();

        return ['message' => "✏️ Task #{$task->id} updated successfully."];
    }

    private function execTaskDelete(Project $project, array $selector): array
    {
        $taskId = (int) ($selector['id'] ?? 0);
        if ($taskId <= 0) {
            throw new \Exception('Task selector is required.');
        }

        $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();
        if (! $task) {
            throw new \Exception("Task #{$taskId} not found in this project.");
        }

        $title = (string) $task->title;
        $task->delete();

        return ['message' => "🗑️ Task #{$taskId} \"{$title}\" deleted successfully."];
    }

    private function execBulkUpdate(Project $project, array $filters, array $updates): array
    {
        $q = $this->contextService->buildTaskQuery($project, $filters);
        $tasks = $q->get();
        $count = 0;

        $wantsRename = isset($updates['title']);
        if ($wantsRename && count($tasks) !== 1) {
            throw new \Exception('Rename requires exactly one task selection.');
        }

        foreach ($tasks as $task) {
            $applied = $this->applyUpdatesToTask($project, $task, $updates);
            if ($applied) {
                $task->save();
                $count++;
            }
        }

        return ['message' => $count > 0 ? "⚡ Updated {$count} task(s) successfully." : 'No changes applied.'];
    }

    private function execBulkAssign(Project $project, array $filters, string $assigneeHint): array
    {
        $assigneeId = $this->resolveAssigneeId($project, $assigneeHint);
        if (! $assigneeId) {
            throw new \Exception("Assignee '{$assigneeHint}' could not be determined.");
        }

        $q = $this->contextService->buildTaskQuery($project, $filters);
        $tasks = $q->get();
        $count = 0;

        foreach ($tasks as $task) {
            $task->assignee_id = $assigneeId;
            $task->save();
            $count++;
        }

        $user = User::find($assigneeId);
        $name = $user ? $user->name : $assigneeHint;

        return ['message' => "👤 Assigned {$count} task(s) to {$name}."];
    }

    private function execBulkDeleteOverdue(Project $project): array
    {
        $q = Task::where('project_id', $project->id)
            ->whereIn('status', ['todo', 'inprogress', 'review'])
            ->whereNotNull('end_date');

        $count = 0;
        foreach ($q->get() as $task) {
            try {
                if (Carbon::parse($task->end_date)->isPast()) {
                    $task->delete();
                    $count++;
                }
            } catch (\Throwable $e) {
                Log::warning('[CommandExecutionService] Failed to parse date for task', ['task_id' => $task->id, 'end_date' => $task->end_date]);
            }
        }

        return ['message' => "🗑️ Deleted {$count} overdue task(s)."];
    }

    private function execBulkDeleteAll(Project $project): array
    {
        $tasks = Task::where('project_id', $project->id)->get();
        $count = 0;
        foreach ($tasks as $task) {
            $task->delete();
            $count++;
        }

        return ['message' => "⚠️ Deleted ALL {$count} task(s) in this project."];
    }

    private function execBulkDelete(Project $project, array $filters): array
    {
        $q = $this->contextService->buildTaskQuery($project, $filters);
        $tasks = $q->get();
        $count = 0;
        foreach ($tasks as $task) {
            $task->delete();
            $count++;
        }

        return ['message' => "🗑️ Deleted {$count} task(s)."];
    }

    private function execBulkTaskGeneration(Project $project, array $plan): array
    {
        $count = max(1, min(10, (int) ($plan['count'] ?? 3)));
        $context = (string) ($plan['context'] ?? '');
        $fullMessage = (string) ($plan['full_message'] ?? '');

        Log::info('[CommandExecutionService] Generating bulk tasks', [
            'project_id' => $project->id,
            'count' => $count,
            'context' => $context,
        ]);

        try {
            // Use the TaskGeneratorService to create tasks
            $generatedTasks = $this->taskGenerator->generateTasks($project, $count, $context ?: $fullMessage);

            $createdTasks = [];
            foreach ($generatedTasks as $taskData) {
                $task = new Task;
                $task->project_id = $project->id;
                $task->creator_id = $this->getCurrentUserId($project);
                $task->title = $taskData['title'];
                $task->description = $taskData['description'] ?? '';
                $task->status = 'todo';
                $task->priority = strtolower($taskData['priority'] ?? 'medium');
                $task->start_date = $taskData['start_date'] ?? null;
                $task->end_date = $taskData['end_date'] ?? null;
                $task->save();

                $createdTasks[] = $task;
            }

            $actualCount = count($createdTasks);
            $taskTitles = collect($createdTasks)->pluck('title')->take(3)->implode('", "');
            if ($actualCount > 3) {
                $taskTitles .= '", and '.($actualCount - 3).' more';
            }

            return ['message' => "✨ Generated {$actualCount} tasks successfully: \"{$taskTitles}\""];

        } catch (\Throwable $e) {
            Log::error('[CommandExecutionService] Task generation failed', [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
            ]);

            return ['message' => '❌ Task generation failed: '.$e->getMessage()];
        }
    }

    private function applyUpdatesToTask(Project $project, Task $task, array $updates): bool
    {
        $changed = false;

        if (isset($updates['status']) && in_array($updates['status'], self::SERVER_STATUSES, true)) {
            if ($task->status !== $updates['status']) {
                $task->status = $updates['status'];
                $changed = true;
            }
        }

        if (isset($updates['priority'])) {
            $prio = $this->resolvePriorityToken($updates['priority']);
            if ($prio && $task->priority !== $prio) {
                $task->priority = $prio;
                $changed = true;
            }
        }

        if (isset($updates['assignee_hint'])) {
            $assigneeId = $this->resolveAssigneeId($project, $updates['assignee_hint']);
            if (! $assigneeId) {
                throw new \Exception("Assignee '{$updates['assignee_hint']}' could not be determined.");
            }
            if ((int) $task->assignee_id !== (int) $assigneeId) {
                $task->assignee_id = $assigneeId;
                $changed = true;
            }
        }

        if (isset($updates['end_date'])) {
            $new = $updates['end_date'];
            if ($task->end_date !== $new) {
                $task->end_date = $new;
                $changed = true;
            }
        }

        if (isset($updates['start_date'])) {
            $new = $updates['start_date'];
            if ($task->start_date !== $new) {
                $task->start_date = $new;
                $changed = true;
            }
        }

        if (array_key_exists('description', $updates)) {
            $text = (string) $updates['description'];
            Log::debug('[CommandExecutionService] Updating task description', ['task_id' => $task->id, 'new_description' => $text]);

            if (($updates['_mode'] ?? 'replace_desc') === 'append_desc') {
                $existing = (string) ($task->description ?? '');
                $new = trim($existing === '' ? $text : ($existing."\n\n".$text));
                if ($new !== (string) $task->description) {
                    $task->description = $new;
                    $changed = true;
                    Log::debug('[CommandExecutionService] Description appended', ['task_id' => $task->id]);
                }
            } else {
                // Replace description entirely
                if ($text !== (string) $task->description) {
                    $task->description = $text;
                    $changed = true;
                    Log::debug('[CommandExecutionService] Description replaced', ['task_id' => $task->id]);
                }
            }
        }

        if (isset($updates['title'])) {
            $newTitle = trim((string) $updates['title']);
            if ($newTitle !== '' && $newTitle !== (string) $task->title) {
                $task->title = $newTitle;
                $changed = true;
            }
        }

        return $changed;
    }

    private function resolveAssigneeId(Project $project, string $hint): ?int
    {
        $hint = trim($hint);
        if ($hint === '') {
            return null;
        }

        // Normalize: @handle and possessive "'s"
        $hint = ltrim($hint, '@');
        $hint = preg_replace("/'s$/u", '', $hint);

        // Pronouns → current user
        if (in_array(mb_strtolower($hint), ['me', 'myself', '__me__'], true)) {
            $me = $this->getCurrentUserId($project);

            return $me ?: null;
        }

        // Owner references
        if (in_array(mb_strtolower($hint), ['owner', 'project owner', '__owner__'], true)) {
            $owner = $this->getProjectOwner($project);

            return $owner?->id ?: null;
        }

        // numeric id
        if (ctype_digit($hint)) {
            $user = User::find((int) $hint);
            if ($user && $this->userIsProjectMember($project, $user)) {
                return $user->id;
            }

            return null;
        }

        // email
        if (filter_var($hint, FILTER_VALIDATE_EMAIL)) {
            $user = User::where('email', $hint)->first();
            if ($user && $this->userIsProjectMember($project, $user)) {
                return $user->id;
            }

            return null;
        }

        // Search owner + members by exact/partial name
        $candidates = collect();
        $owner = $this->getProjectOwner($project);
        if ($owner) {
            $candidates->push($owner);
        }
        $members = $this->getProjectMembers($project);
        $candidates = $candidates->merge($members)->unique('id');

        $match = $candidates->first(function ($u) use ($hint) {
            return mb_strtolower($u->name) === mb_strtolower($hint);
        });
        if ($match) {
            return (int) $match->id;
        }

        $match = $candidates->first(function ($u) use ($hint) {
            return Str::contains(mb_strtolower($u->name), mb_strtolower($hint));
        });
        if ($match) {
            return (int) $match->id;
        }

        return null;
    }

    private function resolvePriorityToken(string $token): ?string
    {
        $t = strtolower(trim($token));
        if (in_array($t, self::PRIORITIES, true)) {
            return $t;
        }

        $map = [
            'lowest' => 'low', 'normal' => 'medium', 'moderate' => 'medium',
            'higher' => 'high', 'highest' => 'urgent', 'critical' => 'urgent', 'blocker' => 'urgent',
            'p3' => 'low', 'p2' => 'medium', 'p1' => 'high', 'p0' => 'urgent',
        ];

        return $map[$t] ?? null;
    }

    private function getProjectOwner(Project $project): ?User
    {
        try {
            return $project->user ?? User::find($project->user_id);
        } catch (\Throwable $e) {
            return User::find($project->user_id);
        }
    }

    private function getProjectMembers(Project $project)
    {
        try {
            if (method_exists($project, 'members')) {
                return $project->members()->get(['users.id', 'users.name', 'users.email']);
            }
        } catch (\Throwable $e) {
            Log::warning('[CommandExecutionService] Failed to get project members', ['error' => $e->getMessage()]);
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
        } catch (\Throwable $e) {
            Log::warning('[CommandExecutionService] Failed to check project membership', ['error' => $e->getMessage()]);
        }

        return false;
    }

    private function getCurrentUserId(Project $project): ?int
    {
        try {
            $id = Auth::id();
            if ($id) {
                return (int) $id;
            }
        } catch (Throwable $e) {
            Log::warning('[CommandExecutionService] Failed to get current user ID', ['error' => $e->getMessage()]);
        }

        return $project->user_id ?? null;
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
        ];

        return $map[$t] ?? $t;
    }
}
