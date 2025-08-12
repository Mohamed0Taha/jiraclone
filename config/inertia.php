<?php

return [

    'ssr' => [
        'enabled' => env('INERTIA_SSR', false),
        'url' => env('INERTIA_SSR_URL'),
        'bundle' => base_path('bootstrap/ssr/ssr.mjs'),
    ],

    'testing' => [
        'assert_with_exact' => false,
    ],

    // Use the Blade layout we just created
    'view' => 'app',
];
