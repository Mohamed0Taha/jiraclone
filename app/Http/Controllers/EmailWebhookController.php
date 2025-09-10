<?php

namespace App\Http\Controllers;

use App\Services\EmailForwardingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmailWebhookController extends Controller
{
    /**
     * Handle incoming email webhook from Mailtrap or other providers
     */
    public function handleIncomingEmail(Request $request)
    {
        try {
            Log::info('📧 Incoming email webhook', $request->all());

            // Validate the request
            $validated = $request->validate([
                'from' => 'sometimes|email',
                'subject' => 'sometimes|string',
                'content' => 'sometimes|string',
                'text' => 'sometimes|string',
                'html' => 'sometimes|string',
                'to' => 'sometimes|array',
                'headers' => 'sometimes|array',
            ]);

            // Extract email details
            $fromEmail = $validated['from'] ?? $request->input('envelope.from') ?? 'unknown@example.com';
            $subject = $validated['subject'] ?? 'No Subject';
            $content = $validated['content'] ?? $validated['text'] ?? $validated['html'] ?? 'No content';
            $headers = $validated['headers'] ?? [];

            // Check if this is for support@taskpilot.us
            $toEmails = $validated['to'] ?? [$request->input('envelope.to')];
            $isSupportEmail = false;

            foreach ((array) $toEmails as $email) {
                if (is_array($email)) {
                    $email = $email['email'] ?? '';
                }
                if (str_contains(strtolower($email), 'support@taskpilot.us')) {
                    $isSupportEmail = true;
                    break;
                }
            }

            if (! $isSupportEmail) {
                Log::info('❌ Email not for support@taskpilot.us, ignoring');

                return response()->json(['message' => 'Email not for support'], 200);
            }

            // Forward the email
            $success = EmailForwardingService::forwardSupportEmail(
                subject: $subject,
                content: $content,
                fromEmail: $fromEmail,
                headers: $headers
            );

            if ($success) {
                Log::info('✅ Email forwarded successfully via webhook');

                return response()->json(['message' => 'Email forwarded successfully'], 200);
            } else {
                Log::error('❌ Failed to forward email via webhook');

                return response()->json(['message' => 'Failed to forward email'], 500);
            }

        } catch (\Exception $e) {
            Log::error('❌ Exception in email webhook', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['message' => 'Webhook error'], 500);
        }
    }

    /**
     * Test endpoint for manual email forwarding
     */
    public function testForward(Request $request)
    {
        $validated = $request->validate([
            'from' => 'required|email',
            'subject' => 'required|string',
            'content' => 'required|string',
        ]);

        $success = EmailForwardingService::forwardSupportEmail(
            subject: $validated['subject'],
            content: $validated['content'],
            fromEmail: $validated['from']
        );

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Email forwarded successfully' : 'Failed to forward email',
        ]);
    }
}
