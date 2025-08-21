<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * OpenAIService
 *
 * A dedicated service to handle all interactions with the OpenAI Chat Completions API.
 * It provides helpers for making requests and parsing both JSON and plain text responses,
 * centralizing API key management, model selection, and error handling.
 */
class OpenAIService
{
    public function chatJson(array $messages, float $temperature = 0.1): array
    {
        $apiKey = (string) env('OPENAI_API_KEY', '');
        $model = (string) env('OPENAI_MODEL', 'gpt-4o-mini');
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        $res = Http::withHeaders([
            'Authorization' => 'Bearer '.$apiKey,
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => $model,
            'temperature' => $temperature,
            'response_format' => ['type' => 'json_object'],
            'messages' => $messages,
        ]);

        if (! $res->ok()) {
            Log::error('OpenAI JSON request failed', ['status' => $res->status(), 'body' => $res->body()]);
            throw new Exception('OpenAI chat request failed');
        }

        $payload = $res->json();
        $content = $payload['choices'][0]['message']['content'] ?? '{}';
        $data = json_decode($content, true);

        return is_array($data) ? $data : [];
    }

    public function chatText(array $messages, float $temperature = 0.2): string
    {
        $apiKey = (string) env('OPENAI_API_KEY', '');
        $model = (string) env('OPENAI_MODEL', 'gpt-4o-mini');
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        $res = Http::withHeaders([
            'Authorization' => 'Bearer '.$apiKey,
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => $model,
            'temperature' => $temperature,
            'messages' => $messages,
        ]);

        if (! $res->ok()) {
            Log::error('OpenAI Text request failed', ['status' => $res->status(), 'body' => $res->body()]);
            throw new Exception('OpenAI chat request failed');
        }

        $payload = $res->json();
        $text = $payload['choices'][0]['message']['content'] ?? '';

        return (string) $text;
    }
}
