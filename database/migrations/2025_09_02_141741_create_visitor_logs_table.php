<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// NOTE: Disabled duplicate migration (superseded by later 141824 migration). Keeping file for history.
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void { /* intentionally no-op duplicate */ }

    /**
     * Reverse the migrations.
     */
    public function down(): void { /* no-op */ }
};
