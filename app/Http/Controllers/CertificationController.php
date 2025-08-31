<?php

namespace App\Http\Controllers;

use App\Models\CertificationAnswer;
use App\Models\CertificationAttempt;
use App\Models\PMQuestion;
use App\Services\OpenAIService;
use App\Services\SimpleSimulationGenerator;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CertificationController extends Controller
{
    public function index(Request $request)
    {
        try {
            // DIAGNOSTIC: verify runtime DB connection + question visibility (temporary)
            try {
                $conn = config('database.default');
                $driver = config('database.connections.'.$conn.'.driver');
                $questionTotal = PMQuestion::count();
                Log::warning('[CERT DIAG] index boot: db_default='.$conn.' driver='.$driver.' question_total='.$questionTotal);
            } catch (\Throwable $e) {
                Log::error('[CERT DIAG] failed to gather initial diagnostics: '.$e->getMessage());
            }

            // Check for existing completed certification
            $latestCompleted = CertificationAttempt::where('user_id', $request->user()->id)
                ->whereNotNull('completed_at')
                ->orderByDesc('completed_at')
                ->first();

            if ($latestCompleted && $latestCompleted->phase === 'certification_complete') {
                // Backfill serial if missing (older records created before public certificate feature)
                if (empty($latestCompleted->serial)) {
                    try {
                        $latestCompleted->serial = (string) Str::uuid();
                        $latestCompleted->save();
                    } catch (\Exception $e) {
                        Log::warning('Failed to backfill serial for attempt ID '.$latestCompleted->id.': '.$e->getMessage());
                    }
                }
                $daysSinceCompletion = now()->diffInDays($latestCompleted->completed_at);

                // If certificate is less than 30 days old, redirect directly to certificate
                if ($daysSinceCompletion < 30) {
                    return redirect('/certificates/'.$latestCompleted->serial);
                }

                // If certificate is older than 30 days, show choice page
                return Inertia::render('Certification/CertificateChoice', [
                    'existingCertificate' => [
                        'id' => $latestCompleted->id,
                        'score' => $latestCompleted->percentage,
                        'completed_at' => $latestCompleted->completed_at->format('F j, Y'),
                        'serial' => $latestCompleted->serial,
                        'days_ago' => $daysSinceCompletion,
                    ],
                    'certificateUrl' => url('/certificates/'.$latestCompleted->serial),
                    'badgeUrl' => url('/certificates/'.$latestCompleted->serial.'/badge'),
                    'canRetake' => true, // Always allow retake for older certificates
                ]);
            }

            // Check for existing incomplete attempts
            $attempt = CertificationAttempt::where('user_id', $request->user()->id)
                ->whereIn('phase', ['pm_concepts', 'practical_scenario'])
                ->orderBy('created_at', 'desc')
                ->first();

            // Check for expired attempts with cooldown
            if ($attempt && $attempt->is_expired && ! $attempt->canStartNewAttempt()) {
                $hoursRemaining = $attempt->getHoursUntilNextAttempt();

                return Inertia::render('Certification/Cooldown', [
                    'hoursRemaining' => $hoursRemaining,
                    'nextAttemptAt' => $attempt->next_attempt_allowed_at->format('M j, Y g:i A'),
                    'reason' => 'Previous exam time expired without completion',
                ]);
            }

            // If expired attempt exists and cooldown has passed, allow new attempt
            if ($attempt && $attempt->is_expired && $attempt->canStartNewAttempt()) {
                $attempt->delete(); // Clean up expired attempt
                $attempt = null;
            }

            // Check for active exam that has expired
            if ($attempt && $attempt->exam_expires_at && $attempt->isTimeExpired() && ! $attempt->is_expired) {
                // Mark as expired and set cooldown
                $attempt->markAsExpired();
                $hoursRemaining = $attempt->getHoursUntilNextAttempt();

                return Inertia::render('Certification/Cooldown', [
                    'hoursRemaining' => $hoursRemaining,
                    'nextAttemptAt' => $attempt->next_attempt_allowed_at->format('M j, Y g:i A'),
                    'reason' => 'Exam time limit exceeded',
                ]);
            }

            // If no attempt exists, show intro page
            if (! $attempt) {
                $projectMgmtCount = PMQuestion::where('category', 'project_management')->count();
                if ($projectMgmtCount === 0) {
                    // Hard guard: no questions visible to web dyno -> configuration / connection mismatch
                    Log::error('[CERT DIAG] No project_management questions visible in web dyno context. Suggest config:clear & migrate --seed.');
                }

                return Inertia::render('Certification/Intro', [
                    'attempt' => null,
                    'totalQuestions' => min(15, $projectMgmtCount),
                    'theoryDurationMinutes' => 20,
                    'practicalEstimatedMinutes' => 10,
                    'passingScore' => 70,
                    'diag' => [
                        'db' => config('database.default'),
                        'question_total' => PMQuestion::count(),
                        'project_mgmt_total' => $projectMgmtCount,
                    ],
                    'diagWarning' => $projectMgmtCount === 0 ? 'No certification questions found on server. Please run migrations & seed or clear config cache.' : null,
                ]);
            }

            $answeredSoFar = CertificationAnswer::where('certification_attempt_id', $attempt->id)->count();
            $remainingSeconds = $attempt->getRemainingTimeSeconds();
            $timeUp = $attempt->isTimeExpired();

            // Intro gate: if no answers yet and no active start timestamp -> show intro page
            if ($attempt->phase === 'pm_concepts' && $answeredSoFar === 0 && ! $attempt->exam_started_at) {
                $projectMgmtCount = PMQuestion::where('category', 'project_management')->count();

                return Inertia::render('Certification/Intro', [
                    'attempt' => $attempt,
                    'totalQuestions' => min(15, $projectMgmtCount),
                    'theoryDurationMinutes' => 20,
                    'practicalEstimatedMinutes' => 10,
                    'passingScore' => 70,
                    'diag' => [
                        'db' => config('database.default'),
                        'question_total' => PMQuestion::count(),
                        'project_mgmt_total' => $projectMgmtCount,
                        'selected_question_ids' => $attempt->selected_question_ids,
                    ],
                    'diagWarning' => $projectMgmtCount === 0 ? 'No certification questions found on server. Please run migrations & seed or clear config cache.' : null,
                ]);
            }

            // Removed temporary bypass forcing practical scenario.

            // Get current question for PM concepts phase
            $currentQuestion = null;
            // Determine total questions from unified general pool
            $availableConceptQuestions = PMQuestion::where('category', 'project_management')->count();
            $totalQuestions = min(15, $availableConceptQuestions);
            $score = $attempt->total_score ?? 0;
            $maxScore = $attempt->max_possible_score ?? 0;

            if ($attempt->phase === 'pm_concepts') {
                // Get the current question (this will handle random selection if needed)
                try {
                    if (! $timeUp) {
                        $currentQuestion = $this->getCurrentQuestion($attempt);
                    } else {
                        $currentQuestion = null; // Time expired -> lock further questions
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to get current question: '.$e->getMessage());
                    $currentQuestion = null;
                }

                // Calculate score from answered questions
                $answeredQuestions = CertificationAnswer::where('certification_attempt_id', $attempt->id)
                    ->with('pmQuestion')
                    ->get();

                $score = $answeredQuestions->sum('points_earned');
                $maxScore = $answeredQuestions->sum(function ($answer) {
                    return $answer->pmQuestion ? $answer->pmQuestion->points : 0;
                });
                $answeredCount = $answeredQuestions->count();

                // Update attempt with current scores
                $attempt->update([
                    'total_score' => $score,
                    'max_possible_score' => $maxScore,
                    'percentage' => $maxScore > 0 ? ($score / $maxScore * 100) : 0,
                ]);

                return Inertia::render('Certification/Index', [
                    'attempt' => $attempt->fresh(),
                    'currentQuestion' => $currentQuestion,
                    'totalQuestions' => $totalQuestions,
                    'answeredCount' => $answeredCount ?? 0,
                    'score' => $score,
                    'maxScore' => $maxScore,
                    'phase' => $attempt->phase,
                    'remainingSeconds' => $remainingSeconds,
                    'timeUp' => $timeUp,
                ]);
            } elseif ($attempt->phase === 'practical_scenario') {
                $request->session()->put('certification_mode', true);
                $request->session()->put('certification_attempt_id', $attempt->id);

                // Show practical scenario instead of virtual project
                return $this->showPracticalScenario($attempt);
            } elseif ($attempt->phase === 'certification_complete') {
                return $this->showFinalResults($attempt);
            }

            // Default fallback
            return redirect()->route('certification.index');
        } catch (\Exception $e) {
            Log::error('Certification index error: '.$e->getMessage());

            return redirect()->route('dashboard')->with('error', 'Unable to load certification page');
        }
    }

    public function practicalScenario(Request $request)
    {
        $attempt = CertificationAttempt::where('user_id', $request->user()->id)
            ->whereIn('phase', ['practical_scenario', 'certification_complete'])
            ->orderBy('created_at', 'desc')
            ->first();

        if (! $attempt) {
            return redirect()->route('certification.index');
        }

        if ($attempt->phase === 'practical_scenario') {
            return $this->showPracticalScenario($attempt);
        } elseif ($attempt->phase === 'certification_complete') {
            return $this->showFinalResults($attempt);
        }

        // Default fallback
        return redirect()->route('certification.index');
    }

    public function results(Request $request)
    {
        $attempt = CertificationAttempt::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->first();

        if (! $attempt) {
            return redirect()->route('certification.index');
        }

        return $this->showFinalResults($attempt);
    }

    /**
     * Generate a fresh simulation dataset (project, tasks, team, events) after certification.
     */
    public function generateSimulation(Request $request, SimpleSimulationGenerator $generator)
    {
        $user = $request->user();
        $data = $generator->generate($user);
        // Store ephemeral simulation in session so simulator page can retrieve
        $request->session()->put('simulator_payload', $data);

        return redirect()->route('simulator.index');
    }

    private function getTheoryQuestions($attempt)
    {
        // Get questions by category in progressive order
        $categories = ['fundamentals', 'planning', 'execution', 'monitoring', 'ai_integration'];
        $currentCategory = $categories[$attempt->current_step - 1] ?? 'fundamentals';

        return PMQuestion::where('category', $currentCategory)
            ->where('is_active', true)
            ->orderBy('difficulty')
            ->orderBy('id')
            ->get()
            ->map(function ($question) {
                return [
                    'id' => $question->id,
                    'category' => $question->category,
                    'difficulty' => $question->difficulty,
                    'points' => $question->points,
                    'type' => $question->type,
                    'question' => $question->question,
                    'options' => $question->options,
                    // Don't send correct answers to frontend
                ];
            });
    }

    private function getPracticalScenario($attempt)
    {
        // Return practical scenario data
        return [
            'scenario' => [
                'title' => 'E-Commerce Mobile App Development',
                'description' => 'You are the project manager for developing a mobile e-commerce app for a retail client. The app needs to support product browsing, user accounts, shopping cart, and payment processing.',
                'constraints' => [
                    'budget' => 80000,
                    'timeline' => 16, // weeks
                    'team_size' => 6,
                    'client_priority' => 'Time to market',
                ],
                'team_members' => [
                    ['id' => 1, 'name' => 'Sarah Chen', 'role' => 'UI/UX Designer', 'skills' => ['Design', 'User Research'], 'capacity' => 40],
                    ['id' => 2, 'name' => 'Mike Johnson', 'role' => 'Lead Developer', 'skills' => ['React Native', 'Node.js'], 'capacity' => 40],
                    ['id' => 3, 'name' => 'Emily Rodriguez', 'role' => 'Backend Developer', 'skills' => ['API Development', 'Database'], 'capacity' => 40],
                    ['id' => 4, 'name' => 'David Kim', 'role' => 'QA Engineer', 'skills' => ['Testing', 'Automation'], 'capacity' => 35],
                    ['id' => 5, 'name' => 'Lisa Wang', 'role' => 'DevOps Engineer', 'skills' => ['Deployment', 'Security'], 'capacity' => 30],
                    ['id' => 6, 'name' => 'Alex Thompson', 'role' => 'Junior Developer', 'skills' => ['Frontend', 'Documentation'], 'capacity' => 35],
                ],
                'initial_requirements' => [
                    'User authentication and profiles',
                    'Product catalog with search and filters',
                    'Shopping cart and checkout process',
                    'Payment integration (Stripe)',
                    'Order tracking and history',
                    'Admin dashboard for inventory management',
                    'Push notifications',
                    'Social media integration',
                ],
            ],
            'challenges' => $this->getPracticalChallenges($attempt->current_step),
        ];
    }

    private function getPracticalChallenges($step)
    {
        $challenges = [
            1 => [
                'type' => 'requirements_definition',
                'description' => 'The client has provided vague requirements. You need to define clear, measurable requirements for the project.',
                'task' => 'Convert the initial requirements into SMART objectives with acceptance criteria.',
                'points' => 20,
            ],
            2 => [
                'type' => 'timeline_creation',
                'description' => 'Create a realistic project timeline with milestones and dependencies.',
                'task' => 'Build a project schedule that accounts for dependencies, resource constraints, and includes buffer time.',
                'points' => 25,
            ],
            3 => [
                'type' => 'crisis_management',
                'description' => 'Week 6: Lead developer reports payment gateway security vulnerability. Junior developer quit. Client wants UI redesign.',
                'task' => 'Prioritize these issues and create an action plan with timeline and resource implications.',
                'points' => 30,
            ],
            4 => [
                'type' => 'resource_optimization',
                'description' => 'Project is 15% behind schedule. You need to optimize resources without increasing budget significantly.',
                'task' => 'Propose resource reallocation and timeline adjustments to get back on track.',
                'points' => 25,
            ],
            5 => [
                'type' => 'ai_implementation',
                'description' => 'Implement AI-powered project optimization for task assignment and risk prediction.',
                'task' => 'Design and configure AI workflows for automated task assignment and risk monitoring.',
                'points' => 35,
            ],
        ];

        return $challenges[$step] ?? $challenges[1];
    }

    public function submitAnswer(Request $request, OpenAIService $openAI)
    {
        $request->validate([
            'question_id' => 'required|exists:p_m_questions,id',
            'answer' => 'required',
        ]);

        $attempt = CertificationAttempt::firstOrCreate(
            ['user_id' => $request->user()->id],
            ['phase' => 'theory', 'current_step' => 1]
        );

        // Check if exam time has expired
        if ($attempt->isTimeExpired()) {
            // Mark as expired if not already marked
            if (! $attempt->is_expired) {
                $attempt->markAsExpired();
            }

            return redirect()->route('certification.index')
                ->with('error', 'Exam time has expired. You must wait 24 hours before your next attempt.');
        }

        $question = PMQuestion::findOrFail($request->question_id);

        // Prevent answering if time is up (legacy check for backward compatibility)
        $meta = $attempt->meta ?? [];
        if (($attempt->phase === 'pm_concepts') && isset($meta['pm_concepts_started_at'])) {
            $startedAt = Carbon::parse($meta['pm_concepts_started_at']);
            if (now()->diffInSeconds($startedAt) >= 20 * 60) {
                return redirect()->route('certification.index')->with('error', 'Time is up – no further answers accepted.');
            }
        }

        // Check if answer is correct
        $userAnswerRaw = $request->answer;
        $userAnswer = is_array($userAnswerRaw) ? $userAnswerRaw : [$userAnswerRaw];
        // Support dynamically shuffled options (correct answers stored in attempt meta when question served)
        $attemptMeta = $attempt->meta ?? [];
        $dynamicKey = 'dynamic_correct_'.$question->id;
        $correctAnswer = $attemptMeta[$dynamicKey] ?? $question->correct_answer;
        $isCorrect = false;
        $pointsEarned = 0;

        if ($question->type === 'free_form') {
            // AI evaluate free-form answer (0-10 points)
            try {
                $evaluation = $this->evaluateFreeForm($openAI, $question, $userAnswerRaw);
                $pointsEarned = (int) ($evaluation['score'] ?? 0);
                $isCorrect = $pointsEarned >= 7; // threshold for "sufficient" answer (70% of 10)
                // Store rationale in meta if needed
                $answerMeta = $evaluation;
            } catch (\Exception $e) {
                Log::error('Free form evaluation failed: '.$e->getMessage());
                $pointsEarned = 0;
                $isCorrect = false;
                $answerMeta = ['error' => 'evaluation_failed'];
            }
        } else {
            $isCorrect = $this->checkAnswer($userAnswer, $correctAnswer, $question->type);
            $pointsEarned = $isCorrect ? $question->points : 0;
            $answerMeta = [];
        }

        // Store the answer
        CertificationAnswer::updateOrCreate(
            [
                'certification_attempt_id' => $attempt->id,
                'pm_question_id' => $question->id,
            ],
            [
                'user_answer' => $userAnswer,
                'is_correct' => $isCorrect,
                'points_earned' => $pointsEarned,
                'answered_at' => now(),
            ]
        );

        // Update attempt scores
        $this->updateAttemptScores($attempt);

        // Get fresh data for the response
        $attempt = $attempt->fresh();

        // Development bypass: if request has 'testing' parameter, auto-pass with full score
        if ($request->has('testing') && config('app.env') !== 'production') {
            $allQuestions = PMQuestion::where('is_active', true)->get();
            $totalPossibleScore = $allQuestions->sum('points');

            $attempt->update([
                'total_score' => $totalPossibleScore,
                'max_possible_score' => $totalPossibleScore,
                'percentage' => 100.0,
                'current_step' => 16, // Beyond all questions
            ]);

            // Mark all questions as answered correctly for completeness
            foreach ($allQuestions as $question) {
                CertificationAnswer::updateOrCreate([
                    'certification_attempt_id' => $attempt->id,
                    'pm_question_id' => $question->id,
                ], [
                    'selected_option' => $question->correct_answer,
                    'points_earned' => $question->points,
                    'is_correct' => true,
                ]);
            }
        }

        // Check if PM concepts phase is complete (all 15 questions answered)
        $answeredCount = CertificationAnswer::where('certification_attempt_id', $attempt->id)->count();

        if ($answeredCount >= 15 && $attempt->phase === 'pm_concepts') {
            // Calculate PM questions score
            $totalTheoryScore = CertificationAnswer::where('certification_attempt_id', $attempt->id)
                ->sum('points_earned');
            $maxTheoryScore = CertificationAnswer::where('certification_attempt_id', $attempt->id)
                ->with('pmQuestion')
                ->get()
                ->sum(function ($answer) {
                    return $answer->pmQuestion ? $answer->pmQuestion->points : 0;
                });
            $theoryPercentage = $maxTheoryScore > 0 ? ($totalTheoryScore / $maxTheoryScore) * 100 : 0;
            
            // Update attempt with theory results
            $attempt->update([
                'total_score' => $totalTheoryScore,
                'max_possible_score' => $maxTheoryScore,
                'percentage' => $theoryPercentage,
            ]);
            
            // Check if theory score meets 80% threshold
            if ($theoryPercentage >= 80) {
                // Move to practical scenario phase
                $attempt->update(['phase' => 'practical_scenario', 'current_step' => 1]);
                return $this->showPhaseResults($attempt, 'theory_passed');
            } else {
                // Failed theory phase - do not allow progression to simulator
                $attempt->update([
                    'phase' => 'theory_failed',
                    'passed' => false,
                    'completed_at' => now()
                ]);
                return $this->showPhaseResults($attempt, 'theory_failed');
            }
        }

        $currentQuestion = $this->getCurrentQuestion($attempt);
        $totalQuestions = 15; // Fixed to 15 questions per attempt

        // Don't show feedback during assessment - just acknowledge submission
        // Recompute timer state
        $meta = $attempt->meta ?? [];
        $remainingSeconds = null;
        $timeUp = false;
        $examDurationSeconds = 20 * 60;
        if (isset($meta['pm_concepts_started_at'])) {
            $elapsed = now()->diffInSeconds(Carbon::parse($meta['pm_concepts_started_at']));
            $remainingSeconds = max(0, $examDurationSeconds - $elapsed);
            if ($remainingSeconds === 0) {
                $timeUp = true;
            }
        }

        // Redirect after POST to avoid URL staying on /certification/answer (prevents GET 405 on refresh)
        return redirect()->route('certification.index');
    }

    private function evaluateFreeForm(OpenAIService $openAI, PMQuestion $question, string $userAnswer): array
    {
        $messages = [
            ['role' => 'system', 'content' => 'You are an expert project management certification exam grader. Score candidate answers strictly on a 0-10 integer scale (10=excellent completeness, accuracy, clarity; 7=acceptable baseline; <4=poor). Return ONLY valid JSON {"score":0-10,"reasoning":"short justification"}.'],
            ['role' => 'user', 'content' => "Question: {$question->question}\nCandidate Answer: {$userAnswer}\nScore 0-10 and justification now as JSON."],
        ];
        $resp = $openAI->chatJson($messages, 0.2);
        // Normalize
        $score = isset($resp['score']) ? max(0, min(10, (int) $resp['score'])) : 0;
        $reason = $resp['reasoning'] ?? ($resp['reason'] ?? '');

        return ['score' => $score, 'reasoning' => $reason];
    }

    public function timeUp(Request $request)
    {
        $attempt = CertificationAttempt::where('user_id', $request->user()->id)->firstOrFail();
        if ($attempt->phase !== 'pm_concepts') {
            return redirect()->route('certification.index');
        }
        $meta = $attempt->meta ?? [];
        $meta['time_up'] = true;
        $attempt->update(['meta' => $meta]);

        return redirect()->route('certification.index');
    }

    private function showPhaseResults($attempt, $resultType = null)
    {
        // Get all answered questions with details
        $answeredQuestions = CertificationAnswer::where('certification_attempt_id', $attempt->id)
            ->with('pmQuestion')
            ->get()
            ->map(function ($answer) {
                $question = $answer->pmQuestion;
                // Normalize shapes for frontend expectations
                $userAnswer = $answer->user_answer;
                if (! is_array($userAnswer)) {
                    $userAnswer = $userAnswer !== null ? [$userAnswer] : [];
                }
                $correct = $question?->correct_answer ?? [];
                if (! is_array($correct)) {
                    $correct = [$correct];
                }

                return [
                    'id' => $question?->id,
                    'question' => $question?->question,
                    'type' => $question?->type,
                    'user_answer' => $userAnswer,
                    'correct_answer' => $correct,
                    'is_correct' => (bool) $answer->is_correct,
                    'points_earned' => $answer->points_earned,
                    'max_points' => $question?->points,
                    'explanation' => $question?->explanation,
                    'difficulty' => $question?->difficulty,
                    'options' => $question?->options,
                    // Provide AI reasoning if stored in meta (future use)
                    'meta' => $answer->meta ?? null,
                ];
            });

        $totalScore = $attempt->total_score;
        $maxPossibleScore = $attempt->max_possible_score;
        $percentage = $attempt->percentage;
        
        // Different passing thresholds based on phase and result type
        if ($resultType === 'theory_failed') {
            $passed = false;
            $message = 'PM Questions phase failed. You need 80% or higher to proceed to the simulator.';
            $canProceed = false;
        } elseif ($resultType === 'theory_passed') {
            $passed = $percentage >= 80;
            $message = $passed ? 'PM Questions phase passed! You can now proceed to the simulator.' : 'PM Questions phase failed.';
            $canProceed = $passed;
        } else {
            // Standard phase completion
            $passed = $percentage >= 70; // Default 70% pass rate
            $canProceed = $passed;
            $message = '';
        }

        return Inertia::render('Certification/PhaseResults', [
            'attempt' => $attempt,
            'answeredQuestions' => $answeredQuestions,
            'totalScore' => $totalScore,
            'maxPossibleScore' => $maxPossibleScore,
            'percentage' => $percentage,
            'passed' => $passed,
            'phase' => $attempt->phase,
            'nextPhase' => $attempt->phase === 'pm_concepts' ? 'practical_scenario' : null,
            'resultType' => $resultType,
            'message' => $message,
            'canProceed' => $canProceed,
        ]);
    }

    private function checkAnswer($userAnswer, $correctAnswer, $type)
    {
        switch ($type) {
            case 'multiple_choice':
                return $userAnswer === $correctAnswer;
            case 'ordering':
                return $userAnswer === $correctAnswer;
            case 'scenario':
                return $userAnswer === $correctAnswer;
            default:
                return false;
        }
    }

    private function getCurrentQuestion($attempt)
    {
        try {
            // Get answered question IDs for this attempt
            $answeredQuestionIds = CertificationAnswer::where('certification_attempt_id', $attempt->id)
                ->pluck('pm_question_id')
                ->toArray();

            Log::info('Answered question IDs: ', $answeredQuestionIds);

            // If this is a new attempt (no answered questions), select a mixed set (MC + Free Form)
            if (empty($answeredQuestionIds)) {
                // Broad pool: include all categories (production data may have different category labels or NULL)
                // Treat NULL is_active as active for legacy seeded rows.
                $baseQuery = PMQuestion::where(function ($q) {
                    $q->where('is_active', true)->orWhereNull('is_active');
                });
                $totalAvailable = (clone $baseQuery)->count();
                Log::info('Question pool total (all categories): '.$totalAvailable);

                // Fetch by type
                // Broaden selection: some seeds may store type variants like 'mc', 'multiple', etc.
                $mcIds = (clone $baseQuery)
                    ->whereIn('type', ['multiple_choice'])
                    ->inRandomOrder()->limit(200)->pluck('id')->toArray();
                $freeFormIds = (clone $baseQuery)
                    ->whereIn('type', ['free_form'])
                    ->inRandomOrder()->limit(100)->pluck('id')->toArray();

                $targetTotal = 15;
                $targetMC = 10;
                $targetFree = 5; // fixed mix per requirements
                // Rebalance if insufficient counts
                if (count($mcIds) < $targetMC) {
                    $deficit = $targetMC - count($mcIds);
                    $targetFree = min($targetFree + $deficit, $targetTotal - count($mcIds));
                }
                if (count($freeFormIds) < $targetFree) {
                    $deficit = $targetFree - count($freeFormIds);
                    $targetMC = min($targetMC + $deficit, $targetTotal - count($freeFormIds));
                }

                $selected = array_slice($mcIds, 0, $targetMC);
                $selected = array_merge($selected, array_slice($freeFormIds, 0, $targetFree));

                // If still under target (insufficient mix), backfill with any remaining active questions
                if (count($selected) < $targetTotal) {
                    $remaining = $targetTotal - count($selected);
                    $backfill = $baseQuery->whereNotIn('id', $selected)->inRandomOrder()->limit($remaining)->pluck('id')->toArray();
                    $selected = array_merge($selected, $backfill);
                }

                // Absolute fallback 1: any questions (ignoring category & type filters already removed)
                if (empty($selected)) {
                    $fallback = PMQuestion::inRandomOrder()->limit($targetTotal)->pluck('id')->toArray();
                    Log::warning('Fallback question selection engaged; original filtered set empty.', ['fallback_ids' => $fallback]);
                    $selected = $fallback;
                }
                // Absolute fallback 2: if STILL empty, try without limit just to detect existence
                if (empty($selected)) {
                    $allIds = PMQuestion::pluck('id')->toArray();
                    Log::error('Fallback level 2 engaged: still no questions. allIds count='.count($allIds));
                    $selected = array_slice($allIds, 0, 15);
                }

                // If STILL empty, return null (controller will interpret as no questions configured)
                if (empty($selected)) {
                    Log::error('No project management questions available after all fallbacks.');

                    return null;
                }

                shuffle($selected); // randomize order across types
                Log::info('Mixed question set selected (MC + Free Form): ', $selected);

                $attempt->update(['selected_question_ids' => json_encode($selected)]);
                $selectedQuestionIds = $selected;
            } else {
                // Use the previously selected questions for this attempt
                $selectedQuestionIds = json_decode($attempt->selected_question_ids, true) ?: [];
            }

            Log::info('Selected question IDs: ', $selectedQuestionIds);

            // Find the next unanswered question from the selected questions
            $unansweredQuestionIds = array_diff($selectedQuestionIds, $answeredQuestionIds);

            Log::info('Unanswered question IDs: ', $unansweredQuestionIds);

            if (empty($unansweredQuestionIds)) {
                return null; // No more questions
            }

            $currentQuestion = PMQuestion::whereIn('id', $unansweredQuestionIds)
                ->orderBy('difficulty')
                ->orderBy('id')
                ->first();

            Log::info('Current question found: ', $currentQuestion ? $currentQuestion->toArray() : null);

            if (! $currentQuestion) {
                return null;
            }

            $options = is_array($currentQuestion->options) ? array_values($currentQuestion->options) : [];
            $correctRaw = $currentQuestion->correct_answer; // stored as array of original option strings (or indices)
            // Build a mapping preserving which options were originally correct
            $flagged = [];
            foreach ($options as $idx => $opt) {
                $flagged[] = [
                    'text' => $opt,
                    'is_correct_original' => in_array($opt, (array) $correctRaw, true),
                ];
            }
            // Shuffle for random ordering per fetch
            shuffle($flagged);
            $shuffledOptions = array_column($flagged, 'text');
            // Determine new correct answers after shuffle (by value match)
            $newCorrect = [];
            foreach ($flagged as $i => $row) {
                if ($row['is_correct_original']) {
                    $newCorrect[] = $row['text'];
                }
            }
            // Persist per-attempt override mapping in attempt meta so grading uses dynamic ordering
            $meta = $attempt->meta ?? [];
            $meta['dynamic_correct_'.$currentQuestion->id] = $newCorrect; // store list of correct option texts
            $attempt->update(['meta' => $meta]);

            return [
                'id' => $currentQuestion->id,
                'category' => $currentQuestion->category,
                'difficulty' => $currentQuestion->difficulty,
                'points' => $currentQuestion->points,
                'type' => $currentQuestion->type,
                'question' => $currentQuestion->question,
                'options' => $shuffledOptions,
            ];
        } catch (\Exception $e) {
            Log::error('getCurrentQuestion error: '.$e->getMessage());
            Log::error('Stack trace: '.$e->getTraceAsString());

            return null;
        }
    }

    private function updateAttemptScores($attempt)
    {
        $answers = $attempt->answers()->with('pmQuestion')->get();

        $totalScore = $answers->sum('points_earned');
        $maxPossibleScore = $answers->sum(function ($answer) {
            return $answer->pmQuestion->points;
        });

        $percentage = $maxPossibleScore > 0 ? ($totalScore / $maxPossibleScore) * 100 : 0;

        $attempt->update([
            'total_score' => $totalScore,
            'max_possible_score' => $maxPossibleScore,
            'percentage' => round($percentage, 2),
            'passed' => $percentage >= 90,
        ]);
    }

    private function scorePracticalResponse($challengeType, $response)
    {
        // Implement sophisticated scoring logic for each challenge type
        // This could integrate with OpenAI for more nuanced evaluation

        switch ($challengeType) {
            case 'requirements_definition':
                return $this->scoreRequirementsDefinition($response);
            case 'timeline_creation':
                return $this->scoreTimelineCreation($response);
            case 'crisis_management':
                return $this->scoreCrisisManagement($response);
            case 'resource_optimization':
                return $this->scoreResourceOptimization($response);
            case 'ai_implementation':
                return $this->scoreAIImplementation($response);
            default:
                return 0;
        }
    }

    private function scoreRequirementsDefinition($response)
    {
        $score = 0;
        $maxScore = 20;

        // Check for SMART criteria application
        if (isset($response['specific']) && ! empty($response['specific'])) {
            $score += 4;
        }
        if (isset($response['measurable']) && ! empty($response['measurable'])) {
            $score += 4;
        }
        if (isset($response['achievable']) && ! empty($response['achievable'])) {
            $score += 4;
        }
        if (isset($response['relevant']) && ! empty($response['relevant'])) {
            $score += 4;
        }
        if (isset($response['timebound']) && ! empty($response['timebound'])) {
            $score += 4;
        }

        return min($score, $maxScore);
    }

    private function scoreTimelineCreation($response)
    {
        // Implement timeline scoring logic
        return rand(15, 25); // Placeholder
    }

    private function scoreCrisisManagement($response)
    {
        // Implement crisis management scoring logic
        return rand(20, 30); // Placeholder
    }

    private function scoreResourceOptimization($response)
    {
        // Implement resource optimization scoring logic
        return rand(15, 25); // Placeholder
    }

    private function scoreAIImplementation($response)
    {
        // Implement AI implementation scoring logic
        return rand(25, 35); // Placeholder
    }

    private function getMaxScoreForChallenge($challengeType)
    {
        $maxScores = [
            'requirements_definition' => 20,
            'timeline_creation' => 25,
            'crisis_management' => 30,
            'resource_optimization' => 25,
            'ai_implementation' => 35,
        ];

        return $maxScores[$challengeType] ?? 20;
    }

    private function getPracticalFeedback($challengeType, $score)
    {
        // Return detailed feedback based on performance
        $maxScore = $this->getMaxScoreForChallenge($challengeType);
        $percentage = ($score / $maxScore) * 100;

        if ($percentage >= 90) {
            return 'Excellent work! Your response demonstrates strong project management expertise.';
        } elseif ($percentage >= 70) {
            return 'Good response with some areas for improvement. Consider refining your approach.';
        } else {
            return 'Your response needs significant improvement. Review the concepts and try again.';
        }
    }

    public function advance(Request $request)
    {
        $request->validate([
            'phase' => 'required|in:theory,practical',
            'step' => 'required|integer|min:1',
        ]);

        $attempt = CertificationAttempt::where('user_id', $request->user()->id)->firstOrFail();

        // Check if user can advance based on their performance
        if (! $this->canAdvance($attempt, $request->phase, $request->step)) {
            return response()->json(['error' => 'You must achieve at least 90% to advance'], 422);
        }

        $attempt->update([
            'phase' => $request->phase,
            'current_step' => $request->step,
        ]);

        return response()->json(['success' => true]);
    }

    private function canAdvance($attempt, $phase, $step)
    {
        // For theory phase, check if current step questions are answered correctly (90%+)
        if ($phase === 'theory') {
            $categories = ['fundamentals', 'planning', 'execution', 'monitoring', 'ai_integration'];
            $currentCategory = $categories[$attempt->current_step - 1] ?? 'fundamentals';

            $categoryQuestions = PMQuestion::where('category', $currentCategory)->pluck('id');
            $answers = $attempt->answers()->whereIn('pm_question_id', $categoryQuestions)->get();

            if ($answers->isEmpty()) {
                return false;
            }

            $totalPoints = $answers->sum('points_earned');
            $maxPoints = $answers->sum(function ($answer) {
                return $answer->question->points;
            });

            return $maxPoints > 0 && (($totalPoints / $maxPoints) * 100) >= 90;
        }

        // For practical phase, similar logic for practical challenges
        return true; // Placeholder
    }

    public function complete(Request $request)
    {
        $attempt = CertificationAttempt::where('user_id', $request->user()->id)->firstOrFail();
        if ($attempt->percentage < 90) {
            return response()->json(['error' => 'Overall score must be at least 90% to receive certification'], 422);
        }
        if (! $attempt->serial) {
            $attempt->update([
                'serial' => (string) Str::uuid(),
                'phase' => 'certification_complete',
                'completed_at' => now(),
                'passed' => true,
            ]);
        }

        return response()->json([
            'serial' => $attempt->serial,
            'score' => $attempt->total_score,
            'percentage' => $attempt->percentage,
            'verification_url' => url('/verify/'.$attempt->serial),
        ]);
    }

    public function reset(Request $request)
    {
        $userId = $request->user()->id;

        // Delete all certification answers for this user
        CertificationAnswer::whereHas('certificationAttempt', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })->delete();

        // Reset or delete the certification attempt
        CertificationAttempt::where('user_id', $userId)->delete();

        return redirect()->route('certification.index')->with('success', 'Certification reset successfully. You can now start fresh!');
    }

    public function previousQuestion(Request $request)
    {
        $attempt = CertificationAttempt::where('user_id', $request->user()->id)->firstOrFail();

        // Get the last answered question
        $lastAnswer = CertificationAnswer::where('certification_attempt_id', $attempt->id)
            ->orderBy('created_at', 'desc')
            ->first();

        if ($lastAnswer) {
            // Delete the last answer to go back
            $lastAnswer->delete();

            // Update attempt scores
            $remainingAnswers = CertificationAnswer::where('certification_attempt_id', $attempt->id)
                ->with('pmQuestion')
                ->get();

            $newScore = $remainingAnswers->sum('points_earned');
            $newMaxScore = $remainingAnswers->sum(function ($answer) {
                return $answer->pmQuestion->points;
            });

            $attempt->update([
                'total_score' => $newScore,
                'max_possible_score' => $newMaxScore,
                'percentage' => $newMaxScore > 0 ? ($newScore / $newMaxScore * 100) : 0,
            ]);

            return redirect()->route('certification.index')->with('success', 'Went back to previous question');
        }

        return redirect()->route('certification.index')->with('info', 'No previous questions to go back to');
    }

    public function startPracticalScenario(Request $request)
    {
        $attempt = CertificationAttempt::where('user_id', $request->user()->id)->firstOrFail();

        // Check if they passed theory phase
        $answeredQuestions = CertificationAnswer::where('certification_attempt_id', $attempt->id)
            ->with('pmQuestion')
            ->get();

        $score = $answeredQuestions->sum('points_earned');
        $maxScore = $answeredQuestions->sum(function ($answer) {
            return $answer->pmQuestion->points;
        });

        $percentage = $maxScore > 0 ? ($score / $maxScore * 100) : 0;

        if ($percentage < 90) {
            return redirect()->route('certification.index')
                ->with('error', 'You need at least 90% on theory questions to proceed to practical scenario.');
        }

        // Update to practical scenario phase
        $attempt->update([
            'phase' => 'practical_scenario',
            'current_step' => 1,
        ]);

        return $this->showPracticalScenario($attempt);
    }

    private function showPracticalScenario($attempt)
    {
        $scenario = $this->getPracticalScenario($attempt);

        return Inertia::render('Certification/PracticalScenario', [
            'attempt' => $attempt,
            'scenario' => $scenario['scenario'],
            'currentChallenge' => $scenario['challenges'],
            'step' => $attempt->current_step,
            'totalSteps' => 5, // 5 practical challenges
        ]);
    }

    public function submitPractical(Request $request)
    {
        $request->validate([
            'response' => 'required|string|min:50',
            'step' => 'required|integer|min:1|max:5',
        ]);
        $attempt = CertificationAttempt::where('user_id', $request->user()->id)->first();
        if (! $attempt) {
            // Create a fresh attempt and send user back to index to start properly
            $attempt = CertificationAttempt::create([
                'user_id' => $request->user()->id,
                'phase' => 'pm_concepts',
                'current_step' => 1,
                'total_score' => 0,
                'max_possible_score' => 0,
                'percentage' => 0,
                'passed' => 0,
            ]);

            return redirect()->route('certification.index')
                ->with('error', 'Your session expired or was reset. Restarting certification.');
        }
        if ($attempt->phase !== 'practical_scenario') {
            return redirect()->route('certification.index')
                ->with('error', 'You must complete the theory phase before submitting practical responses.');
        }

        // Score the practical response
        $challengeType = $this->getChallengeType($request->step);
        $score = $this->scorePracticalResponse($challengeType, $request->response);
        $maxScore = $this->getMaxScoreForChallenge($challengeType);

        // Store practical performance
        $practicalPerformance = $attempt->practical_performance ?? [];
        $practicalPerformance[] = [
            'step' => $request->step,
            'challenge_type' => $challengeType,
            'response' => $request->response,
            'score' => $score,
            'max_score' => $maxScore,
            'submitted_at' => now(),
        ];

        // Update attempt
        $attempt->update([
            'current_step' => $request->step + 1,
            'practical_performance' => $practicalPerformance,
        ]);

        // Check if all practical steps completed
        if ($request->step >= 5) {
            // Calculate total practical score
            $totalPracticalScore = collect($practicalPerformance)->sum('score');
            $maxPracticalScore = collect($practicalPerformance)->sum('max_score');
            $practicalPercentage = $maxPracticalScore > 0 ? ($totalPracticalScore / $maxPracticalScore) * 100 : 0;

            // Get theory score from previous phase
            $theoryScore = $attempt->total_score;
            $theoryMaxScore = $attempt->max_possible_score;
            $theoryPercentage = $theoryMaxScore > 0 ? ($theoryScore / $theoryMaxScore) * 100 : 0;
            
            // Check individual phase requirements
            $theoryPassed = $theoryPercentage >= 80; // PM questions require 80%
            $simulatorPassed = $practicalPercentage >= 70; // Simulator requires 70%
            $overallPassed = $theoryPassed && $simulatorPassed;

            // Calculate overall score for display
            $overallScore = $theoryScore + $totalPracticalScore;
            $overallMaxScore = $theoryMaxScore + $maxPracticalScore;
            $overallPercentage = $overallMaxScore > 0 ? ($overallScore / $overallMaxScore) * 100 : 0;

            $attempt->update([
                'phase' => 'certification_complete',
                'total_score' => $overallScore,
                'max_possible_score' => $overallMaxScore,
                'percentage' => $overallPercentage,
                'passed' => $overallPassed, // Must pass both theory (80%) AND simulation (70%)
                'completed_at' => now(),
                'practical_performance' => array_merge($practicalPerformance, [
                    'theory_percentage' => $theoryPercentage,
                    'simulation_percentage' => $practicalPercentage,
                    'theory_passed' => $theoryPassed,
                    'simulation_passed' => $simulatorPassed
                ])
            ]);

            return $this->showFinalResults($attempt);
        }

        // Continue to next challenge
        return $this->showPracticalScenario($attempt);
    }

    private function getChallengeType($step)
    {
        $challenges = [
            1 => 'requirements_definition',
            2 => 'timeline_creation',
            3 => 'crisis_management',
            4 => 'resource_optimization',
            5 => 'ai_implementation',
        ];

        return $challenges[$step] ?? 'requirements_definition';
    }

    private function showFinalResults($attempt)
    {
        // Auto-issue certificate & badge when user has passed but not yet finalized
        if ($attempt->passed && ! $attempt->completed_at) {
            $serial = (string) Str::uuid();
            $attempt->update([
                'phase' => 'certification_complete',
                'serial' => $serial,
                'completed_at' => now(),
            ]);
            $attempt->refresh();
        }
        // Get theory results
        $theoryQuestions = CertificationAnswer::where('certification_attempt_id', $attempt->id)
            ->with('pmQuestion')
            ->get()
            ->map(function ($answer) {
                $q = $answer->pmQuestion;

                return [
                    'id' => $q->id,
                    'question' => $q->question,
                    'user_answer' => $answer->user_answer,
                    'correct_answer' => $q->correct_answer,
                    'is_correct' => $answer->is_correct,
                    'points_earned' => $answer->points_earned,
                    'max_points' => $q->points,
                    'explanation' => $q->explanation,
                    'options' => $q->options,
                ];
            });

        // Show final results page with explicit continue action instead of auto redirect
        return Inertia::render('Certification/Results', [
            'attempt' => $attempt->fresh(),
            'theoryQuestions' => $theoryQuestions,
            'overall' => [
                'score' => $attempt->total_score,
                'maxScore' => $attempt->max_possible_score,
                'percentage' => $attempt->percentage,
                'passed' => (bool) $attempt->passed,
            ],
            'message' => 'Certification complete! Review your results below. Your certificate & badge are now issued.',
            'certificateUrl' => $attempt->serial ? url('/certification/certificate') : null,
            'badgeUrl' => $attempt->serial ? url('/certification/badge') : null,
            'verificationUrl' => $attempt->serial ? url('/verify/'.$attempt->serial) : null,
        ]);
    }

    // Public verification (already added earlier) retained lower in file

    public function badge(Request $request)
    {
        $attempt = CertificationAttempt::where('user_id', $request->user()->id)
            ->where(function ($query) {
                $query->whereNotNull('completed_at')
                    ->orWhere('phase', 'practical_scenario');
            })
            ->first();

        if (! $attempt) {
            return redirect()->route('certification.index')
                ->with('error', 'Complete certification first to download badge.');
        }

        // Check if user has completed the practical scenario
        if (! $attempt->completed_at) {
            return redirect()->route('certification.index')
                ->with('error', 'Complete the practical scenario first to download badge.');
        }

        $user = $request->user();
        $issued_date = $attempt->completed_at->format('F j, Y');
        $percentage = $attempt->percentage ?? 0;

        // Return HTML view for digital badge (can be converted to image or PDF)
        return view('certificates.badge', [
            'user' => $user,
            'attempt' => $attempt,
            'issued_date' => $issued_date,
            'percentage' => round($percentage, 1),
        ]);
    }

    public function certificate(Request $request)
    {
        $attempt = CertificationAttempt::where('user_id', $request->user()->id)
            ->whereNotNull('completed_at')
            ->orderByDesc('completed_at')
            ->first();
        if (! $attempt) {
            return redirect()->route('certification.index')->with('error', 'Complete certification first.');
        }
        // Always redirect to public immutable certificate URL using serial
        if ($attempt->serial) {
            return redirect('/certificates/'.$attempt->serial);
        }
        // Fallback (should not happen if serial is generated elsewhere)
        $attempt->serial = (string) \Illuminate\Support\Str::uuid();
        $attempt->save();

        return redirect('/certificates/'.$attempt->serial);
    }

    public function verifyPublic($serial)
    {
        $attempt = CertificationAttempt::where('serial', $serial)->first();
        if (! $attempt) {
            return response()->view('certificates.verify', [
                'found' => false,
                'serial' => $serial,
            ], 404);
        }

        return view('certificates.verify', [
            'found' => true,
            'attempt' => $attempt,
            'user' => $attempt->user,
            'issued_date' => optional($attempt->completed_at)->format('F j, Y'),
            'serial' => $serial,
        ]);
    }

    public function publicCertificate($serial)
    {
        try {
            $attempt = CertificationAttempt::with('user')->where('serial', $serial)->first();
            if (! $attempt) {
                Log::warning('[CERT VIEW] Serial not found '.$serial);

                return response()->view('certificates.verify', [
                    'found' => false,
                    'serial' => $serial,
                ], 404);
            }
            if (! $attempt->user) {
                Log::error('[CERT VIEW] Attempt has no user relation serial='.$serial.' attempt_id='.$attempt->id);

                return response('User missing', 500);
            }
            $user = $attempt->user;
            $site = rtrim(config('app.url') ?: request()->getSchemeAndHttpHost(), '/');
            $ogImageUrl = $site.'/certificates/'.$serial.'/download/og-image';
            $percentage = round($attempt->percentage ?? 0, 1);

            return view('certificates.certificate', [
                'user' => $user,
                'attempt' => $attempt,
                'issued_date' => optional($attempt->completed_at)->format('F j, Y'),
                'percentage' => $percentage,
                'ogImageUrl' => $ogImageUrl,
                'site' => $site,
            ]);
        } catch (\Throwable $e) {
            Log::error('[CERT VIEW] Render failed serial='.$serial.' error='.$e->getMessage());

            return response('Certificate render error', 500);
        }
    }

    public function publicBadge($serial)
    {
        $attempt = CertificationAttempt::where('serial', $serial)->firstOrFail();
        $user = $attempt->user;
        $site = rtrim(config('app.url') ?: request()->getSchemeAndHttpHost(), '/');
        $ogImageUrl = $site.'/certificates/'.$serial.'/badge/download/og-image';

        return view('certificates.badge', [
            'user' => $user,
            'attempt' => $attempt,
            'issued_date' => optional($attempt->completed_at)->format('F j, Y'),
            'percentage' => round($attempt->percentage ?? 0, 1),
            'ogImageUrl' => $ogImageUrl,
            'site' => $site,
        ]);
    }

    private function renderHtmlToJpegResponse(string $html, string $filename)
    {
        // Attempt Intervention Image HTML rasterization via Browsershot or wkhtmltoimage is heavy; simple fallback returns HTML with instruction.
        // For now we convert using Intervention Image by loading an SVG template snapshot placeholder.
        if (class_exists('Intervention\\Image\\ImageManagerStatic')) {
            try {
                $img = call_user_func(['Intervention\\Image\\ImageManagerStatic', 'canvas'], 1600, 1131, '#ffffff');
                if (method_exists($img, 'text')) {
                    $img->text('TaskPilot Certificate (server JPEG draft). View live page for full design.', 80, 160, function ($font) {
                        if (method_exists($font, 'size')) {
                            $font->size(38);
                        }
                    });
                }

                return $img->response('jpg', 92)->withHeaders(['Content-Disposition' => 'attachment; filename="'.$filename.'"']);
            } catch (\Throwable $e) {
                // fall through to HTML fallback
            }
        }

        return response($html)->header('Content-Type', 'text/html');
    }

    public function downloadCertificateJpeg($serial)
    {
        $attempt = CertificationAttempt::where('serial', $serial)->firstOrFail();
        $user = $attempt->user;
        $html = view('certificates.certificate', [
            'user' => $user,
            'attempt' => $attempt,
            'issued_date' => optional($attempt->completed_at)->format('F j, Y'),
            'percentage' => round($attempt->percentage ?? 0, 1),
        ])->render();

        return $this->renderHtmlToJpegResponse($html, 'taskpilot-certificate-'.$serial.'.jpg');
    }

    public function downloadBadgeJpeg($serial)
    {
        $attempt = CertificationAttempt::where('serial', $serial)->firstOrFail();
        $user = $attempt->user;
        $html = view('certificates.badge', [
            'user' => $user,
            'attempt' => $attempt,
            'issued_date' => optional($attempt->completed_at)->format('F j, Y'),
            'percentage' => round($attempt->percentage ?? 0, 1),
        ])->render();

        return $this->renderHtmlToJpegResponse($html, 'taskpilot-badge-'.$serial.'.jpg');
    }

    /**
     * Development helper: instantly mark certification as passed and load simulation.
     */
    public function devForcePass(Request $request, SimpleSimulationGenerator $generator)
    {
        if (! app()->environment('local')) {
            abort(404);
        }
        $user = $request->user();
        $attempt = CertificationAttempt::firstOrCreate(
            ['user_id' => $user->id],
            [
                'phase' => 'pm_concepts',
                'current_step' => 1,
                'total_score' => 0,
                'max_possible_score' => 0,
            ]
        );
        $now = now();
        $serial = $attempt->serial ?: (string) Str::uuid();
        $attempt->update([
            'phase' => 'certification_complete',
            'current_step' => 6,
            'total_score' => 300,
            'max_possible_score' => 300,
            'percentage' => 100,
            'passed' => true,
            'serial' => $serial,
            'completed_at' => $now,
            'practical_performance' => $attempt->practical_performance ?: [
                ['step' => 1, 'challenge_type' => 'requirements_definition', 'score' => 20, 'max_score' => 20],
                ['step' => 2, 'challenge_type' => 'timeline_creation', 'score' => 25, 'max_score' => 25],
                ['step' => 3, 'challenge_type' => 'crisis_management', 'score' => 30, 'max_score' => 30],
                ['step' => 4, 'challenge_type' => 'resource_optimization', 'score' => 25, 'max_score' => 25],
                ['step' => 5, 'challenge_type' => 'ai_implementation', 'score' => 35, 'max_score' => 35],
            ],
        ]);
        // Generate simulation immediately
        $data = $generator->generate($user);
        $request->session()->put('simulator_payload', $data);

        return redirect()->route('simulator.index')->with('message', 'Dev bypass: Certification passed and simulation initialized.');
    }

    /**
     * Development helper: wipe all certification attempts for the current user to simulate a fresh start.
     */
    public function devWipeAttempts(Request $request)
    {
        if (! app()->environment('local')) {
            abort(404);
        }
        $user = $request->user();
        CertificationAttempt::where('user_id', $user->id)->delete();

        return redirect()->route('certification.index')->with('status', 'Certification attempts wiped for user.');
    }

    /** Start the theory exam (sets start timestamp) */
    public function begin(Request $request)
    {
        // Check for existing expired attempt with cooldown
        $existingAttempt = CertificationAttempt::where('user_id', $request->user()->id)
            ->where('phase', 'pm_concepts')
            ->first();

        if ($existingAttempt && $existingAttempt->is_expired && ! $existingAttempt->canStartNewAttempt()) {
            return redirect()->route('certification.index')
                ->with('error', 'You must wait 24 hours before starting a new exam attempt.');
        }

        // Clean up expired attempt if cooldown has passed
        if ($existingAttempt && $existingAttempt->is_expired && $existingAttempt->canStartNewAttempt()) {
            $existingAttempt->delete();
            $existingAttempt = null;
        }

        // Create new attempt or use existing one
        $attempt = CertificationAttempt::firstOrCreate(
            ['user_id' => $request->user()->id, 'phase' => 'pm_concepts'],
            ['current_step' => 1, 'total_score' => 0, 'max_possible_score' => 0]
        );

        // Set exam timing when starting for the first time
        if (! $attempt->exam_started_at) {
            $examDurationMinutes = 20; // 20 minutes for the theory exam
            $attempt->update([
                'exam_started_at' => now(),
                'exam_expires_at' => now()->addMinutes($examDurationMinutes),
                'is_expired' => false,
                'next_attempt_allowed_at' => null,
            ]);

            // Update old meta field for backward compatibility
            $meta = $attempt->meta ?? [];
            $meta['pm_concepts_started_at'] = now()->toIso8601String();
            $attempt->update(['meta' => $meta]);
        }

        return redirect()->route('certification.index');
    }

    /**
     * Clean up expired attempt and allow new one
     */
    public function cleanupExpiredAttempt(Request $request)
    {
        $attempt = CertificationAttempt::where('user_id', $request->user()->id)
            ->where('is_expired', true)
            ->first();

        if ($attempt && $attempt->canStartNewAttempt()) {
            $attempt->delete();

            return redirect()->route('certification.index')
                ->with('success', 'Ready for your new exam attempt!');
        }

        return redirect()->route('certification.index')
            ->with('error', 'No expired attempt to clean up or cooldown period not complete.');
    }

    /**
     * Generate Open Graph image for certificate sharing
     */
    public function certificateOgImage($serial)
    {
        try {
            $attempt = CertificationAttempt::where('serial', $serial)->firstOrFail();
            $user = $attempt->user;
        } catch (\Throwable $e) {
            Log::error('[CERT OG] Attempt lookup failed: '.$e->getMessage());

            return response('Not found', 404);
        }
        if (! function_exists('imagecreatetruecolor')) {
            Log::error('[CERT OG] GD not available on server.');

            return response()->json(['error' => 'GD extension missing'], 500);
        }
        try {
            // Generate a simple OG image using GD or return a pre-made template
            $width = 1200;
            $height = 630;
            $image = imagecreatetruecolor($width, $height);

            // Colors
            $white = imagecolorallocate($image, 255, 255, 255);
            $gold = imagecolorallocate($image, 212, 175, 55);
            $dark = imagecolorallocate($image, 26, 26, 26);
            $blue = imagecolorallocate($image, 79, 70, 229);

            // Fill background
            imagefill($image, 0, 0, $white);

            // Add border
            imagerectangle($image, 20, 20, $width - 21, $height - 21, $gold);
            imagerectangle($image, 25, 25, $width - 26, $height - 26, $gold);

            // Add text (if fonts available, otherwise basic text)
            $title = 'TaskPilot Certification';
            $name = $user->name;
            $score = round($attempt->percentage ?? 0, 1).'%';

            // Try to use a font file, fallback to imagestring
            $fontPath = public_path('fonts/arial.ttf');
            if (file_exists($fontPath)) {
                imagettftext($image, 32, 0, 60, 120, $dark, $fontPath, $title);
                imagettftext($image, 24, 0, 60, 180, $blue, $fontPath, 'Certificate of Achievement');
                imagettftext($image, 28, 0, 60, 280, $dark, $fontPath, $name);
                imagettftext($image, 20, 0, 60, 350, $dark, $fontPath, 'Score: '.$score);
                imagettftext($image, 16, 0, 60, 420, $dark, $fontPath, 'Professional Project Management');
            } else {
                imagestring($image, 5, 60, 80, $title, $dark);
                imagestring($image, 4, 60, 120, 'Certificate of Achievement', $blue);
                imagestring($image, 4, 60, 160, $name, $dark);
                imagestring($image, 3, 60, 200, 'Score: '.$score, $dark);
                imagestring($image, 3, 60, 240, 'Professional Project Management', $dark);
            }

            // Add logo/seal placeholder
            imagefilledellipse($image, $width - 150, 150, 120, 120, $gold);
            imagestring($image, 3, $width - 180, 140, 'TP', $white);
            imagestring($image, 2, $width - 190, 160, 'CERT', $white);

            header('Content-Type: image/png');
            header('Cache-Control: public, max-age=31536000');
            imagepng($image);
            imagedestroy($image);

            return response()->noContent(); // already sent
        } catch (\Throwable $e) {
            Log::error('[CERT OG] Render failure: '.$e->getMessage());

            return response()->json(['error' => 'OG generation failed'], 500);
        }
    }

    /**
     * Generate Open Graph image for badge sharing
     */
    public function badgeOgImage($serial)
    {
        try {
            $attempt = CertificationAttempt::where('serial', $serial)->firstOrFail();
            $user = $attempt->user;
        } catch (\Throwable $e) {
            Log::error('[BADGE OG] Attempt lookup failed: '.$e->getMessage());

            return response('Not found', 404);
        }
        if (! function_exists('imagecreatetruecolor')) {
            Log::error('[BADGE OG] GD not available on server.');

            return response()->json(['error' => 'GD extension missing'], 500);
        }

        try {
            // Generate a badge-style OG image
            $size = 630;
            $image = imagecreatetruecolor($size, $size);

            // Colors
            $gold = imagecolorallocate($image, 212, 175, 55);
            $darkGold = imagecolorallocate($image, 184, 134, 26);
            $white = imagecolorallocate($image, 255, 255, 255);
            $dark = imagecolorallocate($image, 26, 26, 26);

            // Fill with gold gradient effect
            imagefill($image, 0, 0, $gold);

            // Draw circular badge
            $centerX = $size / 2;
            $centerY = $size / 2;
            $radius = 280;

            imagefilledellipse($image, $centerX, $centerY, $radius * 2, $radius * 2, $darkGold);
            imagefilledellipse($image, $centerX, $centerY, ($radius - 20) * 2, ($radius - 20) * 2, $gold);

            // Add text
            $fontPath = public_path('fonts/arial.ttf');
            $name = $user->name;
            $score = round($attempt->percentage ?? 0, 1).'%';

            if (file_exists($fontPath)) {
                imagettftext($image, 24, 0, $centerX - 60, $centerY - 80, $dark, $fontPath, 'TP CERT');
                imagettftext($image, 18, 0, $centerX - strlen($name) * 5, $centerY - 20, $dark, $fontPath, $name);
                imagettftext($image, 32, 0, $centerX - 40, $centerY + 40, $dark, $fontPath, $score);
                imagettftext($image, 14, 0, $centerX - 80, $centerY + 80, $dark, $fontPath, 'Project Management');
            } else {
                imagestring($image, 4, $centerX - 40, $centerY - 80, 'TP CERT', $dark);
                imagestring($image, 3, $centerX - strlen($name) * 3, $centerY - 20, $name, $dark);
                imagestring($image, 5, $centerX - 30, $centerY + 20, $score, $dark);
                imagestring($image, 2, $centerX - 60, $centerY + 60, 'Project Management', $dark);
            }

            header('Content-Type: image/png');
            header('Cache-Control: public, max-age=31536000');
            imagepng($image);
            imagedestroy($image);

            return response()->noContent();
        } catch (\Throwable $e) {
            Log::error('[BADGE OG] Render failure: '.$e->getMessage());

            return response()->json(['error' => 'OG generation failed'],500);
        }
    }
    
    /**
     * Complete certification from simulator with proper scoring
     */
    public function completeFromSimulator(Request $request)
    {
        $request->validate([
            'simulation_score' => 'required|numeric|min:0|max:100',
            'simulation_data' => 'required|array'
        ]);
        
        $user = $request->user();
        $simulationScore = $request->simulation_score;
        $simulationData = $request->simulation_data;
        
        // Find the user's current practical_scenario attempt
        $attempt = CertificationAttempt::where('user_id', $user->id)
            ->where('phase', 'practical_scenario')
            ->orderByDesc('id')
            ->first();
            
        if (!$attempt) {
            return response()->json([
                'success' => false,
                'message' => 'No active certification attempt found.'
            ], 400);
        }
        
        // Verify they passed theory phase (80% requirement)
        $theoryPercentage = $attempt->percentage ?? 0;
        if ($theoryPercentage < 80) {
            return response()->json([
                'success' => false,
                'message' => 'Theory phase must be passed with 80% before completing certification.'
            ], 403);
        }
        
        // Check if simulation meets 70% threshold
        $simulatorPassed = $simulationScore >= 70;
        $theoryPassed = $theoryPercentage >= 80;
        $overallPassed = $theoryPassed && $simulatorPassed;
        
        // Calculate weighted overall score (theory: 60%, simulation: 40%)
        $overallPercentage = ($theoryPercentage * 0.6) + ($simulationScore * 0.4);
        
        // Store simulation performance
        $simulationPerformance = [
            'simulation_score' => $simulationScore,
            'simulation_data' => $simulationData,
            'simulation_passed' => $simulatorPassed,
            'theory_percentage' => $theoryPercentage,
            'theory_passed' => $theoryPassed,
            'submitted_at' => now()
        ];
        
        $attempt->update([
            'phase' => 'certification_complete',
            'percentage' => $overallPercentage,
            'passed' => $overallPassed,
            'completed_at' => now(),
            'practical_performance' => $simulationPerformance,
            'serial' => $attempt->serial ?? (string) \Illuminate\Support\Str::uuid()
        ]);
        
        return response()->json([
            'success' => true,
            'passed' => $overallPassed,
            'simulation_passed' => $simulatorPassed,
            'theory_passed' => $theoryPassed,
            'overall_percentage' => round($overallPercentage, 2),
            'simulation_percentage' => $simulationScore,
            'theory_percentage' => $theoryPercentage,
            'message' => $overallPassed 
                ? 'Congratulations! You have successfully completed the certification.'
                : 'Certification not granted. Requirements: PM Questions ≥80%, Simulator ≥70%',
            'certificate_url' => $overallPassed ? route('certification.certificate') : null
        ]);
    }
}
