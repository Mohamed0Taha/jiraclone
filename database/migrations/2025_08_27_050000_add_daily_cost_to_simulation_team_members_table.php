<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('simulation_team_members', function (Blueprint $table) {
            if (!Schema::hasColumn('simulation_team_members','daily_cost')) {
                $table->unsignedInteger('daily_cost')->default(600)->after('availability_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('simulation_team_members', function (Blueprint $table) {
            if (Schema::hasColumn('simulation_team_members','daily_cost')) {
                $table->dropColumn('daily_cost');
            }
        });
    }
};
