<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirectToGoogle()
    {
        // stateless avoids "Invalid state" if sessions/cookies are tricky in prod
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function handleGoogleCallback()
    {
        $google = Socialite::driver('google')->stateless()->user();

        $user = User::firstOrCreate(
            ['email' => $google->getEmail()],
            [
                'name'               => $google->getName() ?: ($google->getNickname() ?: 'Google User'),
                'password'           => Hash::make(Str::random(40)),
                'email_verified_at'  => now(),
            ]
        );

        Auth::login($user, remember: true);

        // IMPORTANT: do NOT use ->intended(); it may contain the wrong host
        return to_route('dashboard');
    }
}
