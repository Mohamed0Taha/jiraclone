<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscription
{
    /**
     * Handle an incoming request for features with tier restrictions.
     */
    public function handle(Request $request, Closure $next, ?string $feature = null): Response
    {
        $user = $request->user();

        if (! $user) {
            return $this->handleUnauthorized($request, 'authentication_required');
        }

        // If no specific feature is specified, just continue
        if (! $feature) {
            return $next($request);
        }

        // Check feature access based on user's tier
        if (! $user->canAccessFeature($feature)) {
            return $this->handleFeatureRestriction($request, $feature, $user);
        }

        // Special case: AI chat should show overlay for free users
        if ($feature === 'ai_chat' && $user->shouldShowOverlay('ai_chat')) {
            return $this->handleFeatureRestriction($request, $feature, $user);
        }

        // Check usage limits for features that have them
        if ($this->hasUsageLimit($feature) && ! $user->canUseFeature($feature)) {
            return $this->handleUsageLimitExceeded($request, $feature, $user);
        }

        return $next($request);
    }

    /**
     * Check if feature has usage limits
     */
    private function hasUsageLimit(string $feature): bool
    {
        return in_array($feature, ['ai_tasks', 'ai_chat', 'reports']);
    }

    /**
     * Handle feature restriction (for disabled features)
     */
    private function handleFeatureRestriction(Request $request, string $feature, $user)
    {
        $messages = [
            'automation' => 'Automations are only available on paid plans.',
            'members' => 'Team collaboration is only available on paid plans.',
            'reports' => 'Reports are only available on paid plans.',
            'ai_assistant' => 'AI Assistant requires a paid plan.',
        ];

        $message = $messages[$feature] ?? 'This feature requires a paid subscription.';

        if ($request->expectsJson() || $request->header('X-Inertia')) {
            return response()->json([
                'message' => $message,
                'feature_disabled' => true,
                'feature' => $feature,
                'show_overlay' => $user->shouldShowOverlay($feature),
                'upgrade_url' => route('billing.show'),
            ], 402);
        }

        return redirect()->route('billing.show')->with('error', $message);
    }

    /**
     * Handle usage limit exceeded
     */
    private function handleUsageLimitExceeded(Request $request, string $feature, $user)
    {
        $messages = [
            'ai_tasks' => 'You have reached your AI task generation limit for this month.',
            'ai_chat' => 'You have reached your AI chat limit for this month.',
            'reports' => 'You have reached your reports limit for this month.',
        ];

        $message = $messages[$feature] ?? 'You have reached your limit for this feature.';

        if ($request->header('X-Inertia')) {
            // For Inertia requests, redirect back with flash data so UI can show overlay instead of JSON error page
            return redirect()->back()->with([
                'limit_exceeded' => true,
                'feature' => $feature,
                'message' => $message.' Upgrade for more access.',
                'upgrade_url' => route('billing.show'),
                'usage' => $user->getUsageSummary()[$feature] ?? null,
                'show_overlay' => true,
            ]);
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message.' Upgrade for more access.',
                'limit_exceeded' => true,
                'feature' => $feature,
                'usage' => $user->getUsageSummary()[$feature] ?? null,
                'upgrade_url' => route('billing.show'),
            ], 402);
        }

        return redirect()->route('billing.show')->with('error', $message.' Upgrade for more access.');
    }

    /**
     * Handle authentication required
     */
    private function handleUnauthorized(Request $request, string $reason)
    {
        if ($request->expectsJson() || $request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Authentication required',
                'login_required' => true,
            ], 401);
        }

        return redirect()->route('login');
    }
}
