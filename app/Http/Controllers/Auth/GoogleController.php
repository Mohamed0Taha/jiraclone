<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Laravel\Socialite\Contracts\Provider;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\RedirectResponse;
use App\Models\User;

class GoogleController extends Controller
{
    /**
     * Redirect the user to the Google authentication page.
     */
    public function redirectToGoogle(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Obtain the user information from Google.
     */
    public function handleGoogleCallback(): RedirectResponse
    {
        // Get the Google provider instance
        /** @var \Laravel\Socialite\Two\GoogleProvider $provider */
        $provider = Socialite::driver('google');
        
        // Use stateless mode to avoid session storage
        $gUser = $provider->stateless()->user();

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
