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
     * View a single project – allowed if the user owns it.
     */
    public function view(User $user, Project $project)
{
    // This should return true if user can view the project
    // Common implementations:
    return $user->id === $project->user_id; // If project has user_id
    // OR
    return $project->users()->where('user_id', $user->id)->exists(); // If many-to-many
}

    /**
     * Create a project – any authenticated user can.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Update the project – only the owner.
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
