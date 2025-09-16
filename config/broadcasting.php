<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Broadcaster
    |--------------------------------------------------------------------------
    |
    | This option controls the default broadcaster that will be used by the
    | framework when an event needs to be broadcast. You may set this to
    | any of the connections defined in the "connections" array below.
    |
    | Supported: "reverb", "pusher", "ably", "redis", "log", "null"
    |
    */

    // Support either BROADCAST_CONNECTION (used in this app) or BROADCAST_DRIVER (used in docs)
    'default' => env('BROADCAST_CONNECTION', env('BROADCAST_DRIVER', 'pusher')),

    /*
    |--------------------------------------------------------------------------
    | Broadcast Connections
    |--------------------------------------------------------------------------
    |
    | Here you may define all of the broadcast connections that will be used
    | to broadcast events to other systems or over WebSockets. Samples of
    | each available type of connection are provided inside this array.
    |
    */

    'connections' => [

        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            'options' => [
                'host' => env('REVERB_HOST'),
                'port' => env('REVERB_PORT', 443),
                'scheme' => env('REVERB_SCHEME', 'https'),
                'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
            ],
            'client_options' => [
                // Guzzle client options: https://docs.guzzlephp.org/en/stable/request-options.html
            ],
        ],

        'pusher' => [
            'driver' => 'pusher',
            'key' => env('PUSHER_APP_KEY'),
            'secret' => env('PUSHER_APP_SECRET'),
            'app_id' => env('PUSHER_APP_ID'),
            'options' => (function () {
                $cluster = env('PUSHER_APP_CLUSTER', 'mt1');
                $scheme = env('PUSHER_SCHEME', 'https');
                $port = env('PUSHER_PORT', 443);
                $rawHost = env('PUSHER_HOST');

                // Normalize an incorrectly configured REST host.
                // If someone sets PUSHER_HOST=api.pusherapp.com, prefer the cluster-aware host.
                if ($rawHost && preg_match('/^api\./i', $rawHost)) {
                    $rawHost = null; // force fallback to cluster host
                }

                $host = $rawHost ?: ('api-' . $cluster . '.pusher.com');

                return [
                    'cluster' => $cluster,
                    'host' => $host,
                    'port' => $port,
                    'scheme' => $scheme,
                    'encrypted' => true,
                    'useTLS' => $scheme === 'https',
                ];
            })(),
            'client_options' => [
                // Guzzle client options: https://docs.guzzlephp.org/en/stable/request-options.html
            ],
        ],

        'ably' => [
            'driver' => 'ably',
            'key' => env('ABLY_KEY'),
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

];
