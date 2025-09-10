<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->longText('html_content');
            $table->json('metadata')->nullable(); // Store additional metadata like version, prompt used, etc.
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_accessed_at')->nullable();
            $table->timestamps();
            
            // Ensure one active custom view per project per user
            $table->unique(['project_id', 'user_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_views');
    }
};