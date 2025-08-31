<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ClearOversizedCookies
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        // Get the actual Cookie header as sent by browser
        $cookieHeader = $request->header('Cookie', '');
        $headerSize = strlen($cookieHeader);

        // Be very aggressive - clear if >2KB (some servers have 4KB limits)
        if ($headerSize > 2048) {
            Log::warning('Large cookie header detected, clearing cookies', [
                'size' => $headerSize,
                'cookies' => array_keys($request->cookies->all()),
                'ip' => $request->ip(),
            ]);

            // Clear all cookies except absolute essentials
            $essential = ['tp_s', 'XSRF-TOKEN'];
            $domain = $request->getHost();

            foreach ($request->cookies->all() as $name => $value) {
                if (! in_array($name, $essential)) {
                    $request->cookies->remove($name);

                    // Aggressively clear cookie with multiple variations
                    setcookie($name, '', time() - 3600, '/', $domain);
                    setcookie($name, '', time() - 3600, '/', '.'.$domain);
                    setcookie($name, '', time() - 3600, '/');
                    setcookie($name, '', time() - 3600);
                }
            }
        }

        $response = $next($request);

        // Add comprehensive diagnostic headers
        $response->headers->set('X-Debug-Cookie-Len', (string) $headerSize);
        $response->headers->set('X-Debug-Cookie-Count', count($request->cookies->all()));

        if ($headerSize > 4096) {
            $response->headers->set('X-Debug-Cookie-Warning', 'OVERSIZED-DANGER');
        } elseif ($headerSize > 2048) {
            $response->headers->set('X-Debug-Cookie-Warning', 'LARGE');
        }

        return $response;
    }
}
