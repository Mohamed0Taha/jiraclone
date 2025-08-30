<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Drop existing table if it exists with wrong schema
        Schema::dropIfExists('certification_attempts');
        
        // Recreate with correct schema
        Schema::create('certification_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('phase', ['pm_concepts', 'practical_scenario', 'certification_complete'])->default('pm_concepts');
            $table->unsignedTinyInteger('current_step')->default(1);
            $table->unsignedInteger('total_score')->default(0);
            $table->unsignedInteger('max_possible_score')->default(0);
            $table->decimal('percentage', 5, 2)->default(0.00);
            $table->boolean('passed')->default(false);
            $table->string('serial')->nullable()->unique();
            $table->timestamp('completed_at')->nullable();
            $table->json('theory_answers')->nullable();
            $table->json('practical_performance')->nullable();
            $table->json('meta')->nullable();
            $table->json('selected_question_ids')->nullable(); // Add this directly
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certification_attempts');
    }
};
