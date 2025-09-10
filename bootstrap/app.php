<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withProviders([
        \App\Providers\ImageKitServiceProvider::class,
        \App\Providers\SessionHealthServiceProvider::class,
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

        // TEMP: Disable RestrictCookieHeader (was causing redirect loop at ~3KB)
        $middleware->web(prepend: [
            // \App\Http\Middleware\RestrictCookieHeader::class,
        ]);

        $middleware->web(append: [
            \App\Http\Middleware\LimitCookieSize::class,
            \App\Http\Middleware\AddCorsHeaders::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\HandleInvitationAfterRegistration::class,
            \App\Http\Middleware\TrackVisitor::class,
        ]);

        // Register premium features middleware alias
        $middleware->alias([
            'subscription' => \App\Http\Middleware\CheckSubscription::class,
            'admin.only' => \App\Http\Middleware\AdminOnly::class,
            'owner.only' => \App\Http\Middleware\OwnerOnly::class,
        ]);
    })
    ->withExceptions(function ($exceptions) {})
    ->create();
