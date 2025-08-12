<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule automation processing
Schedule::command('automations:run')->everyMinute();
Schedule::command('automations:run')->everyFiveMinutes();
Schedule::command('automations:run')->hourly();
