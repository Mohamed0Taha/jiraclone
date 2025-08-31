<?php

namespace App\Console\Commands;

use App\Models\CertificationAttempt;
use App\Models\User;
use Illuminate\Console\Command;

class ForceCertificationPractical extends Command
{
    protected $signature = 'cert:force-practical {email} {--create-simulation}';

    protected $description = 'Force a user certification attempt into practical phase (optionally auto-create simulation)';

    public function handle(): int
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();
        if (! $user) {
            $this->error('User not found');

            return 1;
        }

        $attempt = CertificationAttempt::firstOrCreate(
            ['user_id' => $user->id],
            ['phase' => 'pm_concepts', 'current_step' => 1, 'total_score' => 0, 'max_possible_score' => 0, 'percentage' => 0]
        );
        $attempt->update(['phase' => 'practical_scenario', 'total_score' => 90, 'max_possible_score' => 100, 'percentage' => 90, 'passed' => 1]);
        $this->info('Attempt '.$attempt->id.' forced to practical_scenario.');

        if ($this->option('create-simulation')) {
            $this->warn('Legacy simulation system removed; create-simulation option no longer available.');
        }

        return 0;
    }
}
