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
        Schema::create('certification_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('certification_attempt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pm_question_id')->constrained('p_m_questions')->cascadeOnDelete();
            $table->json('user_answer'); // user's submitted answer
            $table->boolean('is_correct');
            $table->unsignedTinyInteger('points_earned');
            $table->timestamp('answered_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('certification_answers');
    }
};
