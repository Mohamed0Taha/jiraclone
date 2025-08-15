<?php

namespace App\Providers;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Listeners\TriggerAutomations;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;
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

        // ✅ Socialite (explicitly register so the container can resolve it in prod)
        if (class_exists(\Laravel\Socialite\SocialiteServiceProvider::class)) {
            $this->app->register(\Laravel\Socialite\SocialiteServiceProvider::class);
        }
    }

    public function boot(): void
    {
        // Force HTTPS and root URL in production (fixes signed URL validation behind proxies like Heroku/Cloudflare)
        if (app()->environment('production')) {
            URL::forceScheme('https');
            if ($root = config('app.url')) {
                URL::forceRootUrl($root);
            }
        }

        // Assets prefetch
        Vite::prefetch(concurrency: 3);

        // Automation events
        Event::listen(TaskCreated::class, TriggerAutomations::class);
        Event::listen(TaskUpdated::class, TriggerAutomations::class);

        // Shared prop for all Inertia pages
        Inertia::share('isPro', function () {
            $user = Auth::user();

            return $user && method_exists($user, 'subscribed') && call_user_func([$user, 'subscribed'], 'default')
                ? true
                : false;
        });
    }
}
