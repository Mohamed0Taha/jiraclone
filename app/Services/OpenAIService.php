<?php

namespace App\Services;

use App\Models\OpenAiRequest;
use Exception;
use Illuminate\Support\Facades\Auth;
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

        $prompt = $this->extractPromptFromMessages($messages);
        $userId = Auth::id();
        $startTime = microtime(true);

        try {
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

                // Log failed request
                if ($userId) {
                    OpenAiRequest::logRequest(
                        userId: $userId,
                        type: 'json_completion',
                        tokens: 0,
                        cost: 0,
                        model: $model,
                        prompt: $prompt,
                        response: null,
                        successful: false,
                        error: 'HTTP '.$res->status().': '.$res->body()
                    );
                }

                throw new Exception('OpenAI chat request failed');
            }

            $payload = $res->json();
            $content = $payload['choices'][0]['message']['content'] ?? '{}';
            $data = json_decode($content, true);

            // Calculate tokens and cost
            $tokensUsed = $payload['usage']['total_tokens'] ?? 0;
            $cost = $this->calculateCost($model, $tokensUsed);

            // Log successful request
            if ($userId) {
                OpenAiRequest::logRequest(
                    userId: $userId,
                    type: 'json_completion',
                    tokens: $tokensUsed,
                    cost: $cost,
                    model: $model,
                    prompt: $prompt,
                    response: substr($content, 0, 1000), // Limit response length
                    successful: true
                );
            }

            return is_array($data) ? $data : [];

        } catch (Exception $e) {
            // Log failed request
            if ($userId) {
                OpenAiRequest::logRequest(
                    userId: $userId,
                    type: 'json_completion',
                    tokens: 0,
                    cost: 0,
                    model: $model,
                    prompt: $prompt,
                    response: null,
                    successful: false,
                    error: $e->getMessage()
                );
            }
            throw $e;
        }
    }

    public function chatText(array $messages, float $temperature = 0.2): string
    {
        $apiKey = (string) env('OPENAI_API_KEY', '');
        $model = (string) env('OPENAI_MODEL', 'gpt-4o-mini');
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        $prompt = $this->extractPromptFromMessages($messages);
        $userId = Auth::id();

        try {
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

                // Log failed request
                if ($userId) {
                    OpenAiRequest::logRequest(
                        userId: $userId,
                        type: 'text_completion',
                        tokens: 0,
                        cost: 0,
                        model: $model,
                        prompt: $prompt,
                        response: null,
                        successful: false,
                        error: 'HTTP '.$res->status().': '.$res->body()
                    );
                }

                throw new Exception('OpenAI chat request failed');
            }

            $payload = $res->json();
            $text = $payload['choices'][0]['message']['content'] ?? '';

            // Calculate tokens and cost
            $tokensUsed = $payload['usage']['total_tokens'] ?? 0;
            $cost = $this->calculateCost($model, $tokensUsed);

            // Log successful request
            if ($userId) {
                OpenAiRequest::logRequest(
                    userId: $userId,
                    type: 'text_completion',
                    tokens: $tokensUsed,
                    cost: $cost,
                    model: $model,
                    prompt: $prompt,
                    response: substr($text, 0, 1000), // Limit response length
                    successful: true
                );
            }

            return (string) $text;

        } catch (Exception $e) {
            // Log failed request
            if ($userId) {
                OpenAiRequest::logRequest(
                    userId: $userId,
                    type: 'text_completion',
                    tokens: 0,
                    cost: 0,
                    model: $model,
                    prompt: $prompt,
                    response: null,
                    successful: false,
                    error: $e->getMessage()
                );
            }
            throw $e;
        }
    }

    private function extractPromptFromMessages(array $messages): string
    {
        $prompt = '';
        foreach ($messages as $message) {
            if (is_array($message) && isset($message['content'])) {
                $prompt .= $message['role'].': '.$message['content']."\n";
            }
        }

        return substr($prompt, 0, 500); // Limit prompt length for storage
    }

    private function calculateCost(string $model, int $tokens): float
    {
        // Rough cost calculation based on current OpenAI pricing (as of 2025)
        $costPerThousandTokens = match ($model) {
            'gpt-4o' => 0.005, // $5 per 1M tokens
            'gpt-4o-mini' => 0.00015, // $0.15 per 1M tokens
            'gpt-4-turbo' => 0.01, // $10 per 1M tokens
            'gpt-3.5-turbo' => 0.002, // $2 per 1M tokens
            default => 0.002, // Default to gpt-3.5-turbo pricing
        };

        return ($tokens / 1000) * $costPerThousandTokens;
    }
}
