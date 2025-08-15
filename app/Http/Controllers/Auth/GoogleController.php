<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Models\User;

class GoogleController extends Controller
{
    public function redirectToGoogle()
    {
        // keep stateful now that HTTPS/proxy is fixed
        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback(Request $request)
    {
        $g = Socialite::driver('google')->user();

        // Find by email
        $user = User::firstWhere('email', $g->getEmail());

        if (! $user) {
            // Create WITHOUT verifying email
            $user = User::create([
                'name'     => $g->getName() ?: $g->getNickname() ?: 'Google User',
                'email'    => $g->getEmail(),
                'password' => bcrypt(Str::random(40)),
                // keep email_verified_at NULL (default)
                'google_id' => $g->getId(),
            ]);
        } else {
            // Optionally keep a reference to Google
            if (empty($user->google_id)) {
                $user->google_id = $g->getId();
                $user->save();
            }
        }

        Auth::login($user, remember: true);

        if (! $user->hasVerifiedEmail()) {
            // Send (or re-send) verification email and show the notice page
            $user->sendEmailVerificationNotification();
            return redirect()->route('verification.notice');
        }

        return redirect()->intended(route('dashboard'));
    }
}
