<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirectToGoogle()
    {
        // stateless() avoids CSRF/state issues behind proxies
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function handleGoogleCallback(Request $request)
    {
        $g = Socialite::driver('google')->stateless()->user();

        $user = User::where('email', $g->getEmail())->first();

        if (! $user) {
            $user = User::create([
                'name' => $g->getName() ?: $g->getNickname() ?: 'Google User',
                'email' => $g->getEmail(),
                'password' => bcrypt(Str::random(40)),
                'google_id' => $g->getId(),
                'google_avatar' => $g->getAvatar(),
                'google_token' => $g->token ?? null,
                'google_refresh_token' => $g->refreshToken ?? null,
            ]);

            // 🔔 Trigger ONE verification email via the framework
            event(new Registered($user));
        } else {
            // Keep profile fresh
            $user->forceFill([
                'google_id' => $g->getId(),
                'google_avatar' => $g->getAvatar(),
                'google_token' => $g->token ?? $user->google_token,
                'google_refresh_token' => $g->refreshToken ?? $user->google_refresh_token,
            ])->save();

            // ❌ Do NOT send verification here; the Registered event already handles it at account creation.
        }

        Auth::login($user, remember: true);

        // If not verified, show the “verify email” notice (no re-send here)
        if (! $user->hasVerifiedEmail()) {
            return redirect()->route('verification.notice');
        }

        return redirect()->intended('/dashboard');
    }
}
