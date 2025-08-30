<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('virtual_project_simulations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('budget_total')->default(0);
            $table->integer('budget_used')->default(0);
            $table->unsignedInteger('total_days')->default(30);
            $table->unsignedInteger('current_day')->default(1);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('requirements_document')->nullable();
            $table->boolean('requirements_locked')->default(false);
            $table->integer('score')->default(0);
            $table->string('status')->default('active');
            $table->json('metrics')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('virtual_project_simulations');
    }
};
