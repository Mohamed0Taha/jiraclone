<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover"
    />

    {{-- Ziggy (optional if you use route() in JS) --}}
    @routes

    {{-- Vite / React entrypoints --}}
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])

    {{-- Inertia head (title, meta, etc.) --}}
    @inertiaHead
  </head>
  <body class="antialiased">
    {{-- Inertia mount point --}}
    @inertia
  </body>
</html>
