<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Use 191 to be safe with older MySQL index limits; make it nullable.
            if (!Schema::hasColumn('users', 'google_id')) {
                $table->string('google_id', 191)->nullable()->index()->after('email');
            }
            if (!Schema::hasColumn('users', 'google_avatar')) {
                $table->string('google_avatar', 2048)->nullable()->after('google_id');
            }
            if (!Schema::hasColumn('users', 'google_token')) {
                $table->string('google_token', 2048)->nullable()->after('google_avatar');
            }
            if (!Schema::hasColumn('users', 'google_refresh_token')) {
                $table->string('google_refresh_token', 2048)->nullable()->after('google_token');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'google_refresh_token')) {
                $table->dropColumn('google_refresh_token');
            }
            if (Schema::hasColumn('users', 'google_token')) {
                $table->dropColumn('google_token');
            }
            if (Schema::hasColumn('users', 'google_avatar')) {
                $table->dropColumn('google_avatar');
            }
            if (Schema::hasColumn('users', 'google_id')) {
                $table->dropColumn('google_id');
            }
        });
    }
};
