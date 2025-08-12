<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * Where to send guests who aren't authenticated.
     */
    protected function redirectTo($request): ?string
    {
        if (! $request->expectsJson()) {
            // Point to our named "login" route, which forwards to Google OAuth.
            return route('login');
        }

        return null;
    }
}
