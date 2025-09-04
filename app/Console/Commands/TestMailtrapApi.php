<?php

namespace App\Console\Commands;

use App\Services\MailtrapApiService;
use Illuminate\Console\Command;

class TestMailtrapApi extends Command
{
    protected $signature = 'mailtrap:test {--method=api : Test method (api or both)}';
    protected $description = 'Test Mailtrap API and SMTP forwarding';

    public function handle()
    {
        $method = $this->option('method');
        
        $this->info('🧪 Testing Mailtrap Email Forwarding');
        $this->info('=====================================');
        
        if ($method === 'api' || $method === 'both') {
            $this->info('🔗 Testing Mailtrap API...');
            $apiService = new MailtrapApiService();
            
            if ($apiService->testConnection()) {
                $this->info('✅ Mailtrap API test successful!');
            } else {
                $this->error('❌ Mailtrap API test failed!');
            }
            
            // Test forwarding
            $this->info('📧 Testing API forwarding...');
            $success = $apiService->forwardEmail(
                subject: 'API Test Forward',
                content: 'This is a test email forwarded via Mailtrap API',
                fromEmail: 'test@example.com'
            );
            
            if ($success) {
                $this->info('✅ API forwarding test successful!');
            } else {
                $this->error('❌ API forwarding test failed!');
            }
        }
        
        if ($method === 'both') {
            $this->info('');
            $this->info('🔗 Testing SMTP fallback...');
            
            // Test the combined service
            \App\Services\EmailForwardingService::forwardSupportEmail(
                subject: 'Combined Service Test',
                content: 'This tests both API and SMTP fallback',
                fromEmail: 'test@example.com'
            );
        }
        
        $this->info('');
        $this->info('🎉 Testing complete! Check your Gmail at taha.elfatih@gmail.com');
    }
}
