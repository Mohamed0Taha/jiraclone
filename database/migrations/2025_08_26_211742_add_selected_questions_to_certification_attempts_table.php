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
            $table->json('selected_question_ids')->nullable()->after('phase');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('certification_attempts', function (Blueprint $table) {
            $table->dropColumn('selected_question_ids');
        });
    }
};
