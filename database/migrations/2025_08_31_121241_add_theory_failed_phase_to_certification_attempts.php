<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            // Skip on sqlite – original enum is fine for tests.
            return;
        }

        Schema::table('certification_attempts', function (Blueprint $table) {
            // Modify the phase enum to include 'theory_failed'
            $table->enum('phase', ['pm_concepts', 'practical_scenario', 'certification_complete', 'theory_failed'])
                ->default('pm_concepts')
                ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'sqlite') {
            return; // nothing changed
        }

        Schema::table('certification_attempts', function (Blueprint $table) {
            // Revert to original enum values
            $table->enum('phase', ['pm_concepts', 'practical_scenario', 'certification_complete'])
                ->default('pm_concepts')
                ->change();
        });
    }
};
