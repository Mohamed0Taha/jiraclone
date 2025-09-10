<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
     * Uses WaveSpeed's async API pattern with task submission and result polling.
     */
    public function generate(string $prompt, string $size = '1024x1024'): array
    {
        $key = $this->apiKey();
        if ($key === '') {
            throw new Exception('WaveSpeed API key missing');
        }

        $model = $this->model();
        // Parse size format (e.g., "1024x1024" -> "1024*1024")
        $sizeFormatted = str_replace('x', '*', $size);

        // Submit task
        $payload = [
            'prompt' => $prompt,
            'size' => $sizeFormatted,
            'num_inference_steps' => 28,
            'seed' => -1,
            'guidance_scale' => 3.5,
            'num_images' => 1,
            'output_format' => 'jpeg',
            'enable_base64_output' => false,
            'enable_sync_mode' => true,  // Use sync mode to get direct result
        ];

        $submitUrl = 'https://api.wavespeed.ai/api/v3/wavespeed-ai/'.$model;
        $res = Http::timeout(90)->withHeaders([
            'Authorization' => 'Bearer '.$key,
            'Content-Type' => 'application/json',
        ])->post($submitUrl, $payload);

        if (! $res->ok()) {
            Log::error('WaveSpeed image request failed', ['status' => $res->status(), 'body' => $res->body()]);
            throw new Exception('WaveSpeed image generation failed (HTTP '.$res->status().')');
        }

        $json = $res->json();

        // Handle sync mode response (direct result)
        if (isset($json['data']['outputs']) && ! empty($json['data']['outputs'])) {
            $url = $json['data']['outputs'][0];

            return ['url' => $url, 'provider' => 'wavespeed', 'model' => $model];
        }

        // Handle async mode response (task ID for polling)
        $taskId = $json['data']['id'] ?? null;
        if (! $taskId) {
            throw new Exception('WaveSpeed response missing task ID or outputs');
        }

        // Poll for result (fallback if sync mode didn't work)
        $resultUrl = 'https://api.wavespeed.ai/api/v3/predictions/'.$taskId.'/result';
        $maxAttempts = 20; // 20 * 3 = 60 seconds max wait

        for ($i = 0; $i < $maxAttempts; $i++) {
            sleep(3); // Wait 3 seconds between polls

            $resultRes = Http::timeout(30)->withHeaders([
                'Authorization' => 'Bearer '.$key,
            ])->get($resultUrl);

            if (! $resultRes->ok()) {
                continue; // Retry on error
            }

            $resultJson = $resultRes->json();
            $status = $resultJson['data']['status'] ?? '';

            if ($status === 'completed') {
                $outputs = $resultJson['data']['outputs'] ?? [];
                if (! empty($outputs)) {
                    return ['url' => $outputs[0], 'provider' => 'wavespeed', 'model' => $model];
                }
            } elseif ($status === 'failed') {
                $error = $resultJson['data']['error'] ?? 'Unknown error';
                throw new Exception('WaveSpeed generation failed: '.$error);
            }
            // Continue polling if status is 'created' or 'processing'
        }

        throw new Exception('WaveSpeed generation timed out after 60 seconds');
    }
}
