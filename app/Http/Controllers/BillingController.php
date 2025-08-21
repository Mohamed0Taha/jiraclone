<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class BillingController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $plans = config('subscriptions.plans');

        $currentSubscription = $user->subscription('default');
        $isOnTrial = $currentSubscription && $currentSubscription->onTrial();
        $trialEndsAt = $currentSubscription?->trial_ends_at;

        return Inertia::render('Billing/Overview', [
            'user' => $user,
            'plans' => collect($plans)->map(fn ($p) => [
                'name' => $p['name'],
                'price_id' => $p['price_id'],
                'features' => $p['features'],
                'trial_days' => $p['trial_days'] ?? 0,
            ])->values(),
            'current' => [
                'subscribed' => $user->subscribed('default'),
                'on_trial' => $isOnTrial,
                'on_grace' => $currentSubscription?->onGracePeriod() ?? false,
                'ends_at' => optional($currentSubscription?->ends_at)->toIso8601String(),
                'trial_ends_at' => optional($trialEndsAt)->toIso8601String(),
                'plan_price_id' => $currentSubscription?->stripe_price,
            ],
            'trial_eligibility' => [
                'has_used_trial' => $user->trial_used ?? false,
                'trial_plan' => $user->trial_plan,
            ],
            'stripe_key' => config('cashier.key'),
        ]);
    }

    public function createCheckout(Request $request)
    {
        $request->validate([
            'price_id' => 'required|string',
        ]);

        $priceId = $request->input('price_id');
        $user = $request->user();

        if ($user->subscribed('default')) {
            return back()->with('info', 'You already have an active subscription.');
        }

        // Find the plan configuration to get trial days
        $plans = config('subscriptions.plans');
        $planConfig = null;
        $planKey = null;
        foreach ($plans as $key => $plan) {
            if ($plan['price_id'] === $priceId) {
                $planConfig = $plan;
                $planKey = $key;
                break;
            }
        }

        if (! $planConfig) {
            return back()->with('error', 'Invalid plan selected.');
        }

        $trialDays = $planConfig['trial_days'] ?? 0;

        // Check if user has already used a trial for this plan or any plan
        if ($trialDays > 0 && $user->trial_used) {
            // No trial, go straight to subscription
            $trialDays = 0;
        }

        // Create a subscription with trial
        $subscriptionBuilder = $user->newSubscription('default', $priceId);

        if ($trialDays > 0) {
            $subscriptionBuilder->trialDays($trialDays);

            // Mark trial as used and track which plan
            $user->update([
                'trial_used' => true,
                'trial_plan' => $planKey,
            ]);
        }

        try {
            $checkout = $subscriptionBuilder->checkout([
                'success_url' => route('billing.show').'?checkout=success',
                'cancel_url' => route('billing.show').'?checkout=cancel',
            ]);

            // Redirect to Stripe-hosted checkout
            return Inertia::location($checkout->url);
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            // If customer doesn't exist, clear the stripe_id and try again
            if (str_contains($e->getMessage(), 'No such customer')) {
                \Log::info('Clearing invalid Stripe customer ID for user: ' . $user->id);
                $user->update(['stripe_id' => null]);
                
                // Retry the checkout with cleared customer ID
                $checkout = $subscriptionBuilder->checkout([
                    'success_url' => route('billing.show').'?checkout=success',
                    'cancel_url' => route('billing.show').'?checkout=cancel',
                ]);
                
                return Inertia::location($checkout->url);
            }
            
            // Re-throw other Stripe exceptions
            throw $e;
        }
    }

    public function portal(Request $request)
    {
        $user = $request->user();

        if (! $user->hasStripeId()) {
            return back()->with('error', 'No Stripe customer found.');
        }

        $session = $user->redirectToBillingPortal(route('billing.show'));

        return Inertia::location($session);
    }

    public function cancel(Request $request)
    {
        $user = $request->user();
        $sub = $user->subscription('default');
        if (! $sub) {
            return back()->with('error', 'No active subscription.');
        }
        $sub->cancel(); // ends at period end (grace period)

        return back()->with('success', 'Subscription will end at period end.');
    }

    public function resume(Request $request)
    {
        $user = $request->user();
        $sub = $user->subscription('default');

        if (! $sub || ! $sub->onGracePeriod()) {
            return back()->with('error', 'No cancellable subscription in grace period.');
        }

        $sub->resume();

        return back()->with('success', 'Subscription resumed.');
    }
}
