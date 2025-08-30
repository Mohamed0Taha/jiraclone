<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('simulation_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('simulation_id')->constrained('virtual_project_simulations')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedInteger('estimated_hours')->default(4);
            $table->unsignedInteger('remaining_hours')->default(4);
            $table->string('priority')->default('medium');
            $table->string('status')->default('todo');
            $table->foreignId('assigned_member_id')->nullable()->constrained('simulation_team_members')->nullOnDelete();
            $table->json('skill_tags')->nullable();
            $table->string('created_via')->default('manual');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('simulation_tasks');
    }
};
