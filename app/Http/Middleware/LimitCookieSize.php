<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Cookie;

class LimitCookieSize
{
    /**
     * Handle an outgoing response to limit cookie sizes.
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Check outgoing cookies and remove/truncate oversized ones
        if (method_exists($response, 'headers') && $response->headers) {
            $cookies = $response->headers->getCookies();

            foreach ($cookies as $cookie) {
                $cookieString = (string) $cookie;

                // If any single cookie is > 1KB, it's dangerous
                if (strlen($cookieString) > 1024) {
                    // Remove this cookie entirely
                    $response->headers->removeCookie(
                        $cookie->getName(),
                        $cookie->getPath(),
                        $cookie->getDomain()
                    );

                    // Log the removal
                    Log::warning('Removed oversized cookie', [
                        'name' => $cookie->getName(),
                        'size' => strlen($cookieString),
                        'path' => $cookie->getPath(),
                        'domain' => $cookie->getDomain(),
                    ]);
                }
            }

            // Calculate total header size
            $totalCookieSize = 0;
            foreach ($response->headers->getCookies() as $cookie) {
                $totalCookieSize += strlen((string) $cookie);
            }

            // Add debug header for outgoing cookies
            $response->headers->set('X-Debug-Outgoing-Cookie-Size', $totalCookieSize);

            // If total cookie size is still too large, clear all non-essential cookies
            if ($totalCookieSize > 2048) {
                $essential = ['tp_s', 'XSRF-TOKEN'];

                foreach ($response->headers->getCookies() as $cookie) {
                    if (! in_array($cookie->getName(), $essential)) {
                        $response->headers->removeCookie(
                            $cookie->getName(),
                            $cookie->getPath(),
                            $cookie->getDomain()
                        );
                    }
                }
            }
        }

        return $response;
    }
}
