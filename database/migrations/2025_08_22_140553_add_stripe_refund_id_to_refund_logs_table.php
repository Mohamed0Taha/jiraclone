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
        Schema::table('refund_logs', function (Blueprint $table) {
            $table->string('stripe_refund_id')->nullable()->after('notes');
            $table->index('stripe_refund_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('refund_logs', function (Blueprint $table) {
            $table->dropIndex(['stripe_refund_id']);
            $table->dropColumn('stripe_refund_id');
        });
    }
};
