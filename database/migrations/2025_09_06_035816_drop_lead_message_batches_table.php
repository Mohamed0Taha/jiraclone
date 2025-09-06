<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the lead_message_batches table if it exists
        Schema::dropIfExists('lead_message_batches');
        
        // Remove the unwanted migration record from migrations table
        DB::table('migrations')
            ->where('migration', '2025_09_05_175356_add_name_and_status_to_lead_message_batches_table')
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recreate the table structure if needed (basic structure)
        Schema::create('lead_message_batches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->integer('total')->default(0);
            $table->integer('sent')->default(0);
            $table->integer('failed')->default(0);
            $table->timestamps();
        });
    }
};
