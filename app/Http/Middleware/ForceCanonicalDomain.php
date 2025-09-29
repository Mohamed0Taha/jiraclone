<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class ForceCanonicalDomain
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->is('health')) {
            return $next($request);
        }

        $canonical = rtrim(config('app.url'), '/');
        if (! $canonical) {
            return $next($request);
        }

        $scheme = parse_url($canonical, PHP_URL_SCHEME) ?: 'https';
        $host   = parse_url($canonical, PHP_URL_HOST) ?: $request->getHost();

        if ($request->getScheme() !== $scheme || $request->getHost() !== $host) {
            $uri = $scheme.'://'.$host.$request->getRequestUri();
            return redirect()->away($uri, 301);
        }

        return $next($request);
    }
}

