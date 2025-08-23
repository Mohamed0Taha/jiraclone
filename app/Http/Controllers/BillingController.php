<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Stripe\StripeClient;

class BillingController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $plans = config('subscriptions.plans');

        $currentSubscription = $user->subscription('default');
        $isOnTrial = $currentSubscription && $currentSubscription->onTrial();
        $trialEndsAt = $currentSubscription?->trial_ends_at;

        // Fetch live prices from Stripe
        $plansWithPrices = collect($plans)->map(function ($plan, $key) {
            $priceData = $this->getStripePriceData($plan['price_id']);

            return [
                'name' => $plan['name'],
                'key' => $key, // Add the plan key for better identification
                'price_id' => $plan['price_id'],
                'features' => $plan['features'],
                'trial_days' => $plan['trial_days'] ?? 0,
                'price' => $priceData['price'] ?? 0,
                'currency' => $priceData['currency'] ?? 'usd',
                'interval' => $priceData['interval'] ?? 'month',
            ];
        })->values();

        return Inertia::render('Billing/Overview', [
            'user' => $user,
            'plans' => $plansWithPrices,
            'current' => [
                'subscribed' => $user->subscribed('default'),
                'on_trial' => $isOnTrial,
                'on_grace' => $currentSubscription?->onGracePeriod() ?? false,
                'ends_at' => optional($currentSubscription?->ends_at)->toIso8601String(),
                'trial_ends_at' => optional($trialEndsAt)->toIso8601String(),
                'plan_price_id' => $currentSubscription?->stripe_price,
                'plan_name' => $user->getCurrentPlan(), // Add the actual plan name using the robust method
            ],
            'trial_eligibility' => [
                'has_used_trial' => $user->trial_used ?? false,
                'trial_plan' => $user->trial_plan,
            ],
            'stripe_key' => config('cashier.key'),
        ]);
    }

    /**
     * Fetch price data from Stripe API
     */
    private function getStripePriceData($priceId)
    {
        try {
            if (! config('cashier.secret')) {
                return ['price' => 0, 'currency' => 'usd', 'interval' => 'month'];
            }

            $stripe = new StripeClient(config('cashier.secret'));
            $price = $stripe->prices->retrieve($priceId);

            return [
                'price' => $price->unit_amount / 100, // Convert from cents
                'currency' => strtoupper($price->currency),
                'interval' => $price->recurring->interval ?? 'month',
            ];
        } catch (\Exception $e) {
            // Fallback to 0 if Stripe API fails
            \Illuminate\Support\Facades\Log::error('Failed to fetch Stripe price for '.$priceId.': '.$e->getMessage());

            return ['price' => 0, 'currency' => 'usd', 'interval' => 'month'];
        }
    }

    public function createCheckout(Request $request)
    {
        $request->validate([
            'price_id' => 'required|string',
        ]);

        $priceId = $request->input('price_id');
        $user = $request->user();

        // Check if user already has an active subscription
        if ($user->subscribed('default')) {
            // Handle plan change/upgrade for existing subscribers
            $subscription = $user->subscription('default');

            // If they're trying to subscribe to the same plan, redirect to billing portal instead
            if ($subscription->stripe_price === $priceId) {
                return redirect()->route('billing.portal');
            }

            // Change the subscription plan
            try {
                $subscription->swap($priceId);

                return back()->with('success', 'Your plan has been updated successfully!');
            } catch (\Exception $e) {
                return back()->with('error', 'Failed to update plan: '.$e->getMessage());
            }
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

        $checkout = $subscriptionBuilder->checkout([
            'success_url' => route('billing.show').'?checkout=success',
            'cancel_url' => route('billing.show').'?checkout=cancel',
        ]);

        // Redirect to Stripe-hosted checkout
        return Inertia::location($checkout->url);
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

        // Validate and save the cancellation reason
        $validatedData = $request->validate([
            'cancellation_reason' => 'nullable|string|max:255',
        ]);

        // Save cancellation reason and timestamp to user record
        $user->update([
            'cancellation_reason' => $validatedData['cancellation_reason'] ?? null,
            'cancelled_at' => now(),
        ]);

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

        // Clear cancellation data since they're resuming
        $user->update([
            'cancellation_reason' => null,
            'cancelled_at' => null,
        ]);

        $sub->resume();

        return back()->with('success', 'Subscription resumed.');
    }
}
