<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class OwnerOnly
{
    /**
     * Restrict access to a hard-coded list of privileged owner emails.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::check()) {
            return redirect()->route('login');
        }

        $allowed = array_filter(array_map('trim', explode(',', (string) config('app.owner_emails'))));
        if (empty($allowed)) {
            // fallback single owner (adjust as needed)
            $allowed = ['mohamed.taha@taskpilot.us'];
        }

        $email = strtolower(Auth::user()->email);
        $allowedLower = array_map('strtolower', $allowed);
        if (! in_array($email, $allowedLower, true)) {
            abort(403, 'Unauthorized dev tool access.');
        }

        return $next($request);
    }
}
