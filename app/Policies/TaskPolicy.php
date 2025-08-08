<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TaskPolicy
{
    use HandlesAuthorization;

    /*
    |--------------------------------------------------------------------------
    | Helper: isPermitted
    |--------------------------------------------------------------------------
    | A user may act on a task if they are:
    |   • The project owner
    |   • The task creator
    |   • The current assignee
    */
    protected function isPermitted(User $user, Task $task): bool
    {
        return $user->id === $task->project->user_id     // project owner
            || $user->id === $task->creator_id           // creator
            || $user->id === $task->assignee_id;         // assignee
    }

    /** View any task list (controller scopes by project). */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /** View a single task. */
    public function view(User $user, Task $task): bool
    {
        return $this->isPermitted($user, $task);
    }

    /** Create a task. */
    public function create(User $user): bool
    {
        return true;
    }

    /** Update a task (status change, edits, etc.). */
    public function update(User $user, Task $task): bool
    {
        return $this->isPermitted($user, $task);
    }

    /** Delete a task. */
    public function delete(User $user, Task $task): bool
    {
        return $this->isPermitted($user, $task);
    }

    /** Restore (if SoftDeletes enabled). */
    public function restore(User $user, Task $task): bool
    {
        return $this->isPermitted($user, $task);
    }

    /** Force-delete. */
    public function forceDelete(User $user, Task $task): bool
    {
        return $this->isPermitted($user, $task);
    }
}
