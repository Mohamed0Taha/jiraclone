<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class GoogleController extends Controller
{
    // Step-1: send user to Google
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->redirect();
    }

    // Step-2: handle callback
    public function handleGoogleCallback()
    {
        $gUser = Socialite::driver('google')->stateless()->user();

        $user = User::firstOrCreate(
            ['email' => $gUser->getEmail()],
            [
                'name'     => $gUser->getName() ?: $gUser->getNickname(),
                'password' => bcrypt(uniqid()), // random placeholder
            ]
        );

        Auth::login($user);

        return redirect()->route('dashboard');
    }
}
