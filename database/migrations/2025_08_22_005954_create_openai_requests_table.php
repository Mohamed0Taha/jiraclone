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
        Schema::create('openai_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('request_type'); // 'chat', 'task_generation', 'analysis', etc.
            $table->integer('tokens_used')->default(0);
            $table->decimal('cost', 10, 6)->default(0); // Cost in dollars
            $table->string('model')->default('gpt-4');
            $table->text('prompt')->nullable();
            $table->text('response')->nullable();
            $table->boolean('successful')->default(true);
            $table->text('error_message')->nullable();
            $table->timestamps();
            
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'created_at']);
            $table->index(['request_type', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('openai_requests');
    }
};
