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
        Schema::create('p_m_questions', function (Blueprint $table) {
            $table->id();
            $table->string('category'); // 'fundamentals', 'planning', 'execution', 'monitoring', 'closure', 'ai_integration'
            $table->unsignedTinyInteger('difficulty'); // 1=easy, 2=medium, 3=hard
            $table->unsignedTinyInteger('points'); // points awarded for correct answer
            $table->string('type'); // 'multiple_choice', 'scenario', 'ordering', 'matching'
            $table->text('question');
            $table->json('options')->nullable(); // for multiple choice questions
            $table->json('correct_answer'); // correct answer(s)
            $table->text('explanation'); // explanation of the correct answer
            $table->json('meta')->nullable(); // additional metadata
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('p_m_questions');
    }
};
