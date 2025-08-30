<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\CertificationAttempt;
use App\Models\CertificationAnswer;
use App\Models\PMQuestion;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ForceCompleteCertification extends Command
{
    protected $signature = 'cert:force-complete {email? : User email to force complete (optional)}';
    protected $description = 'Force-create a fully passed certification attempt (theory + practical) for a user to enable sharing tests.';

    public function handle(): int
    {
        $email = $this->argument('email');
        $user = null;
        if ($email) {
            $user = User::where('email', $email)->first();
            if (! $user) {
                $this->error('User with email '.$email.' not found.');
                return Command::FAILURE;
            }
        } else {
            $user = User::orderBy('id')->first();
            if (! $user) {
                $this->error('No users exist. Create a user first.');
                return Command::FAILURE;
            }
            $this->warn('No email provided. Using first user: '.$user->email);
        }

        // Ensure we have questions
        $questions = PMQuestion::inRandomOrder()->take(15)->get();
        if ($questions->isEmpty()) {
            $this->error('No PM questions found. Run seeders first.');
            return Command::FAILURE;
        }

        // Reset previous attempts
        CertificationAttempt::where('user_id', $user->id)->delete();

        $serial = (string) Str::uuid();
        $now = Carbon::now();

        $attempt = CertificationAttempt::create([
            'user_id' => $user->id,
            'phase' => 'certification_complete',
            'current_step' => 6,
            'selected_question_ids' => json_encode($questions->pluck('id')->toArray()),
            'total_score' => 0, // temp
            'max_possible_score' => 0, // temp
            'percentage' => 0, // temp
            'passed' => true,
            'serial' => $serial,
            'completed_at' => $now,
            'practical_performance' => [
                ['step' => 1,'challenge_type' => 'requirements_definition','score' => 20,'max_score' => 20],
                ['step' => 2,'challenge_type' => 'timeline_creation','score' => 25,'max_score' => 25],
                ['step' => 3,'challenge_type' => 'crisis_management','score' => 30,'max_score' => 30],
                ['step' => 4,'challenge_type' => 'resource_optimization','score' => 25,'max_score' => 25],
                ['step' => 5,'challenge_type' => 'ai_implementation','score' => 35,'max_score' => 35],
            ],
        ]);

        // Create perfect answers
        $totalScore = 0; $maxScore = 0;
        foreach ($questions as $q) {
            $points = $q->points ?? 5;
            CertificationAnswer::create([
                'certification_attempt_id' => $attempt->id,
                'pm_question_id' => $q->id,
                'user_answer' => $q->correct_answer ?: [],
                'is_correct' => true,
                'points_earned' => $points,
                'answered_at' => $now,
            ]);
            $totalScore += $points;
            $maxScore += $points;
        }

        // Add practical points
        $practicalTotal = 20+25+30+25+35; // 135
        $practicalMax = 20+25+30+25+35; // 135
        $overallScore = $totalScore + $practicalTotal;
        $overallMax = $maxScore + $practicalMax;
        $percentage = $overallMax > 0 ? ($overallScore / $overallMax) * 100 : 0;

        $attempt->update([
            'total_score' => $overallScore,
            'max_possible_score' => $overallMax,
            'percentage' => $percentage,
            'passed' => true,
        ]);

        $site = rtrim(config('app.url') ?: url('/'), '/');
        $certificateUrl = $site.'/certificates/'.$serial;
        $badgeUrl = $site.'/certificates/'.$serial.'/badge';
        $this->info('Forced certification completion for '.$user->email);
        $this->info('Score: '.round($percentage,2).'% ('.$overallScore.'/'.$overallMax.')');
        $this->info('Certificate: '.$certificateUrl);
        $this->info('Badge:       '.$badgeUrl);
        $this->info('You can now use these URLs for LinkedIn sharing tests.');

        return Command::SUCCESS;
    }
}
