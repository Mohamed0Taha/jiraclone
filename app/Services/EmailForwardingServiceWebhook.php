<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailForwardingServiceWebhook
{
    protected $emailForwardingService;

    public function __construct(EmailForwardingService $emailForwardingService)
    {
        $this->emailForwardingService = $emailForwardingService;
    }

    /**
     * Process incoming email webhook from email provider
     */
    public function processWebhookEmail($emailData)
    {
        try {
            Log::info('Processing webhook email', ['from' => $emailData['from'] ?? 'unknown']);

            // Extract email data
            $from = $emailData['from'] ?? '';
            $subject = $emailData['subject'] ?? 'No Subject';
            $body = $emailData['body'] ?? $emailData['text'] ?? '';
            $html = $emailData['html'] ?? $body;
            
            // Forward via existing service
            $result = $this->emailForwardingService->forwardEmail(
                $from,
                $subject,
                $body,
                $html
            );

            Log::info('Webhook email forwarded', [
                'from' => $from,
                'subject' => $subject,
                'success' => $result
            ]);

            return $result;

        } catch (\Exception $e) {
            Log::error('Webhook email processing failed', [
                'error' => $e->getMessage(),
                'email_data' => $emailData
            ]);
            
            return false;
        }
    }

    /**
     * Setup webhook URL for email forwarding services
     */
    public function getWebhookInstructions()
    {
        $webhookUrl = config('app.url') . '/api/email-webhook';
        
        return [
            'webhook_url' => $webhookUrl,
            'instructions' => [
                'PrivateEmail.com' => 'Set up email forwarding to webhook URL in your PrivateEmail.com settings',
                'Mailgun' => 'Configure route to forward to webhook URL',
                'SendGrid' => 'Set up Event Webhook to forward emails',
                'Zapier' => 'Create Zap to forward PrivateEmail.com emails to webhook URL'
            ]
        ];
    }
}
