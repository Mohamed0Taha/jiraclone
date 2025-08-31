<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PreventOversizedHeaders
{
    /**
     * Handle an incoming request - runs VERY early to prevent header size issues.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Get raw Cookie header as sent by browser (before Laravel processes it)
        $cookieHeader = $_SERVER['HTTP_COOKIE'] ?? '';
        $headerSize = strlen($cookieHeader);

        // If header is dangerously large, immediately clear cookies and redirect
        if ($headerSize > 4096) {
            // Emergency cookie clearing - clear ALL cookies
            if ($cookieHeader) {
                $cookiePairs = explode(';', $cookieHeader);
                foreach ($cookiePairs as $pair) {
                    $parts = explode('=', trim($pair), 2);
                    $name = trim($parts[0] ?? '');

                    if ($name) {
                        // Clear with all possible variations
                        $domain = $request->getHost();
                        setcookie($name, '', time() - 3600, '/', $domain);
                        setcookie($name, '', time() - 3600, '/', '.'.$domain);
                        setcookie($name, '', time() - 3600, '/');
                        setcookie($name, '', time() - 3600);
                    }
                }
            }

            // Return a response that will trigger browser to reload with cleared cookies
            return response()->view('cookie-cleanup', [
                'headerSize' => $headerSize,
                'redirectUrl' => $request->url(),
            ], 200);
        }

        return $next($request);
    }
}
