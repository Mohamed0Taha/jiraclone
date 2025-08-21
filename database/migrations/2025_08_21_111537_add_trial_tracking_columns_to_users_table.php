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
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'trial_used')) {
                $table->boolean('trial_used')->default(false)->after('remember_token');
            }
            if (! Schema::hasColumn('users', 'trial_plan')) {
                $table->string('trial_plan')->nullable()->after('trial_used');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'trial_used')) {
                $table->dropColumn('trial_used');
            }
            if (Schema::hasColumn('users', 'trial_plan')) {
                $table->dropColumn('trial_plan');
            }
        });
    }
};
