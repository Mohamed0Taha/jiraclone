<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();

            // FK to projects
            $table->foreignId('project_id')
                  ->constrained()
                  ->onDelete('cascade');

            // creator and assignee
            $table->foreignId('creator_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->foreignId('assignee_id')
                  ->nullable()                 // nullable, will default in code
                  ->constrained('users')
                  ->onDelete('cascade');

            // task data
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamp('execution_date')->nullable();

            $table->timestamps(); // includes created_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
