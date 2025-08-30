<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateVirtualProjectsTable extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('virtual_projects')) {
            return; // already created
        }
        Schema::create('virtual_projects', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('virtual_projects');
    }
}
