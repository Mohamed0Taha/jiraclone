<?php

namespace App\Http\Controllers;

use App\Services\SubscriptionPlanService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BillingController extends Controller
{
    public function __construct(private SubscriptionPlanService $planService)
    {
    }

    public function show(Request $request)
    {
        $user = $request->user();

        $currentSubscription = $user->subscription('default');
        $isOnTrial = $currentSubscription && $currentSubscription->onTrial();
        $trialEndsAt = $currentSubscription?->trial_ends_at;

        $plansWithPrices = $this->planService->allWithPricing();

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
        $planConfig = $this->planService->findByPriceId($priceId);

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
                'trial_plan' => $planConfig['key'] ?? null,
            ]);
        }

        // Check for Product Hunt promo code - apply automatically if user came from Product Hunt
        $checkoutOptions = [
            'success_url' => route('billing.show').'?checkout=success',
            'cancel_url' => route('billing.show').'?checkout=cancel',
        ];

        // Check if user came from Product Hunt (UTM source or referrer)
        $isProductHuntUser = $this->isProductHuntUser($request);

        if ($isProductHuntUser) {
            // Apply Product Hunt coupon - replace 'PRODUCTHUNT30' with your actual Stripe coupon ID
            $checkoutOptions['discounts'] = [
                ['coupon' => env('PRODUCT_HUNT_COUPON_ID', 'PRODUCTHUNT30')],
            ];

            // Log Product Hunt conversion for analytics
            \Log::info('Product Hunt user starting checkout', [
                'user_id' => $user->id,
                'plan' => $planKey,
                'utm_source' => $request->session()->get('utm_source'),
                'referrer' => $request->session()->get('original_referrer'),
            ]);
        }

        $checkout = $subscriptionBuilder->checkout($checkoutOptions);

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
