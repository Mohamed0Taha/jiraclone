<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * WaveSpeedImageService
 * Lightweight wrapper to generate an image via WaveSpeed API (FLUX-dev default)
 * Only used when BLOG_AI_IMAGE_PROVIDER=wavespeed to offload image generation.
 */
class WaveSpeedImageService
{
    protected function apiKey(): string
    {
        return (string) env('WAVESPEED_API_KEY', '');
    }

    protected function baseUrl(): string
    {
        return rtrim(env('WAVESPEED_BASE_URL', 'https://wavespeed.ai/api'), '/');
    }

    protected function model(): string
    {
        return env('WAVESPEED_IMAGE_MODEL', 'flux-dev');
    }

    /**
     * Generate image and return array with url.
     * NOTE: API endpoints vary per model; we use a normalized /v1/images endpoint if available.
     */
    public function generate(string $prompt, string $size = '1024x1024'): array
    {
        $key = $this->apiKey();
        if ($key === '') {
            throw new Exception('WaveSpeed API key missing');
        }

        $model = $this->model();
        // Some WaveSpeed models accept width/height; parse from size (e.g., 1024x1024)
        [$w, $h] = explode('x', $size.'x');
        $w = (int) $w ?: 1024; $h = (int) $h ?: 1024;

        $payload = [
            'model' => $model,
            'prompt' => $prompt,
            'width' => $w,
            'height' => $h,
            'num_outputs' => 1,
        ];

        $res = Http::timeout(90)->withHeaders([
            'Authorization' => 'Bearer '.$key,
            'Accept' => 'application/json',
        ])->post($this->baseUrl().'/v1/images/generations', $payload);

        if (!$res->ok()) {
            Log::error('WaveSpeed image request failed', ['status' => $res->status(), 'body' => $res->body()]);
            throw new Exception('WaveSpeed image generation failed (HTTP '.$res->status().')');
        }

        $json = $res->json();
        // Try common patterns for URL locating
        $url = $json['data'][0]['url'] ?? $json['output'][0] ?? $json['images'][0]['url'] ?? null;
        if (!$url) {
            throw new Exception('WaveSpeed response missing image URL');
        }
        return [ 'url' => $url, 'provider' => 'wavespeed', 'model' => $model ];
    }
}
