<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Twilio\Exceptions\TwilioException;
use Twilio\Rest\Client;

class TwilioService
{
    protected Client $twilio;

    protected string $phoneNumber;

    public function __construct()
    {
        $accountSid = config('twilio.account_sid');
        $authToken = config('twilio.auth_token');

        if (! $accountSid || ! $authToken) {
            throw new \Exception('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
        }

        $this->twilio = new Client($accountSid, $authToken);
        Log::info('Twilio initialized with Auth Token authentication', [
            'account_sid' => substr($accountSid, 0, 8).'...',
        ]);

        $this->phoneNumber = config('twilio.phone_number');

        Log::info('TwilioService initialized', [
            'phone_number' => $this->phoneNumber,
        ]);
    }

    /**
     * Send SMS message
     */
    public function sendSMS(string $to, string $message, array $options = []): array
    {
        if (! config('twilio.sms_enabled')) {
            Log::info('SMS messaging disabled in configuration');

            return ['success' => false, 'error' => 'SMS messaging is disabled'];
        }

        if (! $this->phoneNumber) {
            Log::error('Twilio phone number not configured');

            return ['success' => false, 'error' => 'Twilio phone number not configured'];
        }

        try {
            // Format phone number
            $to = $this->formatPhoneNumber($to);

            // Truncate message if too long
            $maxLength = config('twilio.max_message_length', 160);
            if (strlen($message) > $maxLength) {
                $message = substr($message, 0, $maxLength - 3).'...';
                Log::warning('SMS message truncated to fit limit', ['max_length' => $maxLength]);
            }

            $messageData = [
                'from' => $this->phoneNumber,
                'body' => $message,
            ];

            // Add optional parameters
            if (isset($options['statusCallback'])) {
                $messageData['statusCallback'] = $options['statusCallback'];
            }

            if (isset($options['mediaUrl'])) {
                $messageData['mediaUrl'] = $options['mediaUrl'];
            }

            $twilioMessage = $this->twilio->messages->create($to, $messageData);

            Log::info('SMS message sent successfully', [
                'to' => $to,
                'from' => $this->phoneNumber,
                'message_sid' => $twilioMessage->sid,
                'status' => $twilioMessage->status,
            ]);

            return [
                'success' => true,
                'message_sid' => $twilioMessage->sid,
                'status' => $twilioMessage->status,
                'to' => $to,
                'from' => $this->phoneNumber,
                'body' => $message,
            ];

        } catch (TwilioException $e) {
            Log::error('Twilio SMS error', [
                'error_code' => $e->getCode(),
                'error_message' => $e->getMessage(),
                'to' => $to,
                'from' => $this->phoneNumber,
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'error_code' => $e->getCode(),
            ];
        }
    }

    /**
     * Send message via SMS
     */
    public function sendMessage(string $to, string $message, array $options = []): array
    {
        return $this->sendSMS($to, $message, $options);
    }

    /**
     * Format phone number (ensure it has country code)
     */
    protected function formatPhoneNumber(string $phoneNumber): string
    {
        // Remove any whitespace and special characters except +
        $phoneNumber = preg_replace('/[^\d+]/', '', $phoneNumber);

        // If it doesn't start with +, add default country code
        if (! str_starts_with($phoneNumber, '+')) {
            $defaultCountryCode = config('twilio.default_country_code', '+1');
            $phoneNumber = $defaultCountryCode.$phoneNumber;
        }

        return $phoneNumber;
    }

    /**
     * Get account information
     */
    public function getAccountInfo(): array
    {
        try {
            $account = $this->twilio->api->v2010->accounts(config('twilio.account_sid'))->fetch();

            return [
                'success' => true,
                'account_sid' => $account->sid,
                'friendly_name' => $account->friendlyName,
                'status' => $account->status,
                'type' => $account->type,
            ];
        } catch (TwilioException $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get phone numbers associated with account
     */
    public function getPhoneNumbers(): array
    {
        try {
            $phoneNumbers = $this->twilio->incomingPhoneNumbers->read();

            $numbers = [];
            foreach ($phoneNumbers as $number) {
                $numbers[] = [
                    'phone_number' => $number->phoneNumber,
                    'friendly_name' => $number->friendlyName,
                    'capabilities' => [
                        'sms' => $number->capabilities['sms'] ?? false,
                        'voice' => $number->capabilities['voice'] ?? false,
                    ],
                ];
            }

            return [
                'success' => true,
                'phone_numbers' => $numbers,
            ];
        } catch (TwilioException $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Validate phone number format
     */
    public function validatePhoneNumber(string $phoneNumber): bool
    {
        $formatted = $this->formatPhoneNumber($phoneNumber);

        return preg_match('/^\+\d{10,15}$/', $formatted) === 1;
    }

    /**
     * Get service configuration
     */
    public function getConfig(): array
    {
        return [
            'phone_number' => $this->phoneNumber,
            'sms_enabled' => config('twilio.sms_enabled'),
            'max_message_length' => config('twilio.max_message_length'),
            'default_country_code' => config('twilio.default_country_code'),
        ];
    }
}
