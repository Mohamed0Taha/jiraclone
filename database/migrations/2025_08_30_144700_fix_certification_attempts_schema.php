<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Add missing columns to certification_attempts if they don't exist
        if (Schema::hasTable('certification_attempts')) {
            Schema::table('certification_attempts', function (Blueprint $table) {
                if (!Schema::hasColumn('certification_attempts', 'phase')) {
                    $table->enum('phase', ['pm_concepts', 'practical_scenario', 'certification_complete'])->default('pm_concepts')->after('user_id');
                }
                if (!Schema::hasColumn('certification_attempts', 'serial')) {
                    $table->string('serial')->nullable()->unique()->after('passed');
                }
                if (!Schema::hasColumn('certification_attempts', 'theory_answers')) {
                    $table->json('theory_answers')->nullable()->after('completed_at');
                }
                if (!Schema::hasColumn('certification_attempts', 'practical_performance')) {
                    $table->json('practical_performance')->nullable()->after('theory_answers');
                }
                if (!Schema::hasColumn('certification_attempts', 'meta')) {
                    $table->json('meta')->nullable()->after('practical_performance');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::table('certification_attempts', function (Blueprint $table) {
            $table->dropColumn(['phase', 'serial', 'theory_answers', 'practical_performance', 'meta']);
        });
    }
};
