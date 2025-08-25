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
        Schema::create('sms_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('automation_id')->nullable()->constrained()->onDelete('set null');
            $table->string('message_sid')->unique(); // Twilio Message SID
            $table->string('from_number'); // TaskPilot number
            $table->string('to_number'); // Receiver number
            $table->text('body'); // Message content
            $table->string('status')->default('queued'); // queued, sent, delivered, failed, etc.
            $table->decimal('cost', 8, 4)->nullable(); // Cost in USD
            $table->string('error_message')->nullable(); // If failed
            $table->integer('error_code')->nullable(); // Twilio error code
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->json('metadata')->nullable(); // Additional Twilio data
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['automation_id', 'created_at']);
            $table->index(['status', 'created_at']);
            $table->index('sent_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sms_messages');
    }
};
