<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Laravel\Cashier\Subscription;

class SyncStripeSubscription extends Command
{
    protected $signature = 'stripe:sync-subscription {email} {stripe_customer_id} {subscription_id}';
    protected $description = 'Manually sync a Stripe subscription to the database';

    public function handle()
    {
        $email = $this->argument('email');
        $stripeCustomerId = $this->argument('stripe_customer_id');
        $subscriptionId = $this->argument('subscription_id');

        // Find the user
        $user = User::where('email', $email)->first();
        if (!$user) {
            $this->error("User with email {$email} not found.");
            return 1;
        }

        // Update user with Stripe customer ID if not set
        if (!$user->stripe_id) {
            $user->stripe_id = $stripeCustomerId;
            $user->save();
            $this->info("Updated user's Stripe customer ID to: {$stripeCustomerId}");
        }

        // Get subscription details from Stripe
        $stripe = new \Stripe\StripeClient(config('cashier.secret'));
        
        try {
            $stripeSubscription = $stripe->subscriptions->retrieve($subscriptionId);
            
            // Create or update the subscription in database
            $subscription = $user->subscriptions()->updateOrCreate(
                ['stripe_id' => $subscriptionId],
                [
                    'type' => 'default',
                    'stripe_status' => $stripeSubscription->status,
                    'stripe_price' => $stripeSubscription->items->data[0]->price->id,
                    'quantity' => $stripeSubscription->items->data[0]->quantity,
                    'trial_ends_at' => $stripeSubscription->trial_end ? 
                        \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end) : null,
                    'ends_at' => null,
                ]
            );

            $this->info("Successfully synced subscription:");
            $this->info("- User: {$user->email}");
            $this->info("- Subscription ID: {$subscriptionId}");
            $this->info("- Status: {$stripeSubscription->status}");
            $this->info("- Price ID: {$stripeSubscription->items->data[0]->price->id}");
            $this->info("- Trial ends: " . ($subscription->trial_ends_at ? $subscription->trial_ends_at->format('Y-m-d H:i:s') : 'No trial'));

            return 0;
        } catch (\Exception $e) {
            $this->error("Error syncing subscription: " . $e->getMessage());
            return 1;
        }
    }
}
