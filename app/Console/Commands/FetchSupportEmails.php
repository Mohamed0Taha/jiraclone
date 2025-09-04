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
        $this->info("📬 Fetching emails from support@taskpilot.us...");
        
        try {
            // Get PrivateEmail IMAP settings (you'll need to provide these)
            $hostname = env('SUPPORT_IMAP_HOST', 'mail.privateemail.com'); // Common PrivateEmail IMAP
            $username = env('SUPPORT_EMAIL_USERNAME', 'support@taskpilot.us');
            $password = env('SUPPORT_EMAIL_PASSWORD');
            $port = env('SUPPORT_IMAP_PORT', 993);
            $encryption = env('SUPPORT_IMAP_ENCRYPTION', 'ssl');
            
            if (!$password) {
                $this->error("❌ SUPPORT_EMAIL_PASSWORD not set in .env file");
                return Command::FAILURE;
            }
            
            $this->line("📡 Connecting to: {$hostname}:{$port}");
            
            // Connect to IMAP
            $mailbox = "{{$hostname}:{$port}/imap/{$encryption}}INBOX";
            $connection = imap_open($mailbox, $username, $password);
            
            if (!$connection) {
                $this->error("❌ Failed to connect to IMAP server");
                $this->error("Error: " . imap_last_error());
                return Command::FAILURE;
            }
            
            $this->info("✅ Connected to support@taskpilot.us inbox");
            
            // Get unread emails
            $emails = imap_search($connection, 'UNSEEN');
            
            if (!$emails) {
                $this->info("📭 No new emails found");
                imap_close($connection);
                return Command::SUCCESS;
            }
            
            $limit = $this->option('limit');
            $processed = 0;
            
            foreach (array_slice($emails, 0, $limit) as $emailId) {
                $this->processEmail($connection, $emailId);
                $processed++;
                
                if ($this->option('mark-read')) {
                    imap_setflag_full($connection, $emailId, "\\Seen");
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
            $this->error("❌ Error: " . $e->getMessage());
            Log::error('Email fetching failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }
    
    private function processEmail($connection, $emailId)
    {
        try {
            // Get email header
            $header = imap_headerinfo($connection, $emailId);
            $body = imap_fetchbody($connection, $emailId, 1);
            
            // Extract email details
            $from = $header->from[0]->mailbox . '@' . $header->from[0]->host;
            $subject = isset($header->subject) ? $header->subject : 'No Subject';
            
            // Decode if needed
            if (function_exists('imap_utf8')) {
                $subject = imap_utf8($subject);
                $body = imap_utf8($body);
            }
            
            $this->line("📧 Processing: {$subject} from {$from}");
            
            // Forward the email
            $success = EmailForwardingService::forwardSupportEmail(
                subject: $subject,
                content: $body,
                fromEmail: $from,
                headers: []
            );
            
            if ($success) {
                $this->line("   ✅ Forwarded successfully");
            } else {
                $this->line("   ❌ Forwarding failed");
            }
            
        } catch (\Exception $e) {
            $this->line("   ❌ Error processing email: " . $e->getMessage());
        }
    }
}
