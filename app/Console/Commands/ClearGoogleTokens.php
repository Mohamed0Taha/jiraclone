<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class ClearGoogleTokens extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'google:clear-tokens';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear all Google Calendar tokens from users';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $count = User::whereNotNull('google_token')
            ->orWhereNotNull('google_refresh_token')
            ->count();

        if ($count === 0) {
            $this->info('No Google tokens found to clear.');
            return;
        }

        User::whereNotNull('google_token')
            ->orWhereNotNull('google_refresh_token')
            ->update([
                'google_token' => null,
                'google_refresh_token' => null,
            ]);

        $this->info("Cleared Google tokens for {$count} users.");
    }
}
