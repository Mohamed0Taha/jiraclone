<?php

namespace App\Providers;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Listeners\TriggerAutomations;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;
use Laravel\Cashier\Billable;
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
        // Force HTTPS in production (fixes mixed content & callback URL)
        if (app()->environment('production')) {
            URL::forceScheme('https');
        }

        // Assets prefetch
        Vite::prefetch(concurrency: 3);

        // Automation events
        Event::listen(TaskCreated::class, TriggerAutomations::class);
        Event::listen(TaskUpdated::class, TriggerAutomations::class);

        // Shared prop for all Inertia pages
        Inertia::share('isPro', function () {
            /** @var User|null $user */
            $user = Auth::user();

            // Check if user exists and has Cashier's Billable trait
            if (!$user || !method_exists($user, 'subscribed')) {
                return false;
            }

            // The subscribed method exists via Laravel Cashier's Billable trait
            /** @var User&Billable $user */
            return (bool) $user->subscribed('default');
        });
    }
}
