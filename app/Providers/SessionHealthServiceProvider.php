<?php

namespace App\Providers;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;

class SessionHealthServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Hard safety net: NEVER allow 'cookie' session driver in production – it inflates request headers.
        $driver = config('session.driver');
        if (app()->environment('production') && $driver === 'cookie') {
            Log::warning('Overriding cookie session driver to database to prevent oversized Cookie headers');
            config(['session.driver' => 'database']);
        }

        // Enforce short session cookie name to minimize header size.
        $current = config('session.cookie');
        if (strlen($current) > 6) {
            config(['session.cookie' => 'tp_s']);
        }
    }
}
