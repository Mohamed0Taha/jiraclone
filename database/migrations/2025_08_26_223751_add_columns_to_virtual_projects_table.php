<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddColumnsToVirtualProjectsTable extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('virtual_projects')) {
            return; // base table missing, skip
        }
        Schema::table('virtual_projects', function (Blueprint $table) {
            if (!Schema::hasColumn('virtual_projects','name')) {
                $table->string('name')->nullable();
            }
            if (!Schema::hasColumn('virtual_projects','meta')) {
                $table->json('meta')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('virtual_projects')) { return; }
        Schema::table('virtual_projects', function (Blueprint $table) {
            if (Schema::hasColumn('virtual_projects','name')) {
                $table->dropColumn('name');
            }
            if (Schema::hasColumn('virtual_projects','meta')) {
                $table->dropColumn('meta');
            }
        });
    }
}
