<?php

namespace App\Providers;

use App\Services\ImageKitService;
use Illuminate\Support\ServiceProvider;

class ImageKitServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ImageKitService::class, function () {
            return new ImageKitService;
        });
    }
}
