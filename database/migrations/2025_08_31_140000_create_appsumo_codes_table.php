<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appsumo_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 200)->unique(); // 3-200 chars per AppSumo specs
            $table->enum('status', ['active', 'redeemed', 'expired'])->default('active');
            $table->foreignId('redeemed_by_user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->timestamp('redeemed_at')->nullable();
            $table->json('redemption_data')->nullable(); // Store name, email from redemption
            $table->string('campaign', 100)->default('appsumo_2025'); // Track different campaigns
            $table->timestamps();

            $table->index(['status', 'campaign']);
            $table->index('redeemed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appsumo_codes');
    }
};
