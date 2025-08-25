<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Twilio\Rest\Client;

class TwilioDebug extends Command
{
    protected $signature = 'twilio:debug';

    protected $description = 'Debug Twilio connection and account info';

    public function handle()
    {
        try {
            $this->info('=== Twilio Debug Information ===');

            // Test basic configuration
            $accountSid = config('twilio.account_sid');
            $authToken = config('twilio.auth_token');
            $phoneNumber = config('twilio.phone_number');

            $this->info('Account SID: '.($accountSid ? substr($accountSid, 0, 8).'...' : 'NOT SET'));
            $this->info('Auth Token: '.($authToken ? 'SET' : 'NOT SET'));
            $this->info('Phone Number: '.($phoneNumber ?: 'NOT SET'));

            // Test Twilio client initialization
            $this->info("\n=== Testing Twilio Client ===");
            $client = new Client($accountSid, $authToken);
            $this->info('✅ Twilio client created successfully');

            // Test account access
            $this->info("\n=== Testing Account Access ===");
            $account = $client->api->v2010->accounts($accountSid)->fetch();
            $this->info('✅ Account accessible: '.$account->friendlyName);
            $this->info('Account Status: '.$account->status);

            // List phone numbers
            $this->info("\n=== Available Phone Numbers ===");
            $phoneNumbers = $client->incomingPhoneNumbers->read();

            if (count($phoneNumbers) == 0) {
                $this->warn('⚠️  No phone numbers found in account!');
                $this->warn('You need to purchase a phone number from Twilio Console');
            } else {
                foreach ($phoneNumbers as $number) {
                    $capabilities = [];
                    if ($number->capabilities->sms) {
                        $capabilities[] = 'SMS';
                    }
                    if ($number->capabilities->voice) {
                        $capabilities[] = 'Voice';
                    }

                    $this->info('📱 '.$number->phoneNumber.' ('.implode(', ', $capabilities).')');
                }
            }

        } catch (\Exception $e) {
            $this->error('❌ Error: '.$e->getMessage());
            $this->error('Stack trace: '.$e->getTraceAsString());
        }
    }
}
