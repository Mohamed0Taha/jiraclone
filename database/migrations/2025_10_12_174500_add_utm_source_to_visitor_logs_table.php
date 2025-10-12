<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('visitor_logs')) {
            return;
        }

        Schema::table('visitor_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('visitor_logs', 'utm_source')) {
                $table->string('utm_source')->nullable()->after('user_agent');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('visitor_logs')) {
            return;
        }

        Schema::table('visitor_logs', function (Blueprint $table) {
            if (Schema::hasColumn('visitor_logs', 'utm_source')) {
                $table->dropColumn('utm_source');
            }
        });
    }
};
