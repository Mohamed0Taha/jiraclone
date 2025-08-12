<?php

namespace App\Providers;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Listeners\TriggerAutomations;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;   // ⬅️ add this
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        if (class_exists(\Inertia\ServiceProvider::class)) {
            $this->app->register(\Inertia\ServiceProvider::class);
        }
        if (class_exists(\Tighten\Ziggy\ZiggyServiceProvider::class)) {
            $this->app->register(\Tighten\Ziggy\ZiggyServiceProvider::class);
        }
    }

    public function boot(): void
    {
        // Force all generated URLs (routes/assets/prefetch) to https in production
        if (app()->environment('production')) {
            URL::forceScheme('https');
        }

        // Your prefetch + events + shared props
        Vite::prefetch(concurrency: 3);

        Event::listen(TaskCreated::class, TriggerAutomations::class);
        Event::listen(TaskUpdated::class, TriggerAutomations::class);

        Inertia::share('isPro', function () {
            $user = Auth::user();
            if (! $user || ! method_exists($user, 'subscribed')) {
                return false;
            }
            return (bool) $user->subscribed('default');
        });
    }
}
