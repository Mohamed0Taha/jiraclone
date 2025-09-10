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
        Schema::table('certification_attempts', function (Blueprint $table) {
            // Only add columns if they don't exist
            if (! Schema::hasColumn('certification_attempts', 'exam_started_at')) {
                $table->timestamp('exam_started_at')->nullable()->after('selected_question_ids');
            }
            if (! Schema::hasColumn('certification_attempts', 'exam_expires_at')) {
                $table->timestamp('exam_expires_at')->nullable()->after('exam_started_at');
            }
            if (! Schema::hasColumn('certification_attempts', 'is_expired')) {
                $table->boolean('is_expired')->default(false)->after('exam_expires_at');
            }
            if (! Schema::hasColumn('certification_attempts', 'next_attempt_allowed_at')) {
                $table->timestamp('next_attempt_allowed_at')->nullable()->after('is_expired');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('certification_attempts', function (Blueprint $table) {
            $table->dropColumn([
                'exam_started_at',
                'exam_expires_at',
                'is_expired',
                'next_attempt_allowed_at',
            ]);
        });
    }
};
