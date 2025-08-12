<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;
use Stripe\StripeClient;

class BillingController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $plans = config('subscriptions.plans');

        return Inertia::render('Billing/Overview', [
            'user'  => $user,
            'plans' => collect($plans)->map(fn ($p) => [
                'name'     => $p['name'],
                'price_id' => $p['price_id'],
                'features' => $p['features'],
            ])->values(),
            'current' => [
                'subscribed' => $user->subscribed('default'),
                'on_grace'   => $user->subscription('default')?->onGracePeriod() ?? false,
                'ends_at'    => optional($user->subscription('default')?->ends_at)->toIso8601String(),
                'plan_price_id' => $user->subscription('default')?->stripe_price,
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
        $user    = $request->user();

        if ($user->subscribed('default')) {
            return back()->with('info', 'You already have an active subscription.');
        }

        // Create a Checkout Session via Cashier helper:
        $checkout = $user->newSubscription('default', $priceId)
            ->checkout([
                'success_url' => route('billing.show') . '?checkout=success',
                'cancel_url'  => route('billing.show') . '?checkout=cancel',
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
        $sub->cancel(); // ends at period end (grace period)
        return back()->with('success', 'Subscription will end at period end.');
    }

    public function resume(Request $request)
    {
        $user = $request->user();
        $sub  = $user->subscription('default');

        if (! $sub || ! $sub->onGracePeriod()) {
            return back()->with('error', 'No cancellable subscription in grace period.');
        }

        $sub->resume();
        return back()->with('success', 'Subscription resumed.');
    }
}