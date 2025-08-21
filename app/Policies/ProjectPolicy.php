<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    /**
     * View any projects – only needed if you use a global list; otherwise keep false.
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    /**
     * View a single project – allowed if the user owns it or is a member.
     */
    public function view(User $user, Project $project)
    {
        // Allow if user is the owner
        if ($user->id === $project->user_id) {
            return true;
        }

        // Allow if user is a member of the project
        return $project->members()->where('user_id', $user->id)->exists();
    }

    /**
     * Create a project – any authenticated user can.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Update the project – only the owner (members can't edit project settings).
     */
    public function update(User $user, Project $project): bool
    {
        return $user->id === $project->user_id;
    }

    /**
     * Delete the project – only the owner.
     */
    public function delete(User $user, Project $project): bool
    {
        return $user->id === $project->user_id;
    }

    /**
     * Restore / force-delete – same rule as delete.
     */
    public function restore(User $user, Project $project): bool
    {
        return $user->id === $project->user_id;
    }

    public function forceDelete(User $user, Project $project): bool
    {
        return $user->id === $project->user_id;
    }
}
