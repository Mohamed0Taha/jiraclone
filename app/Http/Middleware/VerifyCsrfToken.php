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

        // AI endpoints that may have CSRF issues with custom domain
        'projects/*/tasks/ai/preview',
        'projects/*/tasks/ai/generate',
        'projects/*/tasks/ai/accept',
        'projects/*/tasks/ai/reject',
        'projects/*/assistant/chat',
        'projects/*/assistant/execute',
    ];
}
