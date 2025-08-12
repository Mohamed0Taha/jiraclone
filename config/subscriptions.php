<?php

return [
    'plans' => [
        'pro_monthly' => [
            'name' => 'Pro Monthly',
            'price_id' => env('STRIPE_PRICE_PRO_MONTHLY', 'price_xxxxx'),
            'features' => [
                'Unlimited projects',
                'AI task generator',
                'Priority support',
            ],
        ],
        'pro_semiannual' => [
            'name' => 'Pro 6 Months',
            'price_id' => env('STRIPE_PRICE_PRO_SEMIANNUAL', 'price_sixmonths_xxxxx'),
            'features' => [
                'Everything in Pro Monthly',
                'Save compared to monthly billing',
            ],
        ],
        'pro_yearly' => [
            'name' => 'Pro Yearly',
            'price_id' => env('STRIPE_PRICE_PRO_YEARLY', 'price_yyyyy'),
            'features' => [
                'Everything in Pro Monthly (2 months free)',
            ],
        ],
    ],
    'default_plan_key' => 'pro_monthly',
];
