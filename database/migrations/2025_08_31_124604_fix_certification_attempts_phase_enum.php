<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // SQLite (used in tests) doesn't support MODIFY COLUMN or native ENUMs; safely no-op there.
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            // For tests we don't need the enum alteration; schema difference is acceptable.
            return;
        }

        // Update the phase enum to include theory_failed (MySQL / MariaDB path)
        DB::statement("ALTER TABLE certification_attempts MODIFY COLUMN phase ENUM('pm_concepts', 'practical_scenario', 'certification_complete', 'theory_failed') DEFAULT 'pm_concepts'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            return; // Nothing was changed in up() for sqlite
        }

        // Revert back to original enum values
        DB::statement("ALTER TABLE certification_attempts MODIFY COLUMN phase ENUM('pm_concepts', 'practical_scenario', 'certification_complete') DEFAULT 'pm_concepts'");
    }
};
