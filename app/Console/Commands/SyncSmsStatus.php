<?php

namespace App\Console\Commands;

use App\Services\TwilioService;
use Illuminate\Console\Command;

class SyncSmsStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sms:sync-status {--all : Sync all pending messages}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync SMS message statuses from Twilio';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $twilioService = app(TwilioService::class);

        $this->info('Starting SMS status sync...');

        $results = $twilioService->syncAllPendingMessages();

        $this->info('SMS Status Sync Results:');
        $this->line("  Total messages checked: {$results['total']}");
        $this->line("  Successfully synced: {$results['synced']}");
        $this->line("  Failed to sync: {$results['failed']}");

        if ($results['synced'] > 0) {
            $this->info("✅ {$results['synced']} SMS message statuses were updated.");
        }

        if ($results['failed'] > 0) {
            $this->warn("⚠️  {$results['failed']} messages failed to sync. Check logs for details.");
        }

        if ($results['total'] === 0) {
            $this->info('ℹ️  No pending messages found to sync.');
        }

        return Command::SUCCESS;
    }
}
