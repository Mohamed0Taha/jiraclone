<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\ProjectInvitation;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        // Check if there's an invitation token in the URL or session
        $invitationEmail = session('invitation_email', request('email'));

        return Inertia::render('Auth/Register', [
            'invitationEmail' => $invitationEmail,
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        event(new Registered($user));

        Auth::login($user);

        // Handle invitation acceptance after registration
        $redirectToProject = $this->handleInvitationAcceptance($user);

        // If user was invited to a project, redirect there instead of dashboard
        if ($redirectToProject) {
            return $redirectToProject;
        }

        return redirect(route('dashboard', absolute: false));
    }

    /**
     * Handle invitation acceptance for newly registered users
     */
    private function handleInvitationAcceptance(User $user)
    {
        // Check for invitation token in session
        $token = session('invitation_token');
        $invitationEmail = session('invitation_email');

        if ($token && $invitationEmail && $user->email === $invitationEmail) {
            $invitation = ProjectInvitation::where('token', $token)
                ->where('status', 'pending')
                ->where('email', $user->email)
                ->first();

            if ($invitation && ! $invitation->isExpired()) {
                try {
                    // Use database transaction to ensure consistency
                    $result = DB::transaction(function () use ($invitation, $user) {
                        // Check if user is not already a member
                        if (! $invitation->project->members()->where('user_id', $user->id)->exists()) {
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

                            return true;
                        }

                        return false;
                    });

                    if ($result) {
                        Log::info('User automatically added to project after registration', [
                            'user_id' => $user->id,
                            'email' => $user->email,
                            'project_id' => $invitation->project->id,
                            'project_name' => $invitation->project->name,
                        ]);

                        // Clear session data
                        session()->forget(['invitation_token', 'invitation_email']);

                        // Redirect to dashboard with success message
                        return redirect(route('dashboard', absolute: false))
                            ->with('success', 'Welcome! You have been automatically added to the project: '.$invitation->project->name);
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to add user to project after registration', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'invitation_id' => $invitation->id,
                        'error' => $e->getMessage(),
                    ]);
                }

                // Clear session data even if there was an error
                session()->forget(['invitation_token', 'invitation_email']);
            }
        }

        return null; // No special redirect needed
    }
}
