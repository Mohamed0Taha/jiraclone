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
    protected function googleDriver(?array $scopes = null)
    {
        $scopes = $scopes ?? $this->loginScopes();

        $driver = Socialite::driver('google')
            ->stateless()
            ->scopes($scopes);

        if ($this->requiresOfflineAccess($scopes)) {
            $driver = $driver->with([
                'access_type' => 'offline',
                'prompt' => 'consent',
            ]);
        }

        return $driver;
    }

    protected function loginScopes(): array
    {
        $scopes = ['openid', 'profile', 'email'];

        if (config('services.google.calendar_scope_on_login')) {
            $scopes[] = 'https://www.googleapis.com/auth/calendar';
        }

        return $scopes;
    }

    protected function requiresOfflineAccess(array $scopes): bool
    {
        return in_array('https://www.googleapis.com/auth/calendar', $scopes, true);
    }

    public function redirectToGoogle()
    {
        // stateless() avoids CSRF/state issues behind proxies
        return $this->googleDriver()->redirect();
    }

    public function handleGoogleCallback(Request $request)
    {
        $g = $this->googleDriver()->user();

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
