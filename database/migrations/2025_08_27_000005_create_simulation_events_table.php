<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('simulation_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('simulation_id')->constrained('virtual_project_simulations')->cascadeOnDelete();
            $table->string('type');
            $table->json('payload')->nullable();
            $table->unsignedInteger('day_triggered');
            $table->boolean('resolved')->default(false);
            $table->foreignId('resolution_action_id')->nullable()->constrained('simulation_actions')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('simulation_events');
    }
};
