<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('simulation_team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('simulation_id')->constrained('virtual_project_simulations')->cascadeOnDelete();
            $table->string('name');
            $table->string('role');
            $table->json('skills')->nullable();
            $table->unsignedInteger('capacity_hours_per_day')->default(6);
            $table->unsignedInteger('remaining_hours_today')->default(6);
            $table->string('availability_status')->default('available');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('simulation_team_members');
    }
};
