<!DOCTYPE html>
<html lang="{{ str_replace('_','-', app()->getLocale()) }}" class="h-full">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="app-url" content="{{ rtrim(config('app.url'), '/') }}">

  <title inertia>{{ config('app.name', 'TaskPilot') }}</title>

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
