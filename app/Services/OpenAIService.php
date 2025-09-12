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
    private function model(string $default = 'gpt-4o-mini', ?string $override = null): string
    {
        if ($override) {
            return $override;
        }

        return (string) (config('openai.model') ?: env('OPENAI_MODEL', $default));
    }

    /**
     * Resolve assistant (command/chat capable) model if configured.
     */
    private function assistantModel(): ?string
    {
        $cfg = config('openai.assistant_model');
        $env = env('OPENAI_ASSISTANT_MODEL');
        $m = $cfg ?: $env;
        $m = $m ? trim((string) $m) : null;

        return $m ?: null;
    }

    /**
     * Base URI override support.
     */
    private function baseUri(): string
    {
        return rtrim((string) (config('openai.base_uri') ?: env('OPENAI_BASE_URL', 'https://api.openai.com/v1')), '/');
    }

    public function chatJson(array $messages, float $temperature = 0.1, bool $useAssistantModel = false): array
    {
        $apiKey = $this->apiKey();
        $model = $this->model('gpt-4o-mini', $useAssistantModel ? $this->assistantModel() : null);
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        $prompt = $this->extractPromptFromMessages($messages);
        $userId = Auth::id();
        $startTime = microtime(true);

        try {
            $start = microtime(true);
            $res = Http::timeout(25)->withHeaders([
                'Authorization' => 'Bearer '.$apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUri().'/chat/completions', [
                'model' => $model,
                'temperature' => $temperature,
                'response_format' => ['type' => 'json_object'],
                'messages' => $messages,
            ]);
            $latencyMs = (int) ((microtime(true) - $start) * 1000);

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

            if (config('openai.debug_models')) {
                Log::info('[OpenAIService] chatJson success', [
                    'model' => $model,
                    'assistant_override' => $useAssistantModel,
                    'tokens' => $tokensUsed,
                    'latency_ms' => $latencyMs,
                ]);
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

    public function chatText(array $messages, float $temperature = 0.2, bool $useAssistantModel = false): string
    {
        $apiKey = $this->apiKey();
        $model = $this->model('gpt-4o-mini', $useAssistantModel ? $this->assistantModel() : null);
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        $prompt = $this->extractPromptFromMessages($messages);
        $userId = Auth::id();

        try {
            $start = microtime(true);
            $res = Http::timeout(120)->withHeaders([
                'Authorization' => 'Bearer '.$apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUri().'/chat/completions', [
                'model' => $model,
                'temperature' => $temperature,
                'messages' => $messages,
            ]);
            $latencyMs = (int) ((microtime(true) - $start) * 1000);

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

            if (config('openai.debug_models')) {
                Log::info('[OpenAIService] chatText success', [
                    'model' => $model,
                    'assistant_override' => $useAssistantModel,
                    'tokens' => $tokensUsed,
                    'latency_ms' => $latencyMs,
                ]);
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
            $res = Http::timeout(25)->withHeaders([
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

            if (! $imageUrl) {
                throw new Exception('No image URL returned from OpenAI');
            }

            // Calculate cost for DALL-E 3 (as of 2025: ~$0.04 per image for 1024x1024 standard quality)
            $cost = match ($size) {
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

    /**
     * Generate custom view HTML/JS application using OpenAI with enhanced prompting
     */
    public function generateCustomView(string $prompt): string
    {
        $messages = [
            [
                'role' => 'system',
                'content' => 'You are an expert full-stack web developer who creates beautiful, FULLY FUNCTIONAL single-page applications. 

CRITICAL REQUIREMENTS:
1. EVERY button, form, and interactive element MUST have working JavaScript functionality
2. Include ALL components mentioned in the prompt with complete functionality
3. Use modern HTML5, CSS3, and ES6+ JavaScript
4. Create responsive designs with mobile-first approach
5. Add proper error handling and loading states
6. Include accessibility features (ARIA labels, semantic HTML)
7. Use professional styling with smooth animations
8. Add local storage persistence where appropriate

JAVASCRIPT REQUIREMENTS:
- Write clean, modern ES6+ JavaScript with proper event handling
- Implement error handling with try-catch blocks
- Add loading states and user feedback
- Include form validation and data sanitization
- Use async/await for any asynchronous operations
- Add keyboard shortcuts and navigation support

CSS REQUIREMENTS:
- Use CSS custom properties (variables) for theming
- Implement responsive design with CSS Grid and Flexbox
- Add smooth transitions and hover effects
- Include loading states and success/error messages
- Use a cohesive, professional color scheme

You respond ONLY with complete HTML code including embedded CSS and JavaScript. NO explanations, NO markdown formatting - just working HTML code that creates a fully functional application.',
            ],
            [
                'role' => 'user',
                'content' => $prompt,
            ],
        ];

        return $this->chatText($messages, 0.2, false);
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
