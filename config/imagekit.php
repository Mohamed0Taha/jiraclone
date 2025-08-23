<?php

return [
    'public_key' => env('IMAGEKIT_PUBLIC_KEY'),
    'private_key' => env('IMAGEKIT_PRIVATE_KEY'),
    'url_endpoint' => env('IMAGEKIT_URL_ENDPOINT'),
    'default_folder' => env('IMAGEKIT_DEFAULT_FOLDER', 'tasks'),
    'allowed_mime' => [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml',
    ],
    'max_size_bytes' => 5 * 1024 * 1024, // 5MB
];
