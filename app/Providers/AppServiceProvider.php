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
use Illuminate\Auth\Notifications\VerifyEmail; // ⬅️ add
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
        if (class_exists(\Laravel\Socialite\SocialiteServiceProvider::class)) {
            $this->app->register(\Laravel\Socialite\SocialiteServiceProvider::class);
        }
    }

    public function boot(): void
    {
        // URL configuration for different environments
        if (app()->environment('production')) {
            // Behind Heroku/Cloudflare etc.
            URL::forceScheme('https');
            if ($root = config('app.url')) {
                URL::forceRootUrl($root);
            }
        } else {
            // For local development, ensure consistent URL generation
            if ($appUrl = config('app.url')) {
                URL::forceRootUrl($appUrl);
            }
        }

        // ✅ Force all verification links to use a RELATIVE signature
        VerifyEmail::createUrlUsing(function ($notifiable) {
            $relativeUrl = URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes(config('auth.verification.expire', 60)),
                [
                    'id'   => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ],
                false // ← critical: sign as RELATIVE
            );
            
            // Return full URL by combining with app URL
            return rtrim(config('app.url'), '/') . $relativeUrl;
        });

        Vite::prefetch(concurrency: 3);

        Event::listen(TaskCreated::class, TriggerAutomations::class);
        Event::listen(TaskUpdated::class, TriggerAutomations::class);

        Inertia::share('isPro', function (): bool {
            $user = Auth::user();
            return $user && method_exists($user, 'hasActiveSubscription') && $user->hasActiveSubscription();
        });

        Inertia::share('isOnTrial', function (): bool {
            $user = Auth::user();
            return $user && method_exists($user, 'onTrial') && $user->onTrial('default');
        });

        // Share complete user plan and tier data
        Inertia::share('userPlan', function () {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            if (!$user) {
                return null;
            }

            $plan = $user->getCurrentPlan();
            $usageSummary = $user->getUsageSummary();

            return [
                'plan' => $plan,
                'has_subscription' => $user->hasActiveSubscription(),
                'usage' => $usageSummary,
                'overlays' => [
                    'ai_assistant' => $user->shouldShowOverlay('ai_assistant'),
                    'ai_chat' => $user->shouldShowOverlay('ai_chat'),
                    'automation' => $user->shouldShowOverlay('automation'),
                    'members' => $user->shouldShowOverlay('members'),
                    'reports' => $user->shouldShowOverlay('reports'),
                ],
                'billing_url' => route('billing.show'),
            ];
        });
    }
}
