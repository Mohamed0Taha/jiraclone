<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Twilio Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for Twilio SMS and WhatsApp messaging services.
    | Used for workflow automations and notifications.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Twilio Authentication - API Key Method (Recommended)
    |--------------------------------------------------------------------------
    */

    'account_sid' => env('TWILIO_ACCOUNT_SID'),
    'auth_token' => env('TWILIO_AUTH_TOKEN'), // For basic auth
    'phone_number' => env('TWILIO_TASKPILOT_NUMBER'), // TaskPilot's SMS number

    /*
    |--------------------------------------------------------------------------
    | Message Settings
    |--------------------------------------------------------------------------
    */

    'default_country_code' => '+1',
    'max_message_length' => 160, // SMS limit
    'enable_delivery_status' => true,
    'webhook_base_url' => env('APP_URL', 'http://localhost'),

    /*
    |--------------------------------------------------------------------------
    | Feature Flags
    |--------------------------------------------------------------------------
    */

    'sms_enabled' => env('TWILIO_SMS_ENABLED', true),

];
