<?php

namespace App\Providers;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Listeners\TriggerAutomations;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Ensure Blade directives are available even if discovery is flaky
        $this->app->register(\Inertia\ServiceProvider::class);
        $this->app->register(\Tightenco\Ziggy\ZiggyServiceProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Keep your Vite prefetch
        Vite::prefetch(concurrency: 3);

        // Register automation event listeners
        Event::listen(TaskCreated::class, TriggerAutomations::class);
        Event::listen(TaskUpdated::class, TriggerAutomations::class);

        // Share "isPro" with ALL Inertia pages.
        Inertia::share('isPro', function () {
            /** @var \App\Models\User|null $user */
            $user = Auth::user();

            if (! $user) {
                return false;
            }

            // Use Cashier's Billable::subscribed()
            if (! method_exists($user, 'subscribed')) {
                return false;
            }

            return (bool) $user->subscribed('default');
        });
    }
}
