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
        Schema::table('projects', function (Blueprint $table) {
            // This migration is a safety net. Earlier migrations already add `meta`.
            // Keep idempotent to avoid errors in different environments.
            if (! Schema::hasColumn('projects', 'meta')) {
                $table->json('meta')->nullable()->after('description');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            if (Schema::hasColumn('projects', 'meta')) {
                $table->dropColumn('meta');
            }
        });
    }
};
