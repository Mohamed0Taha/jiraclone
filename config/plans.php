<?php

return [
    // Single (monthly) Stripe price IDs only – no annual plans configured
    'plans' => [
        'basic' => [
            'name' => 'Basic',
            'price_id' => env('STRIPE_PRICE_BASIC'),
        ],
        'pro' => [
            'name' => 'Pro',
            'price_id' => env('STRIPE_PRICE_PRO'),
        ],
        'business' => [
            'name' => 'Business',
            'price_id' => env('STRIPE_PRICE_BUSINESS'),
        ],
    ],
];
