<?php

namespace App\Http\Middleware;

use App\Models\ProjectInvitation;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class HandleInvitationAfterRegistration
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Check if user just registered and has an invitation token in session
        if (Auth::check() && session()->has('invitation_token')) {
            $token = session('invitation_token');
            $invitationEmail = session('invitation_email');
            
            $user = Auth::user();
            
            // Only process if emails match
            if ($user->email === $invitationEmail) {
                $invitation = ProjectInvitation::where('token', $token)
                    ->where('status', 'pending')
                    ->where('email', $user->email)
                    ->first();
                
                if ($invitation && !$invitation->isExpired()) {
                    // Check if user is not already a member
                    if (!$invitation->project->members()->where('user_id', $user->id)->exists()) {
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

                        // Clear session data
                        session()->forget(['invitation_token', 'invitation_email']);
                        
                        // Set success message for next request
                        session()->flash('success', 'Welcome! You have been automatically added to the project: ' . $invitation->project->name);
                    }
                }
            }
            
            // Clear session data if it wasn't processed
            session()->forget(['invitation_token', 'invitation_email']);
        }

        return $response;
    }
}
