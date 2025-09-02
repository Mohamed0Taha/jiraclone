<!DOCTYPE html>
<html lang="{{ str_replace('_','-', app()->getLocale()) }}" class="h-full">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="app-url" content="{{ rtrim(config('app.url'), '/') }}">

    <title inertia>{{ config('app.name', 'TaskPilot') }}</title>

    <!-- TaskPilot Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/png" sizes="48x48" href="/icon-48.svg">
    <link rel="shortcut icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/icon-48.svg">
    
    <!-- TaskPilot Branding & SEO -->
    <meta name="theme-color" content="#3B82F6">
    <meta name="application-name" content="TaskPilot">
    <meta name="apple-mobile-web-app-title" content="TaskPilot">
    <meta name="description" content="TaskPilot - The #1 AI-Powered Project Management Platform trusted by 50,000+ teams worldwide. Boost productivity by 40% with intelligent task management and workflow automation.">
    <meta name="author" content="TaskPilot Inc.">
    <meta name="publisher" content="TaskPilot Inc.">
    <meta name="robots" content="index, follow">
    <meta name="googlebot" content="index, follow">
    <meta name="language" content="English">
    <meta name="geo.region" content="US">
    <meta name="format-detection" content="telephone=no">
    
    <!-- Mobile Optimization -->
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="msapplication-TileColor" content="#3B82F6">
    <meta name="msapplication-config" content="/browserconfig.xml">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">

    @php
        $page ??= [
            'component' => 'Landing',
            'props'     => [],
            'url'       => request()->getRequestUri(),
            'version'   => null,
        ];
    @endphp

    @routes
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
    @inertiaHead
  </head>
  <body class="antialiased h-full">
    <script>
      window.Laravel = {
        csrfToken: document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        appUrl: document.querySelector('meta[name="app-url"]')?.getAttribute('content') || '',
        env: "{{ app()->environment() }}",
      };
    </script>
    @inertia
  </body>
</html>
