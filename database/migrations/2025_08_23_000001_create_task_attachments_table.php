<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 40)->default('image'); // image, file, etc.
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedInteger('size')->default(0);
            $table->string('imagekit_file_id')->nullable();
            $table->string('url');
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->index(['task_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_attachments');
    }
};
