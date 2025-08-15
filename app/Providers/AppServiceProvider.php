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

        // Socialite — explicit is fine (auto-discovery usually handles it)
        if (class_exists(\Laravel\Socialite\SocialiteServiceProvider::class)) {
            $this->app->register(\Laravel\Socialite\SocialiteServiceProvider::class);
        }
    }

    public function boot(): void
    {
        // ✅ Critical for Heroku/any proxy: ensure signed URLs match the public host & https
        if (app()->environment('production')) {
            URL::forceScheme('https');
            if ($root = config('app.url')) {
                URL::forceRootUrl($root);
            }
        }

        // Prefetch built assets
        Vite::prefetch(concurrency: 3);

        // Domain events
        Event::listen(TaskCreated::class, TriggerAutomations::class);
        Event::listen(TaskUpdated::class, TriggerAutomations::class);

        // Shared prop for all Inertia pages (guard for environments without Cashier)
        Inertia::share('isPro', function (): bool {
            /** @var \App\Models\User|null $user */
            $user = Auth::user();
            return $user && method_exists($user, 'subscribed') && $user->subscribed('default');
        });
    }
}
