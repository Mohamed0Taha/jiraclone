<?php

return [
    'ssr' => false,
    'root_view' => 'app',
    // Avoid closures in config (breaks config:cache). Use env or static value.
    // You can set INERTIA_VERSION at deploy time to bust caches.
    'version' => env('INERTIA_VERSION', null),
];
