<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // who generated
            $table->string('plan')->nullable(); // plan at generation time
            $table->string('storage_path'); // stored PDF path
            $table->string('public_url')->nullable();
            $table->json('meta')->nullable(); // summary, analytics snapshot, counts
            $table->unsignedInteger('size_bytes')->nullable();
            $table->timestamp('generated_at');
            $table->timestamps();
            $table->index(['project_id', 'generated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_reports');
    }
};
