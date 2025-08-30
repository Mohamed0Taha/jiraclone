<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\CertificationAttempt;
use App\Models\VirtualProjectSimulation;
use App\Services\SimulationProjectGenerator;

class ForceCertificationPractical extends Command
{
    protected $signature = 'cert:force-practical {email} {--create-simulation}';
    protected $description = 'Force a user certification attempt into practical phase (optionally auto-create simulation)';

    public function handle(): int
    {
        $email = $this->argument('email');
        $user = User::where('email',$email)->first();
        if (!$user) { $this->error('User not found'); return 1; }

        $attempt = CertificationAttempt::firstOrCreate(
            ['user_id' => $user->id],
            ['phase' => 'pm_concepts','current_step'=>1,'total_score'=>0,'max_possible_score'=>0,'percentage'=>0]
        );
        $attempt->update(['phase'=>'practical_scenario','total_score'=>90,'max_possible_score'=>100,'percentage'=>90,'passed'=>1]);
        $this->info('Attempt '.$attempt->id.' forced to practical_scenario.');

        if ($this->option('create-simulation')) {
            $existing = VirtualProjectSimulation::where('user_id',$user->id)
                ->whereJsonContains('meta->certification_attempt_id',$attempt->id)
                ->first();
            if ($existing) {
                $this->warn('Simulation already exists: ID '.$existing->id);
            } else {
                /** @var SimulationProjectGenerator $gen */
                $gen = app(SimulationProjectGenerator::class);
                $sim = $gen->generate($user,true);
                $sim->update(['meta'=>array_merge($sim->meta??[],[
                    'certification_mode'=>true,
                    'certification_attempt_id'=>$attempt->id,
                    'exam_mode'=>true,
                    'single_attempt'=>true
                ])]);
                $this->info('Created simulation ID '.$sim->id);
            }
        }
        return 0;
    }
}
