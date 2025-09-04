<?php

namespace App\Console\Commands;

use App\Services\EmailForwardingService;
use Illuminate\Console\Command;

class ForceProcessEmail extends Command
{
    protected $signature = 'email:force-process 
                            {email-id : The email ID to process}
                            {--forward : Actually forward the email}';

    protected $description = 'Force process a specific email (for testing)';

    public function handle()
    {
        $emailId = $this->argument('email-id');
        $shouldForward = $this->option('forward');
        
        $this->info("🔍 Force processing email #{$emailId}");
        
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
            
            // Get email details
            $header = imap_headerinfo($connection, $emailId);
            $body = imap_fetchbody($connection, $emailId, 1);
            
            if (!$header) {
                $this->error("❌ Email #{$emailId} not found");
                imap_close($connection);
                return Command::FAILURE;
            }
            
            // Extract email details
            $from = $header->from[0]->mailbox . '@' . $header->from[0]->host;
            $subject = isset($header->subject) ? $header->subject : 'No Subject';
            $date = isset($header->date) ? date('Y-m-d H:i:s', strtotime($header->date)) : 'Unknown';
            
            // Decode if needed
            if (function_exists('imap_utf8')) {
                $subject = imap_utf8($subject);
                $body = imap_utf8($body);
            }
            
            $this->info("📧 Email Details:");
            $this->line("   📅 Date: {$date}");
            $this->line("   👤 From: {$from}");
            $this->line("   📄 Subject: {$subject}");
            $this->line("   📝 Content: " . substr(strip_tags($body), 0, 100) . "...");
            
            if ($shouldForward) {
                $this->info("");
                $this->info("🔄 Forwarding email...");
                
                $success = EmailForwardingService::forwardSupportEmail(
                    subject: $subject,
                    content: $body,
                    fromEmail: $from,
                    headers: []
                );
                
                if ($success) {
                    $this->info("✅ Email forwarded successfully to taha.elfatih@gmail.com");
                } else {
                    $this->error("❌ Failed to forward email");
                }
            } else {
                $this->comment("");
                $this->comment("💡 Use --forward to actually forward this email");
            }
            
            imap_close($connection);
            return Command::SUCCESS;
            
        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
