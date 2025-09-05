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
        if (Schema::hasTable('visitor_logs')) {
            return; // Already exists (duplicate migration situation)
        }

        Schema::create('visitor_logs', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address')->index();
            $table->text('user_agent')->nullable();
            $table->string('city')->nullable();
            $table->string('region')->nullable();
            $table->string('country')->nullable();
            $table->string('country_code', 2)->nullable();
            $table->integer('page_views')->default(1);
            $table->timestamps();

            // Index for better performance on common queries
            $table->index(['ip_address', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visitor_logs');
    }
};
