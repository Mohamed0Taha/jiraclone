<?php

return [
    // Attempt to auto-generate a featured image during blog generation.
    // Set BLOG_AI_AUTO_IMAGE=false to disable (will still allow manual image generation endpoint).
    'auto_image' => env('BLOG_AI_AUTO_IMAGE', true),

    // OpenAI image generation parameters (smaller + standard keeps latency low)
    'image_size' => env('BLOG_AI_IMAGE_SIZE', '1024x1024'),
    'image_quality' => env('BLOG_AI_IMAGE_QUALITY', 'standard'),

    // Maximum seconds we allow the synchronous request to spend on image generation
    // (Heroku hard limit is 30s; keep this comfortably below).
    'max_sync_seconds' => (int) env('BLOG_AI_MAX_SYNC_SECONDS', 23),
];
