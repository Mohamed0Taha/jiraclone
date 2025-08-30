<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\CertificationAttempt;
use App\Models\CertificationAnswer;

class ResetCertificationAttempt extends Command
{
    protected $signature = 'cert:reset {email : User email to reset certification attempt for} {--force : Skip confirmation prompt}';
    protected $description = 'Delete a user\'s certification attempt and related answers so they can restart the exam';

    public function handle(): int
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();
        if (!$user) { $this->error('User not found'); return 1; }

        $attempts = CertificationAttempt::where('user_id',$user->id)->get();
        if ($attempts->isEmpty()) { $this->info('No certification attempts exist for this user. Nothing to reset.'); return 0; }

        if (!$this->option('force')) {
            if (!$this->confirm('This will permanently delete '. $attempts->count() .' attempt(s) and all related answers. Continue?')) {
                $this->warn('Aborted.');
                return 1;
            }
        }

        $attemptIds = $attempts->pluck('id');
        $deletedAnswers = CertificationAnswer::whereIn('certification_attempt_id',$attemptIds)->delete();
        $attemptsDeleted = CertificationAttempt::whereIn('id',$attemptIds)->delete();

        $this->info('Deleted attempts: '. $attemptsDeleted .' | Deleted answers: '. $deletedAnswers);
        $this->info('User can now start a fresh certification attempt.');
        return 0;
    }
}
