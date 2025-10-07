<!DOCTYPE html>
<html lang="{{ str_replace('_','-', app()->getLocale()) }}" class="h-full">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="app-url" content="{{ rtrim(config('app.url'), '/') }}">

    @php
        $baseUrl = rtrim(config('app.url'), '/');
        $path = '/'.ltrim(request()->path(), '/');
        $canonical = $baseUrl.($path === '/' ? '' : $path);
    @endphp
    <link rel="canonical" href="{{ $canonical }}">

    <title inertia>{{ config('app.name', 'TaskPilot') }}</title>

    <!-- TaskPilot Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2">
    <link rel="icon" type="image/png" sizes="48x48" href="/icon-48.svg?v=2">
    <link rel="shortcut icon" href="/favicon.ico?v=2">
    <link rel="apple-touch-icon" sizes="180x180" href="/icon-48.svg?v=2">
    
    <!-- TaskPilot Branding -->
    <meta name="theme-color" content="#3498DB">
    <meta name="application-name" content="TaskPilot">
    <meta name="apple-mobile-web-app-title" content="TaskPilot">
    <meta name="description" content="TaskPilot - The modern project workspace where productivity meets simplicity">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">

    <!-- GDPR Cookie Consent -->
    <script type="text/javascript" charset="UTF-8" src="//cdn.cookie-script.com/s/b9ca5ac0de6429cd35cedc328b8808e7.js"></script>

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
    @vite(['resources/js/app.jsx', 'resources/css/app.css'])
    @inertiaHead
  </head>
  <body class="antialiased h-full" style="background:#F7FAFF;">
    <style>
      html,body { min-height:100%; }
      @media (prefers-color-scheme: dark) {
        body { background: #0f172a; }
      }
    </style>
    <script>
      window.Laravel = {
        csrfToken: document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        appUrl: document.querySelector('meta[name="app-url"]')?.getAttribute('content') || '',
        env: "{{ app()->environment() }}",
        @auth
        user: {
          id: {{ auth()->user()->id }},
          name: "{{ auth()->user()->name }}",
          email: "{{ auth()->user()->email }}"
        },
        @endauth
      };
    </script>
    @inertia
  </body>
</html>
