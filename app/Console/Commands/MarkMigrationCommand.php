<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MarkMigrationCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'mark:migration {name : Migration filename (with or without .php)} {--batch= : Optional explicit batch number}';

    /**
     * The console command description.
     */
    protected $description = 'Insert a record into the migrations table for the given migration if it is missing.';

    public function handle(): int
    {
        $name = trim($this->argument('name'));
        if ($name === '') {
            $this->error('Migration name required.');
            return self::FAILURE;
        }

        // Normalize: allow passing full filename with .php
        if (str_ends_with($name, '.php')) {
            $name = substr($name, 0, -4);
        }

        if (DB::table('migrations')->where('migration', $name)->exists()) {
            $this->info("Migration '{$name}' is already recorded.");
            return self::SUCCESS;
        }

        $batchOption = $this->option('batch');
        if ($batchOption !== null) {
            $batch = (int) $batchOption;
            if ($batch <= 0) {
                $this->error('Batch must be a positive integer when provided.');
                return self::FAILURE;
            }
        } else {
            $currentMax = (int) DB::table('migrations')->max('batch');
            $batch = $currentMax > 0 ? $currentMax : 0;
            // put this marker in a new batch so it is visually separated
            $batch += 1;
        }

        DB::table('migrations')->insert([
            'migration' => $name,
            'batch' => $batch,
        ]);

        $this->info("Inserted migration '{$name}' with batch {$batch}.");
        return self::SUCCESS;
    }
}
