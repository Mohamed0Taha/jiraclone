<?php

namespace App\Console\Commands;

use App\Models\EmailLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanDuplicateEmailLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'emails:clean-duplicates';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove duplicate email logs keeping the earliest one';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting cleanup of duplicate email logs...');

        // Find duplicates based on to_email, subject, and type
        $duplicates = DB::select('
            SELECT to_email, subject, type, COUNT(*) as count, MIN(id) as keep_id
            FROM email_logs
            GROUP BY to_email, subject, type
            HAVING COUNT(*) > 1
        ');

        $totalDuplicates = 0;
        $totalRemoved = 0;

        foreach ($duplicates as $duplicate) {
            $this->info("Found {$duplicate->count} duplicates for: {$duplicate->to_email} - {$duplicate->subject}");

            // Delete all except the earliest one
            $removed = EmailLog::where('to_email', $duplicate->to_email)
                ->where('subject', $duplicate->subject)
                ->where('type', $duplicate->type)
                ->where('id', '!=', $duplicate->keep_id)
                ->delete();

            $totalDuplicates++;
            $totalRemoved += $removed;
        }

        $this->info('Cleanup complete!');
        $this->info("Found {$totalDuplicates} sets of duplicates");
        $this->info("Removed {$totalRemoved} duplicate records");

        return 0;
    }
}
