<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update the phase enum to include theory_failed
        DB::statement("ALTER TABLE certification_attempts MODIFY COLUMN phase ENUM('pm_concepts', 'practical_scenario', 'certification_complete', 'theory_failed') DEFAULT 'pm_concepts'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original enum values
        DB::statement("ALTER TABLE certification_attempts MODIFY COLUMN phase ENUM('pm_concepts', 'practical_scenario', 'certification_complete') DEFAULT 'pm_concepts'");
    }
};
