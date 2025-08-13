<?php

namespace App\Providers;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Listeners\TriggerAutomations;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Laravel\Cashier\Billable;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Inertia (explicit so it works in all environments)
        if (class_exists(\Inertia\ServiceProvider::class)) {
            $this->app->register(\Inertia\ServiceProvider::class);
        }

        // Ziggy (route() helper for JS)
        if (class_exists(\Tighten\Ziggy\ZiggyServiceProvider::class)) {
            $this->app->register(\Tighten\Ziggy\ZiggyServiceProvider::class);
        }

        // Socialite (Google auth, etc.)
        if (class_exists(\Laravel\Socialite\SocialiteServiceProvider::class)) {
            $this->app->register(\Laravel\Socialite\SocialiteServiceProvider::class);
        }
    }

    public function boot(): void
    {
        /**
         * Ensure correct URL generation behind Heroku’s proxy:
         * - Force the application root URL to APP_URL (host + scheme)
         * - Force HTTPS scheme in production (prevents mixed content and CSRF/session issues)
         */
        if (app()->environment('production')) {
            $appUrl = (string) config('app.url', '');
            if ($appUrl !== '') {
                URL::forceRootUrl($appUrl);
            }
            URL::forceScheme('https');
        }

        // Hint the browser to prefetch Vite-managed assets
        Vite::prefetch(concurrency: 3);

        // Domain events → automations
        Event::listen(TaskCreated::class, TriggerAutomations::class);
        Event::listen(TaskUpdated::class, TriggerAutomations::class);

        // Global Inertia shares
        Inertia::share([
            // Expose whether the current user has an active subscription
            'isPro' => function () {
                /** @var User|null $user */
                $user = Auth::user();

                if (!$user || !method_exists($user, 'subscribed')) {
                    return false;
                }

                /** @var User&Billable $user */
                return (bool) $user->subscribed('default');
            },

            // Expose CSRF token to the SPA as a prop (handy in addition to the meta tag)
            'csrfToken' => function () {
                return csrf_token();
            },
        ]);
    }
}
