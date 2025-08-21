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
        Schema::table('users', function (Blueprint $table) {
            // AI Chat Assistant usage
            $table->integer('ai_chat_used')->default(0)->after('ai_tasks_used');

            // Reports usage
            $table->integer('reports_generated')->default(0)->after('ai_chat_used');

            // Current month reset tracking
            $table->integer('current_month')->nullable()->after('usage_reset_date');
            $table->integer('current_year')->nullable()->after('current_month');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'ai_chat_used',
                'reports_generated',
                'current_month',
                'current_year',
            ]);
        });
    }
};
