<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('manual_plan')->nullable()->after('trial_plan');
            $table->boolean('manual_is_lifetime')->default(false)->after('manual_plan');
            $table->timestamp('manual_access_until')->nullable()->after('manual_is_lifetime');
            $table->string('manual_note')->nullable()->after('manual_access_until');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['manual_plan', 'manual_is_lifetime', 'manual_access_until', 'manual_note']);
        });
    }
};
