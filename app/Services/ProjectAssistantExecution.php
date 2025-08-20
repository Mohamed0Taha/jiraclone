<?php
// File: app/Services/ProjectAssistantExecution.php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Exception;
use App\Services\ProjectAssistantConstants as PA;

trait ProjectAssistantExecution
{
    private function execCreateTask(Project $project, array $payload): array
    {
        $title = trim((string)($payload['title'] ?? ''));
        if ($title === '') throw new Exception('Task title is required.');

        $task = new Task();
        $task->project_id = $project->id;
        $task->creator_id = method_exists($this, 'currentUserId') ? $this->currentUserId($project) : null;
        $task->title = $title;
        $task->description = (string)($payload['description'] ?? '');
        $incomingStatus   = $payload['status']   ?? 'todo';
        $incomingPriority = $payload['priority'] ?? 'medium';
        $task->status   = in_array($incomingStatus, PA::SERVER_STATUSES, true) ? $incomingStatus : 'todo';
        $task->priority = in_array($incomingPriority, PA::PRIORITIES, true) ? $incomingPriority : 'medium';
        $task->start_date = $payload['start_date'] ?? null;
        $task->end_date   = $payload['end_date']   ?? null;
        $task->save();

        return ['message' => "✅ Task \"{$task->title}\" created successfully."];
    }

    private function execTaskUpdate(Project $project, array $selector, array $changes): array
    {
        $taskId = (int)($selector['id'] ?? 0);
        if ($taskId <= 0) throw new Exception('Task selector is required.');
        $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();
        if (!$task) throw new Exception("Task #{$taskId} not found in this project.");

        $this->applyUpdatesToTask($project, $task, $changes);
        $task->save();

        return ['message' => "✏️ Task #{$task->id} updated successfully."];
    }

    private function execTaskDelete(Project $project, array $selector): array
    {
        $taskId = (int)($selector['id'] ?? 0);
        if ($taskId <= 0) throw new Exception('Task selector is required.');
        $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();
        if (!$task) throw new Exception("Task #{$taskId} not found in this project.");
        $title = (string)$task->title;
        $task->delete();
        return ['message' => "🗑️ Task #{$taskId} \"{$title}\" deleted successfully."];
    }

    private function execBulkUpdate(Project $project, array $filters, array $updates): array
    {
        $q = $this->buildTaskQuery($project, $filters);
        $tasks = $q->get();
        $count = 0;

        $wantsRename = isset($updates['title']);
        if ($wantsRename && count($tasks) !== 1) {
            throw new Exception("Rename requires exactly one task selection.");
        }

        foreach ($tasks as $t) {
            $applied = $this->applyUpdatesToTask($project, $t, $updates);
            if ($applied) { $t->save(); $count++; }
        }

        return ['message' => $count > 0 ? "⚡ Updated {$count} task(s) successfully." : "No changes applied."];
    }

    private function execBulkAssign(Project $project, array $filters, string $assigneeHint): array
    {
        $assigneeId = $this->resolveAssigneeId($project, $assigneeHint);
        if (!$assigneeId) throw new Exception("Assignee '{$assigneeHint}' could not be determined.");

        $q = $this->buildTaskQuery($project, $filters);
        $tasks = $q->get();
        $count = 0;

        foreach ($tasks as $t) {
            $t->assignee_id = $assigneeId;
            $t->save();
            $count++;
        }

        $user = User::find($assigneeId);
        $name = $user ? $user->name : $assigneeHint;
        return ['message' => "👤 Assigned {$count} task(s) to {$name}."];
    }

    private function execBulkDeleteOverdue(Project $project): array
    {
        $q = Task::where('project_id',$project->id)
            ->whereIn('status', ['todo','inprogress','review'])
            ->whereNotNull('end_date');

        $count = 0;
        foreach ($q->get() as $t) {
            try {
                if (Carbon::parse($t->end_date)->isPast()) {
                    $t->delete();
                    $count++;
                }
            } catch (\Throwable $e) {}
        }
        return ['message' => "🗑️ Deleted {$count} overdue task(s)."];
    }

    private function execBulkDeleteAll(Project $project): array
    {
        $tasks = Task::where('project_id',$project->id)->get();
        $count = 0; foreach ($tasks as $t) { $t->delete(); $count++; }
        return ['message' => "⚠️ Deleted ALL {$count} task(s) in this project."];
    }

    private function execBulkDelete(Project $project, array $filters): array
    {
        $q = $this->buildTaskQuery($project, $filters);
        $tasks = $q->get();
        $count = 0; foreach ($tasks as $t) { $t->delete(); $count++; }
        return ['message' => "🗑️ Deleted {$count} task(s)."];
    }

    private function execProjectUpdate(Project $project, array $changes): array
    {
        if (!method_exists($this, 'isProjectCreator') || !$this->isProjectCreator($project)) {
            throw new Exception('Only the project creator can update project details.');
        }

        $updated = [];
        foreach ($changes as $field => $value) {
            if (in_array($field, ['name','description','start_date','end_date'], true)) {
                $project->$field = $value;
                $updated[] = ucfirst(str_replace('_',' ',$field));
            }
        }
        if (empty($updated)) throw new Exception('No valid project fields to update.');
        $project->save();

        return ['message' => "✅ Project updated: " . implode(', ', $updated)];
    }

    private function applyUpdatesToTask(Project $project, Task $task, array $updates): bool
    {
        $changed = false;

        if (isset($updates['status']) && in_array($updates['status'], PA::SERVER_STATUSES, true)) {
            if ($task->status !== $updates['status']) { $task->status = $updates['status']; $changed = true; }
        }

        if (isset($updates['priority'])) {
            $prio = method_exists($this,'resolvePriorityToken') ? $this->resolvePriorityToken($updates['priority']) : null;
            if ($prio && in_array($prio, PA::PRIORITIES, true) && $task->priority !== $prio) { $task->priority = $prio; $changed = true; }
        }

        if (isset($updates['assignee_hint'])) {
            $assigneeId = $this->resolveAssigneeId($project, $updates['assignee_hint']);
            if (!$assigneeId) throw new Exception("Assignee '{$updates['assignee_hint']}' could not be determined.");
            if ((int)$task->assignee_id !== (int)$assigneeId) { $task->assignee_id = $assigneeId; $changed = true; }
        }

        if (isset($updates['end_date'])) {
            $new = $updates['end_date'];
            if ($task->end_date !== $new) { $task->end_date = $new; $changed = true; }
        }

        if (isset($updates['start_date'])) {
            $new = $updates['start_date'];
            if ($task->start_date !== $new) { $task->start_date = $new; $changed = true; }
        }

        if (array_key_exists('description', $updates)) {
            $text = (string)$updates['description'];
            $mode = $updates['_mode'] ?? 'replace_desc';
            if ($mode === 'append_desc') {
                $existing = (string)($task->description ?? '');
                $new = trim($existing === '' ? $text : ($existing."\n\n".$text));
                if ($new !== (string)$task->description) { $task->description = $new; $changed = true; }
            } else {
                if ($text !== (string)$task->description) { $task->description = $text; $changed = true; }
            }
        }

        if (isset($updates['title'])) {
            $newTitle = trim((string)$updates['title']);
            if ($newTitle !== '' && $newTitle !== (string)$task->title) { $task->title = $newTitle; $changed = true; }
        }

        return $changed;
    }
}
