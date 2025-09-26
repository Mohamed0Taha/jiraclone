<?php

return [
    'plans' => [
        'basic' => [
            'name' => 'Basic',
            'price_id' => env('STRIPE_PRICE_BASIC', 'price_1RyWDcKX2zcFuvyCdckMUjxq'),
            'trial_days' => 7,
            'description' => 'For makers and freelancers exploring AI-assisted project management.',
            'ai_credits' => 'Includes 25 AI credits every month',
            'features' => [
                'Up to 25 AI task generations',
                'Unlimited assistant and reports',
                'Email support',
                '7-day free trial',
            ],
            'highlight' => false,
        ],
        'pro' => [
            'name' => 'Pro',
            'price_id' => env('STRIPE_PRICE_PRO', 'price_1RyWFAKX2zcFuvyCHRlPH7gC'),
            'trial_days' => 14,
            'description' => 'Best for growing teams that need deeper automation and insights.',
            'ai_credits' => 'Includes 50 AI credits + unlimited chat usage',
            'features' => [
                'Up to 50 AI task generations',
                'Unlimited reports and AI assistant',
                'Priority support',
                '14-day free trial',
            ],
            'highlight' => true,
        ],
        'business' => [
            'name' => 'Business',
            'price_id' => env('STRIPE_PRICE_BUSINESS', 'price_1RyWGrKX2zcFuvyCFch5Aw5b'),
            'trial_days' => 14,
            'description' => 'For fast-moving organizations standardising AI across teams.',
            'ai_credits' => 'Includes 200 AI task generations with bulk task automation',
            'features' => [
                'Up to 200 AI task generations',
                'Unlimited reports and AI assistant',
                'Team collaboration',
                'Priority support',
                '14-day free trial',
            ],
            'highlight' => false,
        ],
    ],
    'default_plan_key' => 'pro',
];
