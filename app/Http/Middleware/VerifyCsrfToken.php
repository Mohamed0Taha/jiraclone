<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    /**
     * URIs that should be excluded from CSRF verification.
     *
     * Only include endpoints that are called by third-party webhooks
     * or that you have explicitly decided to protect by other means.
     */
    protected $except = [
        // Payment provider webhooks
        'stripe/*',

        // TEMPORARY: AI preview endpoint (excluded to bypass CSRF while debugging prod issues)
        // Remove this once the client reliably sends the CSRF token.
        'projects/*/tasks/ai/preview',
    ];
}
