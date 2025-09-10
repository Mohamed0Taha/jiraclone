<?php

namespace App\Console\Commands;

use App\Services\EmailForwardingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class FetchSupportEmails extends Command
{
    protected $signature = 'email:fetch-support 
                            {--mark-read : Mark emails as read after processing}
                            {--delete : Delete emails after forwarding}
                            {--limit=10 : Limit number of emails to process}';

    protected $description = 'Fetch emails from support@taskpilot.us and forward them to Gmail';

    public function handle()
    {
        $this->info('📬 Fetching emails from support@taskpilot.us...');

        try {
            if (! extension_loaded('imap')) {
                $this->error('❌ PHP IMAP extension not loaded. Add ext-imap to composer.json or enable it.');
                Log::error('FetchSupportEmails: IMAP extension missing');

                return Command::FAILURE;
            }

            // Get PrivateEmail IMAP settings
            $hostname = env('SUPPORT_IMAP_HOST', 'mail.privateemail.com');
            $username = env('SUPPORT_EMAIL_USERNAME', 'support@taskpilot.us');
            $password = env('SUPPORT_EMAIL_PASSWORD');
            $port = env('SUPPORT_IMAP_PORT', 993);
            $encryption = env('SUPPORT_IMAP_ENCRYPTION', 'ssl');
            $novalidate = env('SUPPORT_IMAP_NOVALIDATE', false); // set to true if cert issues

            if (! $password) {
                $this->error('❌ SUPPORT_EMAIL_PASSWORD not set in .env file');

                return Command::FAILURE;
            }

            $this->line("📡 Connecting to: {$hostname}:{$port}");

            // Connect to IMAP
            $flags = "/imap/{$encryption}".($novalidate ? '/novalidate-cert' : '');
            $mailbox = "{{$hostname}:{$port}{$flags}}INBOX";
            Log::info('FetchSupportEmails connecting', ['mailbox' => $mailbox, 'user' => $username]);
            $connection = imap_open($mailbox, $username, $password);

            if (! $connection) {
                $this->error('❌ Failed to connect to IMAP server');
                $this->error('Error: '.imap_last_error());

                return Command::FAILURE;
            }

            $this->info('✅ Connected to support@taskpilot.us inbox');

            // Get unread emails
            $emails = @imap_search($connection, 'UNSEEN') ?: [];

            if (empty($emails)) {
                $this->info('📭 No new emails found');
                imap_close($connection);

                return Command::SUCCESS;
            }

            $limit = $this->option('limit');
            $processed = 0;

            foreach (array_slice($emails, 0, (int) $limit) as $emailId) {
                $this->processEmail($connection, $emailId);
                $processed++;

                if ($this->option('mark-read')) {
                    imap_setflag_full($connection, $emailId, '\\Seen');
                }

                if ($this->option('delete')) {
                    imap_delete($connection, $emailId);
                }
            }

            if ($this->option('delete')) {
                imap_expunge($connection);
            }

            imap_close($connection);

            $this->info("✅ Processed {$processed} emails");

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('❌ Error: '.$e->getMessage());
            Log::error('Email fetching failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return Command::FAILURE;
        }
    }

    private function processEmail($connection, $emailId)
    {
        try {
            // Get email header
            $header = imap_headerinfo($connection, $emailId);
            $structure = imap_fetchstructure($connection, $emailId);
            $body = '';
            if ($structure && isset($structure->parts) && count($structure->parts) > 0) {
                // walk parts for first text/plain
                foreach ($structure->parts as $index => $part) {
                    $partNum = $index + 1;
                    if ($part->type === 0) { // text
                        $raw = imap_fetchbody($connection, $emailId, (string) $partNum);
                        if ($part->encoding == 3) { // base64
                            $raw = base64_decode($raw);
                        } elseif ($part->encoding == 4) { // quoted printable
                            $raw = quoted_printable_decode($raw);
                        }
                        $body = $raw;
                        break;
                    }
                }
            } else {
                $raw = imap_fetchbody($connection, $emailId, 1);
                $body = $raw ?: '';
            }

            // Extract email details
            $from = $header->from[0]->mailbox.'@'.$header->from[0]->host;
            $subject = isset($header->subject) ? $header->subject : 'No Subject';

            // Decode if needed
            if (function_exists('imap_utf8')) {
                $subject = imap_utf8($subject);
            }
            // Normalize body length for logs
            $preview = mb_substr(trim(strip_tags($body)), 0, 120);
            Log::info('FetchSupportEmails processing email', [
                'id' => $emailId,
                'from' => $from,
                'subject' => $subject,
                'preview' => $preview,
            ]);

            $this->line("📧 Processing: {$subject} from {$from}");

            // Forward the email
            $success = EmailForwardingService::forwardSupportEmail(
                subject: $subject,
                content: $body,
                fromEmail: $from,
                headers: []
            );

            $this->line($success ? '   ✅ Forwarded successfully' : '   ❌ Forwarding failed');

        } catch (\Exception $e) {
            $this->line('   ❌ Error processing email: '.$e->getMessage());
        }
    }
}
