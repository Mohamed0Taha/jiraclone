<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class MonitorEmailSystem extends Command
{
    protected $signature = 'email:monitor 
                            {--watch : Keep monitoring continuously}';

    protected $description = 'Monitor the email forwarding system status';

    public function handle()
    {
        $watch = $this->option('watch');

        do {
            $this->info("\n🔍 TaskPilot Email System Status - ".now()->format('Y-m-d H:i:s'));
            $this->info('='.str_repeat('=', 60));

            // Check scheduler status
            $this->info('⚡ Scheduler Status:');
            $processes = shell_exec("ps aux | grep 'schedule:work' | grep -v grep");
            if ($processes) {
                $this->line('   ✅ Laravel Scheduler: RUNNING');
            } else {
                $this->line('   ❌ Laravel Scheduler: NOT RUNNING');
                $this->comment('   💡 Start with: php artisan schedule:work &');
            }

            // Check inbox status
            $this->info("\n📬 Inbox Status:");
            try {
                $hostname = env('SUPPORT_IMAP_HOST', 'mail.privateemail.com');
                $username = env('SUPPORT_EMAIL_USERNAME', 'support@taskpilot.us');
                $password = env('SUPPORT_EMAIL_PASSWORD');
                $port = env('SUPPORT_IMAP_PORT', 993);
                $encryption = env('SUPPORT_IMAP_ENCRYPTION', 'ssl');

                $mailbox = "{{$hostname}:{$port}/imap/{$encryption}/novalidate-cert}INBOX";
                $connection = @imap_open($mailbox, $username, $password, OP_READONLY);

                if ($connection) {
                    $status = imap_status($connection, $mailbox, SA_ALL);
                    $this->line('   ✅ Connection: ACTIVE');
                    $this->line('   📬 Total emails: '.$status->messages);
                    $this->line('   📩 Unread emails: '.$status->unseen);

                    if ($status->unseen > 0) {
                        $this->comment("   🔔 {$status->unseen} unread emails waiting for processing");
                    } else {
                        $this->line('   ✅ All emails processed');
                    }

                    imap_close($connection);
                } else {
                    $this->line('   ❌ Connection: FAILED');
                }
            } catch (\Exception $e) {
                $this->line('   ❌ Error: '.$e->getMessage());
            }

            // Check configuration
            $this->info("\n⚙️ Configuration:");
            $this->line('   📧 Source: support@taskpilot.us');
            $this->line('   📨 Target: taha.elfatih@gmail.com');
            $this->line('   🔄 Frequency: Every 5 minutes');
            $this->line('   🏗️ Provider: PrivateEmail.com → Mailtrap → Gmail');

            // Show recent logs
            $this->info("\n📋 Recent Activity:");
            $logFile = storage_path('logs/laravel.log');
            if (file_exists($logFile)) {
                $logs = shell_exec("tail -n 3 {$logFile} | grep -i email");
                if ($logs) {
                    $this->line('   '.str_replace("\n", "\n   ", trim($logs)));
                } else {
                    $this->line('   📭 No recent email activity');
                }
            }

            $this->info("\n🎯 System Ready: ".($processes ? 'YES ✅' : 'NO ❌'));

            if ($watch) {
                $this->comment("\n⏰ Next check in 30 seconds... (Ctrl+C to stop)");
                sleep(30);
                $this->info("\n".str_repeat('─', 70));
            }

        } while ($watch);

        return Command::SUCCESS;
    }
}
