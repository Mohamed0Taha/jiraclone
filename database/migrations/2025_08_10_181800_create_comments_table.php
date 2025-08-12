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
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            
            // Foreign key to tasks
            $table->foreignId('task_id')
                  ->constrained()
                  ->onDelete('cascade');
            
            // Foreign key to users (who wrote the comment)
            $table->foreignId('user_id')
                  ->constrained()
                  ->onDelete('cascade');
            
            // For replies - parent comment
            $table->foreignId('parent_id')
                  ->nullable()
                  ->constrained('comments')
                  ->onDelete('cascade');
            
            // Comment content
            $table->text('content');
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
