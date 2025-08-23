<?php

return [
    'default' => 'ipapi',

    'cache' => 'file',
    'cache_ttl' => 30, // minutes

    'services' => [
        'ipapi' => [
            'url' => 'http://ip-api.com/json/',
            'secure' => false,
        ],
    ],

    'locales' => ['en'],
];
