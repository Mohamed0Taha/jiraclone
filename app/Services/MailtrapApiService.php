<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MailtrapApiService
{
    private string $apiToken;

    private string $apiUrl = 'https://send.api.mailtrap.io/api/send';

    public function __construct()
    {
        $this->apiToken = env('MAILTRAP_API_TOKEN') ?: env('MAIL_PASSWORD') ?: '';

        if (empty($this->apiToken)) {
            throw new \Exception('MAILTRAP_API_TOKEN not found in environment variables');
        }
    }

    public function forwardEmail(
        string $subject,
        string $content,
        string $fromEmail,
        string $toEmail = 'taha.elfatih@gmail.com',
        array $headers = []
    ): bool {
        try {
            Log::info('=== Mailtrap API Forward ===', [
                'subject' => $subject,
                'from' => $fromEmail,
                'to' => $toEmail,
                'content_length' => strlen($content),
            ]);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->apiToken,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl, [
                'from' => [
                    'email' => 'support@taskpilot.us',
                    'name' => 'TaskPilot Support',
                ],
                'to' => [
                    [
                        'email' => $toEmail,
                        'name' => 'Taha',
                    ],
                ],
                'subject' => '[FORWARDED] '.$subject,
                'text' => $this->formatForwardedContent($subject, $content, $fromEmail, $headers),
                'html' => $this->formatForwardedContentHtml($subject, $content, $fromEmail, $headers),
            ]);

            if ($response->successful()) {
                Log::info('✅ Email forwarded successfully via Mailtrap API', [
                    'response' => $response->json(),
                ]);

                return true;
            } else {
                Log::error('❌ Mailtrap API error', [
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);

                return false;
            }

        } catch (\Exception $e) {
            Log::error('❌ Exception in Mailtrap API forward', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return false;
        }
    }

    private function formatForwardedContent(string $subject, string $content, string $fromEmail, array $headers): string
    {
        $formatted = "--- FORWARDED EMAIL ---\n\n";
        $formatted .= "Original From: {$fromEmail}\n";
        $formatted .= "Original Subject: {$subject}\n";
        $formatted .= 'Forwarded At: '.now()->format('Y-m-d H:i:s T')."\n";

        if (! empty($headers)) {
            $formatted .= "\nOriginal Headers:\n";
            foreach ($headers as $key => $value) {
                $formatted .= "{$key}: {$value}\n";
            }
        }

        $formatted .= "\n--- ORIGINAL MESSAGE ---\n\n";
        $formatted .= $content;

        return $formatted;
    }

    private function formatForwardedContentHtml(string $subject, string $content, string $fromEmail, array $headers): string
    {
        $html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">';
        $html .= '<div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #007bff; margin-bottom: 20px;">';
        $html .= '<h3 style="margin: 0 0 15px 0; color: #007bff;">📧 Forwarded Email</h3>';
        $html .= '<p style="margin: 5px 0;"><strong>From:</strong> '.htmlspecialchars($fromEmail).'</p>';
        $html .= '<p style="margin: 5px 0;"><strong>Subject:</strong> '.htmlspecialchars($subject).'</p>';
        $html .= '<p style="margin: 5px 0;"><strong>Forwarded:</strong> '.now()->format('Y-m-d H:i:s T').'</p>';
        $html .= '</div>';

        if (! empty($headers)) {
            $html .= '<div style="background: #f1f3f4; padding: 15px; margin-bottom: 20px; border-radius: 4px;">';
            $html .= '<h4 style="margin: 0 0 10px 0; color: #5f6368;">Original Headers</h4>';
            foreach ($headers as $key => $value) {
                $html .= '<p style="margin: 2px 0; font-size: 12px;"><code>'.htmlspecialchars($key).': '.htmlspecialchars($value).'</code></p>';
            }
            $html .= '</div>';
        }

        $html .= '<div style="border-top: 2px solid #e8eaed; padding-top: 20px;">';
        $html .= '<h4 style="margin: 0 0 15px 0; color: #202124;">Original Message</h4>';
        $html .= '<div style="white-space: pre-wrap; font-family: monospace; background: #f8f9fa; padding: 15px; border-radius: 4px;">';
        $html .= htmlspecialchars($content);
        $html .= '</div>';
        $html .= '</div>';
        $html .= '</div>';

        return $html;
    }

    public function testConnection(): bool
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->apiToken,
                'Content-Type' => 'application/json',
            ])->post($this->apiUrl, [
                'from' => [
                    'email' => 'support@taskpilot.us',
                    'name' => 'TaskPilot Support',
                ],
                'to' => [
                    [
                        'email' => 'taha.elfatih@gmail.com',
                        'name' => 'Taha',
                    ],
                ],
                'subject' => 'TaskPilot Mailtrap API Test',
                'text' => 'This is a test email sent via Mailtrap API to verify the connection is working.',
                'html' => '<p>This is a test email sent via <strong>Mailtrap API</strong> to verify the connection is working.</p>',
            ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('❌ Mailtrap API connection test failed', [
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
