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
    /**
     * Resolve API key (prefer config; fall back to env for non-cached local dev).
     */
    private function apiKey(): string
    {
        return (string) (config('openai.api_key') ?: env('OPENAI_API_KEY', ''));
    }

    /**
     * Resolve model name from config/env.
     */
    private function model(string $default = 'gpt-4o-mini'): string
    {
        return (string) (config('openai.model') ?: env('OPENAI_MODEL', $default));
    }

    /**
     * Base URI override support.
     */
    private function baseUri(): string
    {
        return rtrim((string) (config('openai.base_uri') ?: env('OPENAI_BASE_URL', 'https://api.openai.com/v1')), '/');
    }

    public function chatJson(array $messages, float $temperature = 0.1): array
    {
        $apiKey = $this->apiKey();
        $model = $this->model('gpt-4o-mini');
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
            ])->post($this->baseUri().'/chat/completions', [
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
        $apiKey = $this->apiKey();
        $model = $this->model('gpt-4o-mini');
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        $prompt = $this->extractPromptFromMessages($messages);
        $userId = Auth::id();

        try {
            $res = Http::withHeaders([
                'Authorization' => 'Bearer '.$apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUri().'/chat/completions', [
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

    /**
     * Upload a file to OpenAI Files API
     *
     * @param  string  $fileContent  The file content as binary string
     * @param  string  $fileName  The original filename
     * @param  string  $purpose  The purpose for the file upload (e.g., 'assistants', 'fine-tune')
     * @return array The upload response from OpenAI
     *
     * @throws Exception If upload fails
     */
    public function uploadFile(string $fileContent, string $fileName, string $purpose = 'assistants'): array
    {
        $apiKey = $this->apiKey();
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        $userId = Auth::id();
        $startTime = microtime(true);

        try {
            // Create a temporary file for the upload
            $tempFile = tempnam(sys_get_temp_dir(), 'openai_upload_');
            file_put_contents($tempFile, $fileContent);

            $res = Http::withHeaders([
                'Authorization' => 'Bearer '.$apiKey,
            ])->attach('file', $fileContent, $fileName)
                ->post($this->baseUri().'/files', [
                    'purpose' => $purpose,
                ]);

            // Clean up temp file
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }

            if (! $res->ok()) {
                Log::error('OpenAI file upload failed', [
                    'status' => $res->status(),
                    'body' => $res->body(),
                    'filename' => $fileName,
                ]);
                throw new Exception('OpenAI file upload failed: '.$res->body());
            }

            $responseData = $res->json();

            // Log successful request
            if ($userId) {
                OpenAiRequest::logRequest(
                    userId: $userId,
                    type: 'file_upload',
                    tokens: 0, // File uploads don't consume tokens
                    cost: 0.0,
                    model: 'file-api',
                    prompt: "File upload: {$fileName}",
                    response: json_encode($responseData),
                    successful: true
                );
            }

            Log::info('OpenAI file uploaded successfully', [
                'file_id' => $responseData['id'] ?? 'unknown',
                'filename' => $fileName,
                'user_id' => $userId,
            ]);

            return $responseData;

        } catch (Exception $e) {
            // Log failed request
            if ($userId) {
                OpenAiRequest::logRequest(
                    userId: $userId,
                    type: 'file_upload',
                    tokens: 0,
                    cost: 0.0,
                    model: 'file-api',
                    prompt: "File upload failed: {$fileName}",
                    response: $e->getMessage(),
                    successful: false,
                    error: $e->getMessage()
                );
            }

            Log::error('OpenAI file upload error', [
                'filename' => $fileName,
                'error' => $e->getMessage(),
                'user_id' => $userId,
            ]);

            throw $e;
        }
    }

    /**
     * Delete a file from OpenAI Files API
     *
     * @param  string  $fileId  The file ID to delete
     * @return array The deletion response from OpenAI
     *
     * @throws Exception If deletion fails
     */
    public function deleteFile(string $fileId): array
    {
        $apiKey = $this->apiKey();
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        try {
            $res = Http::withHeaders([
                'Authorization' => 'Bearer '.$apiKey,
            ])->delete($this->baseUri()."/files/{$fileId}");

            if (! $res->ok()) {
                Log::warning('OpenAI file deletion failed', [
                    'status' => $res->status(),
                    'body' => $res->body(),
                    'file_id' => $fileId,
                ]);
                throw new Exception('OpenAI file deletion failed: '.$res->body());
            }

            $responseData = $res->json();

            Log::info('OpenAI file deleted successfully', [
                'file_id' => $fileId,
                'user_id' => Auth::id(),
            ]);

            return $responseData;

        } catch (Exception $e) {
            Log::error('OpenAI file deletion error', [
                'file_id' => $fileId,
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);

            // Don't re-throw deletion errors as they're not critical
            return ['deleted' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Enhanced chatJson method that supports vision/image inputs
     */
    public function chatJsonVision(array $messages, float $temperature = 0.1): array
    {
        $apiKey = $this->apiKey();
        $model = 'gpt-4o'; // Use vision-capable model
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
            ])->post($this->baseUri().'/chat/completions', [
                'model' => $model,
                'temperature' => $temperature,
                'response_format' => ['type' => 'json_object'],
                'messages' => $messages,
                'max_tokens' => 4096, // Increased for vision processing
            ]);

            if (! $res->ok()) {
                Log::error('OpenAI Vision JSON request failed', ['status' => $res->status(), 'body' => $res->body()]);

                // Log failed request
                if ($userId) {
                    OpenAiRequest::logRequest(
                        userId: $userId,
                        type: 'vision_json_completion',
                        tokens: 0,
                        cost: 0.0,
                        model: $model,
                        prompt: $prompt,
                        response: $res->body(),
                        successful: false,
                        error: 'HTTP '.$res->status().': '.$res->body()
                    );
                }

                throw new Exception('OpenAI Vision API request failed: '.$res->body());
            }

            $data = $res->json();
            $content = $data['choices'][0]['message']['content'] ?? '';

            if (empty($content)) {
                throw new Exception('OpenAI Vision API returned empty response');
            }

            $jsonData = json_decode($content, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('OpenAI Vision returned invalid JSON', ['content' => $content]);
                throw new Exception('OpenAI Vision API returned invalid JSON: '.json_last_error_msg());
            }

            $tokens = $data['usage']['total_tokens'] ?? 0;
            $cost = $this->calculateCost($model, $tokens);

            // Log successful request
            if ($userId) {
                OpenAiRequest::logRequest(
                    userId: $userId,
                    type: 'vision_json_completion',
                    tokens: $tokens,
                    cost: $cost,
                    model: $model,
                    prompt: $prompt,
                    response: $content,
                    successful: true
                );
            }

            Log::info('OpenAI Vision JSON request successful', [
                'tokens' => $tokens,
                'cost' => $cost,
                'model' => $model,
                'user_id' => $userId,
            ]);

            return $jsonData;

        } catch (Exception $e) {
            // Log failed request
            if ($userId) {
                OpenAiRequest::logRequest(
                    userId: $userId,
                    type: 'vision_json_completion',
                    tokens: 0,
                    cost: 0.0,
                    model: $model,
                    prompt: $prompt,
                    response: $e->getMessage(),
                    successful: false,
                    error: $e->getMessage()
                );
            }

            Log::error('OpenAI Vision JSON request error', [
                'error' => $e->getMessage(),
                'user_id' => $userId,
            ]);

            throw $e;
        }
    }

    /**
     * Enhanced chatJson method that supports file attachments
     */
    public function chatJsonWithFiles(array $messages, float $temperature = 0.1, array $options = []): array
    {
        // For now, we'll use the regular chatJson method
        // File context should be included in the messages
        return $this->chatJson($messages, $temperature);
    }

    /**
     * Generate an image using DALL-E
     */
    public function generateImage(string $prompt, string $size = '1024x1024', string $quality = 'standard'): array
    {
        $apiKey = $this->apiKey();
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        $userId = Auth::id();
        $startTime = microtime(true);

        try {
            $res = Http::timeout(120)->withHeaders([
                'Authorization' => 'Bearer '.$apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUri().'/images/generations', [
                'model' => 'dall-e-3',
                'prompt' => $prompt,
                'size' => $size,
                'quality' => $quality,
                'n' => 1,
            ]);

            if (! $res->ok()) {
                Log::error('OpenAI Image generation failed', ['status' => $res->status(), 'body' => $res->body()]);

                // Log failed request
                if ($userId) {
                    OpenAiRequest::logRequest(
                        userId: $userId,
                        type: 'image_generation',
                        tokens: 0,
                        cost: 0,
                        model: 'dall-e-3',
                        prompt: $prompt,
                        response: null,
                        successful: false,
                        error: 'HTTP '.$res->status().': '.$res->body()
                    );
                }

                throw new Exception('OpenAI image generation failed');
            }

            $payload = $res->json();
            $imageUrl = $payload['data'][0]['url'] ?? null;
            $revisedPrompt = $payload['data'][0]['revised_prompt'] ?? $prompt;

            if (!$imageUrl) {
                throw new Exception('No image URL returned from OpenAI');
            }

            // Calculate cost for DALL-E 3 (as of 2025: ~$0.04 per image for 1024x1024 standard quality)
            $cost = match($size) {
                '1024x1024' => $quality === 'hd' ? 0.08 : 0.04,
                '1792x1024', '1024x1792' => $quality === 'hd' ? 0.12 : 0.08,
                default => 0.04,
            };

            // Log successful request
            if ($userId) {
                OpenAiRequest::logRequest(
                    userId: $userId,
                    type: 'image_generation',
                    tokens: 0, // DALL-E doesn't use tokens
                    cost: $cost,
                    model: 'dall-e-3',
                    prompt: $prompt,
                    response: $imageUrl,
                    successful: true
                );
            }

            $duration = microtime(true) - $startTime;
            Log::info('OpenAI Image generation successful', [
                'cost' => $cost,
                'duration' => $duration,
                'size' => $size,
                'quality' => $quality,
                'user_id' => $userId,
            ]);

            return [
                'url' => $imageUrl,
                'revised_prompt' => $revisedPrompt,
                'cost' => $cost,
            ];

        } catch (Exception $e) {
            // Log failed request
            if ($userId) {
                OpenAiRequest::logRequest(
                    userId: $userId,
                    type: 'image_generation',
                    tokens: 0,
                    cost: 0.0,
                    model: 'dall-e-3',
                    prompt: $prompt,
                    response: $e->getMessage(),
                    successful: false,
                    error: $e->getMessage()
                );
            }

            Log::error('OpenAI Image generation error', [
                'error' => $e->getMessage(),
                'user_id' => $userId,
            ]);

            throw $e;
        }
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
