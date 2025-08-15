<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function handleGoogleCallback()
    {
        $google = Socialite::driver('google')->stateless()->user();

        // Create or update the user
        $user = User::updateOrCreate(
            ['email' => $google->getEmail()],
            [
                'name'     => $google->getName() ?: ($google->getNickname() ?: 'Google User'),
                'password' => Hash::make(Str::random(40)),
            ]
        );

        // Ensure they are marked verified
        if (is_null($user->email_verified_at)) {
            // If your User model uses MustVerifyEmail, this also fires events:
            if (method_exists($user, 'markEmailAsVerified')) {
                $user->markEmailAsVerified();
            } else {
                $user->forceFill(['email_verified_at' => now()])->save();
            }
        }

        Auth::login($user, remember: true);

        // Always go to the dashboard on the current host
        return to_route('dashboard');
    }
}
