<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CheckSupportInbox extends Command
{
    protected $signature = 'email:check-inbox 
                            {--all : Show all emails, not just unread}
                            {--limit=5 : Limit number of emails to show}';

    protected $description = 'Check what emails are in the support@taskpilot.us inbox';

    public function handle()
    {
        $this->info("📬 Checking support@taskpilot.us inbox...");
        
        try {
            $hostname = env('SUPPORT_IMAP_HOST', 'mail.privateemail.com');
            $username = env('SUPPORT_EMAIL_USERNAME', 'support@taskpilot.us');
            $password = env('SUPPORT_EMAIL_PASSWORD');
            $port = env('SUPPORT_IMAP_PORT', 993);
            $encryption = env('SUPPORT_IMAP_ENCRYPTION', 'ssl');
            
            $mailbox = "{{$hostname}:{$port}/imap/{$encryption}/novalidate-cert}INBOX";
            $connection = imap_open($mailbox, $username, $password, OP_READONLY);
            
            if (!$connection) {
                $this->error("❌ Failed to connect to inbox");
                return Command::FAILURE;
            }
            
            $this->info("✅ Connected to inbox");
            
            // Get email count
            $status = imap_status($connection, $mailbox, SA_ALL);
            $this->info("📊 Inbox Status:");
            $this->line("   📬 Total messages: " . $status->messages);
            $this->line("   📩 Unread messages: " . $status->unseen);
            $this->line("   🗂️ Recent messages: " . $status->recent);
            
            if ($status->messages == 0) {
                $this->info("📭 Inbox is empty");
                imap_close($connection);
                return Command::SUCCESS;
            }
            
            // Search for emails
            if ($this->option('all')) {
                $emails = imap_search($connection, 'ALL');
                $this->info("\n📧 All emails:");
            } else {
                $emails = imap_search($connection, 'UNSEEN');
                $this->info("\n📧 Unread emails:");
            }
            
            if (!$emails) {
                $this->info("   📭 No emails found");
                imap_close($connection);
                return Command::SUCCESS;
            }
            
            $limit = $this->option('limit');
            $emails = array_slice($emails, 0, $limit);
            
            foreach ($emails as $emailId) {
                $header = imap_headerinfo($connection, $emailId);
                
                $from = isset($header->from[0]) ? 
                    $header->from[0]->mailbox . '@' . $header->from[0]->host : 
                    'Unknown';
                    
                $subject = isset($header->subject) ? 
                    $header->subject : 'No Subject';
                    
                $date = isset($header->date) ? 
                    date('Y-m-d H:i:s', strtotime($header->date)) : 
                    'Unknown date';
                    
                $flags = [];
                if ($header->Unseen == 'U') $flags[] = 'UNREAD';
                if ($header->Recent == 'N') $flags[] = 'RECENT';
                if (empty($flags)) $flags[] = 'READ';
                
                $this->line("");
                $this->line("   📧 Email #{$emailId}");
                $this->line("   📅 Date: {$date}");
                $this->line("   👤 From: {$from}");
                $this->line("   📄 Subject: {$subject}");
                $this->line("   🏷️ Status: " . implode(', ', $flags));
            }
            
            imap_close($connection);
            
            $this->info("");
            $this->info("✅ Inbox check complete!");
            
            if (!$this->option('all') && $status->unseen == 0) {
                $this->comment("💡 No unread emails. Use --all to see all emails");
                $this->comment("💡 Send a test email to support@taskpilot.us to test forwarding");
            }
            
            return Command::SUCCESS;
            
        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
