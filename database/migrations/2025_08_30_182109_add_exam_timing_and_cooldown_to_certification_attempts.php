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
            $table->timestamp('exam_started_at')->nullable()->after('meta');
            $table->timestamp('exam_expires_at')->nullable()->after('exam_started_at');
            $table->boolean('is_expired')->default(false)->after('exam_expires_at');
            $table->timestamp('next_attempt_allowed_at')->nullable()->after('is_expired');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('certification_attempts', function (Blueprint $table) {
            if (Schema::hasColumn('certification_attempts', 'exam_started_at')) {
                $table->dropColumn('exam_started_at');
            }
            if (Schema::hasColumn('certification_attempts', 'exam_expires_at')) {
                $table->dropColumn('exam_expires_at');
            }
            if (Schema::hasColumn('certification_attempts', 'is_expired')) {
                $table->dropColumn('is_expired');
            }
            if (Schema::hasColumn('certification_attempts', 'next_attempt_allowed_at')) {
                $table->dropColumn('next_attempt_allowed_at');
            }
        });
    }
};
