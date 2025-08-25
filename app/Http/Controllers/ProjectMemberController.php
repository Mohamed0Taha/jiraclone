<?php

namespace App\Http\Controllers;

use App\Mail\ProjectAddedNotificationMail;
use App\Mail\ProjectInvitationMail;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProjectMemberController extends Controller
{
    public function index(Project $project)
    {
        Gate::authorize('view', $project);

        // Get all members with their pivot data
        $members = $project->members()->withPivot('role', 'joined_at')->get();

        // Add the project owner if they're not already in the members list
        $owner = $project->user;
        $ownerInMembers = $members->contains('id', $owner->id);

        if (! $ownerInMembers) {
            // Create a member object for the owner
            $ownerData = $owner->replicate();
            $ownerData->pivot = (object) [
                'role' => 'owner',
                'joined_at' => $project->created_at->toDateTimeString(),
            ];
            $members->prepend($ownerData);
        } else {
            // Update the existing member to show as owner
            $ownerMember = $members->where('id', $owner->id)->first();
            if ($ownerMember) {
                $ownerMember->pivot->role = 'owner';
            }
        }

        $pendingInvitations = $project->pendingInvitations()->get();

        // Compute per-project member limit based on owner's subscription plan
        [$memberLimit, $currentCount] = $this->projectMemberStats($project, $members);

        return response()->json([
            'members' => $members,
            'invitations' => $pendingInvitations,
            'limit' => $memberLimit,
            'used' => $currentCount,
            'remaining' => max(0, $memberLimit - $currentCount),
            'plan' => $project->user->getCurrentPlan(),
        ]);
    }

    public function invite(Request $request, Project $project)
    {
        Gate::authorize('update', $project);

        $request->validate([
            'email' => 'required|email',
            'role' => 'string|in:member,admin',
        ]);

        $email = $request->email;
        $role = $request->role ?? 'member';

        // Enforce per-project member limit BEFORE proceeding
        [$memberLimit, $currentCount] = $this->projectMemberStats($project);
        if ($currentCount >= $memberLimit) {
            return response()->json([
                'error' => "Member limit reached ({$currentCount}/{$memberLimit}). Upgrade your plan to add more team members.",
                'limit_reached' => true,
                'limit' => $memberLimit,
                'used' => $currentCount,
                'plan' => $project->user->getCurrentPlan(),
            ], 422);
        }

        // Check if user already has an invitation
        $existingInvitation = $project->invitations()
            ->where('email', $email)
            ->where('status', 'pending')
            ->first();

        if ($existingInvitation) {
            return response()->json([
                'error' => 'An invitation has already been sent to this email address.',
            ], 422);
        }

        // Check if user is already a member
        $existingUser = User::where('email', $email)->first();
        if ($existingUser && $project->members()->where('user_id', $existingUser->id)->exists()) {
            return response()->json([
                'error' => 'This user is already a member of the project.',
            ], 422);
        }

        // If user exists in the system, add them directly to the project (re-check limit for safety)
        if ($existingUser) {
            [$memberLimit, $currentCount] = $this->projectMemberStats($project);
            if ($currentCount >= $memberLimit) {
                return response()->json([
                    'error' => "Member limit reached ({$currentCount}/{$memberLimit}). Upgrade your plan to add more team members.",
                    'limit_reached' => true,
                    'limit' => $memberLimit,
                    'used' => $currentCount,
                    'plan' => $project->user->getCurrentPlan(),
                ], 422);
            }
            $project->members()->attach($existingUser->id, [
                'role' => $role,
                'joined_at' => now(),
            ]);

            // Send notification email to existing user about being added to project
            try {
                Mail::to($existingUser->email)->send(new ProjectAddedNotificationMail($project, $existingUser, Auth::user()));
                Log::info('Project added notification sent successfully', ['email' => $existingUser->email, 'project_id' => $project->id]);
            } catch (\Exception $e) {
                // Log email error but don't fail the invitation
                Log::warning('Failed to send project added notification', [
                    'email' => $existingUser->email,
                    'project_id' => $project->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'message' => $existingUser->name.' has been added to the project successfully! They will see this project in their dashboard.',
                'type' => 'direct_add',
                'user' => $existingUser,
            ]);
        }

    // Create invitation for non-existing user (re-check not necessary unless race conditions)
        $invitation = $project->invitations()->create([
            'invited_by' => Auth::id(),
            'email' => $email,
            'token' => Str::random(64),
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);

        // Send invitation email
        try {
            Mail::to($email)->send(new ProjectInvitationMail($invitation));
            Log::info('Invitation email sent successfully', ['email' => $email, 'project_id' => $project->id]);
        } catch (\Exception $e) {
            Log::error('Failed to send invitation email', [
                'email' => $email,
                'project_id' => $project->id,
                'error' => $e->getMessage(),
            ]);
            // Don't fail the invitation creation, just log the error
        }

        return response()->json([
            'message' => 'Invitation sent successfully.',
            'type' => 'invitation_sent',
            'invitation' => $invitation,
        ]);
    }

    public function remove(Request $request, Project $project)
    {
        Gate::authorize('update', $project);

        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $userId = $request->user_id;

        // Prevent removing the project owner
        if ($project->user_id == $userId) {
            return response()->json([
                'error' => 'Cannot remove the project owner.',
            ], 422);
        }

        $project->members()->detach($userId);

        return response()->json([
            'message' => 'Member removed successfully.',
        ]);
    }

    public function cancelInvitation(Request $request, Project $project)
    {
        Gate::authorize('update', $project);

        $request->validate([
            'invitation_id' => 'required|exists:project_invitations,id',
        ]);

        $invitation = $project->invitations()->findOrFail($request->invitation_id);
        $invitation->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Invitation cancelled successfully.',
        ]);
    }

    public function acceptInvitation($token)
    {
        $invitation = ProjectInvitation::where('token', $token)
            ->where('status', 'pending')
            ->firstOrFail();

        if ($invitation->isExpired()) {
            return Inertia::render('Errors/InvitationExpired');
        }

        $user = Auth::user();

        if (! $user) {
            // Store invitation token in session and redirect to registration
            session(['invitation_token' => $token, 'invitation_email' => $invitation->email]);

            return redirect()->route('register')->with([
                'message' => 'Please create an account to join the project: '.$invitation->project->name,
                'prefill_email' => $invitation->email,
            ]);
        }

        // Check if the invitation email matches the logged-in user
        if ($user->email !== $invitation->email) {
            return Inertia::render('Errors/InvitationMismatch', [
                'invitationEmail' => $invitation->email,
                'userEmail' => $user->email,
            ]);
        }

        // Check if user is already a member
        if ($invitation->project->members()->where('user_id', $user->id)->exists()) {
            return redirect()->route('projects.show', $invitation->project)
                ->with('info', 'You are already a member of this project!');
        }

        // Add user to project
        $invitation->project->members()->attach($user->id, [
            'role' => 'member',
            'joined_at' => now(),
        ]);

        // Mark invitation as accepted
        $invitation->update([
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);

        return redirect()->route('projects.show', $invitation->project)
            ->with('success', 'Welcome to the project! You have successfully joined '.$invitation->project->name);
    }

    /**
     * Determine member limit for a project based on the owner's subscription plan.
     * Returns array: [limit, usedCount]
     * usedCount counts total distinct people on the project including the owner.
     */
    private function projectMemberStats(Project $project, $preloadedMembers = null): array
    {
        $plan = $project->user->getCurrentPlan();
        $limits = [
            'free' => 1,       // owner only
            'basic' => 2,      // owner + 1
            'pro' => 5,        // total
            'business' => 15,  // total
        ];
        $limit = $limits[$plan] ?? 1;

        if ($preloadedMembers) {
            // $preloadedMembers excludes owner typically, so count +1
            // Detect if owner already injected into collection (pivot role owner)
            $hasOwner = $preloadedMembers->contains('id', $project->user_id);
            $used = $preloadedMembers->count();
            if (! $hasOwner) {
                $used += 1; // add owner
            }
        } else {
            // Count distinct members + owner if not present
            $memberIds = $project->members()->pluck('users.id')->unique();
            $used = $memberIds->contains($project->user_id) ? $memberIds->count() : ($memberIds->count() + 1);
        }

        return [$limit, $used];
    }
}
