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
        Schema::table('lead_message_batches', function (Blueprint $table) {
            $table->string('name')->nullable()->after('user_id');
            $table->string('status')->default('draft')->after('failed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_message_batches', function (Blueprint $table) {
            $table->dropColumn(['name', 'status']);
        });
    }
};
