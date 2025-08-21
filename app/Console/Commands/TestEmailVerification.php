<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\URL;
use App\Models\User;

class TestEmailVerification extends Command
{
    protected $signature = 'test:email-verification {user-id?}';
    protected $description = 'Test email verification URL generation and validation';

    public function handle()
    {
        $userId = $this->argument('user-id');
        
        if (!$userId) {
            $userId = $this->ask('Enter user ID to test verification for');
        }
        
        $user = User::find($userId);
        
        if (!$user) {
            $this->error("User with ID {$userId} not found.");
            return;
        }
        
        $this->info("Testing email verification for user: {$user->email}");
        
        // Generate verification URL
        $relativeUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ],
            false // relative signature
        );
        
        $fullUrl = rtrim(config('app.url'), '/') . $relativeUrl;
        
        $this->info("Generated URLs:");
        $this->line("Relative: {$relativeUrl}");
        $this->line("Full: {$fullUrl}");
        
        // Test signature validation
        $request = request();
        $testRequest = $request->create($fullUrl);
        
        try {
            $isValid = URL::hasValidSignature($testRequest, false);
            $this->info("Relative signature validation: " . ($isValid ? 'VALID' : 'INVALID'));
        } catch (\Exception $e) {
            $this->error("Relative signature validation error: " . $e->getMessage());
        }
        
        try {
            $isValid = URL::hasValidSignature($testRequest, true);
            $this->info("Absolute signature validation: " . ($isValid ? 'VALID' : 'INVALID'));
        } catch (\Exception $e) {
            $this->error("Absolute signature validation error: " . $e->getMessage());
        }
        
        $this->info("\nYou can test this URL in your browser:");
        $this->line($fullUrl);
    }
}
