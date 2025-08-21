<?php

return [
    'plans' => [
        'basic' => [
            'name' => 'Basic',
            'price_id' => env('STRIPE_PRICE_BASIC', 'price_1RyWDcKX2zcFuvyCdckMUjxq'),
            'trial_days' => 7,
            'features' => [
                'Up to 25 AI task generations',
                'Unlimited assistant and reports',
                'Email support',
                '7-day free trial',
            ],
        ],
        'pro' => [
            'name' => 'Pro',
            'price_id' => env('STRIPE_PRICE_PRO', 'price_1RyWFAKX2zcFuvyCHRlPH7gC'),
            'trial_days' => 14,
            'features' => [
                'Up to 50 AI task generations',
                'Unlimited reports and AI assistant',
                'Priority support',
                '14-day free trial',
            ],
        ],
        'business' => [
            'name' => 'Business',
            'price_id' => env('STRIPE_PRICE_BUSINESS', 'price_1RyWGrKX2zcFuvyCFch5Aw5b'),
            'trial_days' => 14,
            'features' => [
                'Up to 200 AI task generations',
                'Unlimited reports and AI assistant',
                'Team collaboration',
                'Priority support',
                '14-day free trial',
            ],
        ],
    ],
    'default_plan_key' => 'pro',
];
