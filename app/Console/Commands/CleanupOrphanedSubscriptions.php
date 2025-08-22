<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Laravel\Cashier\Subscription;

class CleanupOrphanedSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:cleanup-orphaned {--force : Actually delete the orphaned subscriptions}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up subscriptions that no longer have associated users';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $orphaned = Subscription::whereDoesntHave('user')->get();
        $count = $orphaned->count();

        if ($count === 0) {
            $this->info('No orphaned subscriptions found.');

            return 0;
        }

        $this->info("Found {$count} orphaned subscription(s):");

        foreach ($orphaned as $subscription) {
            $this->line("- ID: {$subscription->id}, Stripe ID: {$subscription->stripe_id}, Status: {$subscription->stripe_status}");
        }

        if ($this->option('force')) {
            $orphaned->each->delete();
            $this->info("Deleted {$count} orphaned subscription(s).");
        } else {
            $this->warn('Use --force to actually delete these subscriptions.');
            $this->info('Command: php artisan subscriptions:cleanup-orphaned --force');
        }

        return 0;
    }
}
