<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('simulation_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('simulation_tasks','sort_order')) {
                $table->integer('sort_order')->default(0)->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('simulation_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('simulation_tasks','sort_order')) {
                $table->dropColumn('sort_order');
            }
        });
    }
};
