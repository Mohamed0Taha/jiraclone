<?php

// database/migrations/2025_08_09_000001_add_key_and_meta_fields_to_projects_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            // Add a short project key/code (e.g. "HR", "CRM")
            if (! Schema::hasColumn('projects', 'key')) {
                $table->string('key', 12)->nullable()->after('name');
                $table->index('key');
            }

            // Add structured context for better AI prompts
            if (! Schema::hasColumn('projects', 'meta')) {
                $table->json('meta')->nullable()->after('description');
            }

            // Optional scheduling fields
            if (! Schema::hasColumn('projects', 'start_date')) {
                $table->date('start_date')->nullable()->after('meta');
            }
            if (! Schema::hasColumn('projects', 'end_date')) {
                $table->date('end_date')->nullable()->after('start_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            if (Schema::hasColumn('projects', 'end_date')) {
                $table->dropColumn('end_date');
            }
            if (Schema::hasColumn('projects', 'start_date')) {
                $table->dropColumn('start_date');
            }
            if (Schema::hasColumn('projects', 'meta')) {
                $table->dropColumn('meta');
            }
            if (Schema::hasColumn('projects', 'key')) {
                // Dropping the column will also drop its index in MySQL
                $table->dropColumn('key');
            }
        });
    }
};
