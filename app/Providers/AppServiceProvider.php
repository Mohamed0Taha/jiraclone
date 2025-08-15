<?php

namespace App\Providers;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Listeners\TriggerAutomations;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Inertia
        if (class_exists(\Inertia\ServiceProvider::class)) {
            $this->app->register(\Inertia\ServiceProvider::class);
        }

        // Ziggy
        if (class_exists(\Tighten\Ziggy\ZiggyServiceProvider::class)) {
            $this->app->register(\Tighten\Ziggy\ZiggyServiceProvider::class);
        }

        // Socialite (usually auto-discovered, but explicit is fine)
        if (class_exists(\Laravel\Socialite\SocialiteServiceProvider::class)) {
            $this->app->register(\Laravel\Socialite\SocialiteServiceProvider::class);
        }
    }

    public function boot(): void
    {
        // Ensure signed URLs validate correctly behind proxies (Heroku/Cloudflare)
        if (app()->environment('production')) {
            URL::forceScheme('https');

            // Only force a root URL if APP_URL is set, to avoid CLI/testing oddities
            if ($root = config('app.url')) {
                URL::forceRootUrl($root);
            }
        }

        // Prefetch built assets
        Vite::prefetch(concurrency: 3);

        // Domain events
        Event::listen(TaskCreated::class, TriggerAutomations::class);
        Event::listen(TaskUpdated::class, TriggerAutomations::class);

        // Shared prop for all Inertia pages (Cashier-safe)
        Inertia::share('isPro', function (): bool {
            $user = Auth::user();
            return $user && method_exists($user, 'subscribed') && $user->subscribed('default');
        });
    }
}
