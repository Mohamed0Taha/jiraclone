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
        Schema::table('sms_messages', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('automation_id')->nullable();
            $table->string('twilio_sid')->nullable();
            $table->string('from_number');
            $table->string('to_number');
            $table->text('body');
            $table->string('status')->default('queued');
            $table->decimal('price', 8, 4)->nullable();
            $table->string('price_unit')->nullable();
            $table->string('direction')->nullable();
            $table->string('error_message')->nullable();
            $table->integer('error_code')->nullable();
            $table->json('webhook_data')->nullable();

            // Add foreign key constraints
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('automation_id')->references('id')->on('automations')->onDelete('set null');

            // Add indexes for performance
            $table->index('twilio_sid');
            $table->index('status');
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sms_messages', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropForeign(['automation_id']);
            $table->dropColumn([
                'user_id',
                'automation_id',
                'twilio_sid',
                'from_number',
                'to_number',
                'body',
                'status',
                'price',
                'price_unit',
                'direction',
                'error_message',
                'error_code',
                'webhook_data',
            ]);
        });
    }
};
