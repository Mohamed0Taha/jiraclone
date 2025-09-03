<?php

return [
    // Attempt to auto-generate a featured image during blog generation.
    // Set BLOG_AI_AUTO_IMAGE=false to disable (will still allow manual image generation endpoint).
    'auto_image' => env('BLOG_AI_AUTO_IMAGE', true),

    // OpenAI image generation parameters (smaller + standard keeps latency low)
    'image_size' => env('BLOG_AI_IMAGE_SIZE', '1024x1024'),
    'image_quality' => env('BLOG_AI_IMAGE_QUALITY', 'standard'),

    // Fallback size/quality if first attempt fails or times out quickly
    'fallback_image_size' => env('BLOG_AI_FALLBACK_IMAGE_SIZE', '512x512'),
    'fallback_image_quality' => env('BLOG_AI_FALLBACK_IMAGE_QUALITY', 'standard'),

    // Use a placeholder Unsplash image if both OpenAI attempts fail
    'use_placeholder_on_fail' => env('BLOG_AI_USE_PLACEHOLDER_ON_FAIL', true),
    // Query to use when requesting placeholder (will append slugified topic)
    'placeholder_base' => env('BLOG_AI_PLACEHOLDER_BASE', 'https://source.unsplash.com/featured/?'),

    // Maximum seconds we allow the synchronous request to spend on image generation
    // (Heroku hard limit is 30s; keep this comfortably below).
    'max_sync_seconds' => (int) env('BLOG_AI_MAX_SYNC_SECONDS', 23),

    // Image provider selection: 'openai' (default) or 'wavespeed'
    'provider' => env('BLOG_AI_IMAGE_PROVIDER', 'openai'),
];
