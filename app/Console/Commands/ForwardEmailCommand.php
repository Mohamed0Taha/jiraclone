<?php

namespace App\Console\Commands;

use App\Services\EmailForwardingService;
use Illuminate\Console\Command;

class ForwardEmailCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:forward 
                            {from : The sender email address}
                            {subject : The email subject}
                            {content : The email content}
                            {--to=taha.elfatih@gmail.com : Target email address}
                            {--headers= : Additional headers as JSON}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Forward emails from support@taskpilot.us to Gmail';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $from = $this->argument('from');
        $subject = $this->argument('subject');
        $content = $this->argument('content');
        $to = $this->option('to');
        $headers = $this->option('headers') ? json_decode($this->option('headers'), true) : [];

        $this->info("Forwarding email from: {$from}");
        $this->info("Subject: {$subject}");
        $this->info("To: {$to}");

        try {
            $success = EmailForwardingService::forwardSupportEmail(
                subject: $subject,
                content: $content,
                fromEmail: $from,
                headers: $headers
            );

            if ($success) {
                $this->info('✅ Email forwarded successfully!');

                return Command::SUCCESS;
            } else {
                $this->error('❌ Failed to forward email. Check logs for details.');

                return Command::FAILURE;
            }
        } catch (\Exception $e) {
            $this->error('❌ Exception occurred: '.$e->getMessage());

            return Command::FAILURE;
        }
    }
}
