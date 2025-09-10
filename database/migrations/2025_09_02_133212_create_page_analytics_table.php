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
        Schema::create('page_analytics', function (Blueprint $table) {
            $table->id();
            $table->string('page_url')->index();
            $table->string('page_title')->nullable();
            $table->string('referrer_url')->nullable();
            $table->string('utm_source')->nullable();
            $table->string('utm_medium')->nullable();
            $table->string('utm_campaign')->nullable();
            $table->string('utm_content')->nullable();
            $table->string('utm_term')->nullable();

            // Visitor Information
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->string('browser')->nullable();
            $table->string('browser_version')->nullable();
            $table->string('operating_system')->nullable();
            $table->string('device_type')->nullable(); // desktop, mobile, tablet

            // Geographic Information
            $table->string('country')->nullable();
            $table->string('country_code', 2)->nullable();
            $table->string('region')->nullable();
            $table->string('city')->nullable();
            $table->string('postal_code')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('timezone')->nullable();

            // Session Information
            $table->string('session_id')->nullable();
            $table->string('visitor_id')->nullable(); // unique visitor tracking
            $table->boolean('is_returning_visitor')->default(false);
            $table->integer('page_load_time')->nullable(); // in milliseconds
            $table->integer('time_on_page')->nullable(); // in seconds

            // Additional Tracking
            $table->json('screen_resolution')->nullable();
            $table->string('language')->nullable();
            $table->boolean('is_mobile')->default(false);
            $table->boolean('is_bot')->default(false);
            $table->json('custom_data')->nullable(); // for additional tracking data

            $table->timestamps();

            // Indexes for performance
            $table->index(['page_url', 'created_at']);
            $table->index(['country_code', 'created_at']);
            $table->index(['utm_source', 'created_at']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('page_analytics');
    }
};
