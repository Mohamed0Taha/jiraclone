<?php

namespace App\Console\Commands;

use App\Services\TwilioService;
use Illuminate\Console\Command;

class TestTwilioIntegration extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'twilio:test {receiver_phone} {--message=}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test Twilio SMS integration with a receiver phone number';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $receiverPhone = $this->argument('receiver_phone');
        $message = $this->option('message') ?? 'Test message from TaskPilot automation system!';

        try {
            $twilioService = app(TwilioService::class);

            $this->info('Testing Twilio SMS integration...');
            $this->info('FROM: TaskPilot ('.config('twilio.phone_number').')');
            $this->info("TO: {$receiverPhone}");
            $this->info("Message: {$message}");

            $result = $twilioService->sendSMS($receiverPhone, $message);

            if ($result['success']) {
                $this->info('✅ SMS sent successfully!');
                $this->info("Message SID: {$result['message_sid']}");
                $this->info("Status: {$result['status']}");
            } else {
                $this->error('❌ Failed to send SMS:');
                $this->error($result['error']);
            }

        } catch (\Exception $e) {
            $this->error('❌ Exception occurred:');
            $this->error($e->getMessage());
        }
    }
}
