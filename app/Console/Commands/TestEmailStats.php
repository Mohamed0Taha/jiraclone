<?php

namespace App\Console\Commands;

use App\Models\EmailLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TestEmailStats extends Command
{
    protected $signature = 'email:test-stats';
    protected $description = 'Test email statistics for dashboard';

    public function handle()
    {
        $this->info('📊 Testing Email Statistics...');
        
        // Test database connection and email logs
        try {
            $totalEmails = EmailLog::count();
            $this->info("✅ Total emails in database: {$totalEmails}");
            
            if ($totalEmails === 0) {
                $this->warn('No emails found in database. Creating sample data...');
                $this->call('email:create-samples');
                $totalEmails = EmailLog::count();
                $this->info("✅ After creating samples: {$totalEmails}");
            }
            
            // Test success rate calculation
            $successful = EmailLog::where('sent_successfully', true)->count();
            $failed = EmailLog::where('sent_successfully', false)->count();
            $successRate = $totalEmails > 0 ? round(($successful / $totalEmails) * 100, 1) : 0;
            
            $this->info("✅ Successful emails: {$successful}");
            $this->info("⚠️  Failed emails: {$failed}");
            $this->info("📈 Success rate: {$successRate}%");
            
            // Test recent emails
            $recentCount = EmailLog::where('created_at', '>=', now()->subDay())->count();
            $this->info("📧 Recent emails (24h): {$recentCount}");
            
            // Test email types
            $types = EmailLog::selectRaw('type, COUNT(*) as count')
                ->groupBy('type')
                ->get();
                
            $this->info("📋 Email types breakdown:");
            foreach ($types as $type) {
                $this->line("   • {$type->type}: {$type->count}");
            }
            
            $this->info("\n🎉 Email stats test completed successfully!");
            $this->info("Dashboard should now display email information at /dashboard");
            
        } catch (\Exception $e) {
            $this->error("❌ Error testing email stats: " . $e->getMessage());
            return 1;
        }
        
        return 0;
    }
}
