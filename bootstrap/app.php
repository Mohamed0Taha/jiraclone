<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withProviders([
        \App\Providers\ImageKitServiceProvider::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust Heroku proxy headers EXCEPT X_FORWARDED_HOST to avoid signed URL mismatches.
        $middleware->trustProxies(
            at: '*',
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_PORT
                | Request::HEADER_X_FORWARDED_PROTO
            //  🚫 do NOT include HEADER_X_FORWARDED_HOST
        );

        // Add CORS middleware for API and assets
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        $middleware->web(prepend: [
            \App\Http\Middleware\PreventOversizedHeaders::class,
            \App\Http\Middleware\ClearOversizedCookies::class,
        ]);

        $middleware->web(append: [
            \App\Http\Middleware\AddCorsHeaders::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\HandleInvitationAfterRegistration::class,
        ]);

        // Register premium features middleware alias
        $middleware->alias([
            'subscription' => \App\Http\Middleware\CheckSubscription::class,
            'admin.only' => \App\Http\Middleware\AdminOnly::class,
        ]);
    })
    ->withExceptions(function ($exceptions) {})
    ->create();
