<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class ClearStripeCustomers extends Command
{
    protected $signature = 'stripe:clear-customers';
    protected $description = 'Clear all Stripe customer IDs to force recreation with live keys';

    public function handle()
    {
        $count = User::whereNotNull('stripe_id')->count();
        
        if ($count === 0) {
            $this->info('No users with Stripe customer IDs found.');
            return;
        }
        
        $this->info("Found {$count} users with Stripe customer IDs.");
        
        if ($this->confirm('Clear all Stripe customer IDs? This will force recreation on next subscription attempt.')) {
            User::whereNotNull('stripe_id')->update(['stripe_id' => null]);
            $this->info('All Stripe customer IDs cleared successfully!');
        } else {
            $this->info('Operation cancelled.');
        }
    }
}
