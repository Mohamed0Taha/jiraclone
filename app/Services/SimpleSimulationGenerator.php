<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Next‑Gen Simulation Generator
 * Richer domain model with:
 *  - Multi‑dimensional metrics (budget, morale, velocity, quality_risk, schedule_buffer)
 *  - Structured event resolution options (explicit trade‑offs, not just cancel / start)
 *  - Scoring engine evaluating alignment, efficiency, risk handling & opportunity capture
 *  - Effect payload returned to front‑end (task_updates, team_updates, new_tasks, budget_change, timeline_change)
 */
class SimpleSimulationGenerator
{
    public function __construct(protected OpenAIService $openAI) {}

    /* =============================== PUBLIC API =============================== */
    public function generate(User $user): array
    {
        $project = $this->generateProjectIdea();
        $timelineWeeks = max(6, min(10, (int) ($project['constraints']['timeline_weeks'] ?? rand(6, 10))));
        $project['total_weeks'] = $timelineWeeks;
        $project['cost_model'] = [
            'default_member_hourly_rate' => 100,
            'currency' => 'USD',
            'notes' => 'Simulation cost assumptions only.',
        ];

        $tasks = $this->generateTasks($project);
        $team = $this->generateTeam($project, $tasks);
        $this->autoAssignTasks($tasks, $team);
        $this->seedInitialProgress($tasks);
        $events = $this->generateEvents($project, $team, $tasks);

        return [
            'project' => $project,
            'tasks' => $tasks,
            'team' => $team,
            'events' => $events,
        ];
    }

    /** Evaluate an event resolution selection. */
    public function evaluateSimulationAction(array $event, array $action, array $gameState): array
    {
        $option = collect($event['resolution_options'] ?? [])->firstWhere('key', $action['resolution_option']);
        if (! $option) {
            return $this->simpleEvaluation(35, ['Invalid resolution option selected.']);
        }

        // Baseline influenced by severity & timing
        $severityMap = ['low' => 65, 'medium' => 55, 'high' => 45];
        $base = $severityMap[strtolower($event['severity'] ?? 'medium')] ?? 55;

        // Heuristics: penalize if option overspends remaining budget or harms morale when morale already low
        $budgetRemaining = $gameState['remaining_budget'] ?? 0;
        $moraleAvg = $gameState['team_morale_avg'] ?? 70;
        $effects = $option['effects'] ?? [];
        $budgetDelta = $effects['budget_delta'] ?? 0;
        $moraleDelta = $effects['morale_delta'] ?? 0;
        $timelineDelta = $effects['timeline_delta'] ?? 0;

        $score = $base;
        if ($budgetDelta < 0 && $budgetRemaining < abs($budgetDelta) * 2) {
            $score -= 12;
        }
        if ($budgetDelta > 0) {
            $score += 5;
        } // reward securing additional funding
        if ($moraleDelta < 0 && $moraleAvg < 60) {
            $score -= 10;
        }
        if ($moraleDelta > 0 && $moraleAvg < 70) {
            $score += 5;
        }
        if (($effects['quality_risk_delta'] ?? 0) < 0) {
            $score += 6;
        }
        if (($effects['velocity_delta_pct'] ?? 0) > 0) {
            $score += 4;
        }
        if ($timelineDelta > 0 && ($gameState['timeline_buffer_weeks'] ?? 0) < $timelineDelta) {
            $score -= 8;
        }

        // Strategic bonus if option has explicit follow_up or creates new tasks (invest for future)
        if (! empty($option['follow_up'])) {
            $score += 5;
        }
        if (! empty($effects['create_new_tasks'])) {
            $score += 4;
        }

        $score = max(0, min(100, $score + rand(-4, 6))); // slight variability

        $feedback = $this->buildFeedback($score, $option, $effects, $gameState);

        return $this->composeEvaluation($score, $feedback, $effects);
    }

    /** Translate chosen option effects to a normalized effects payload for the front‑end. */
    public function applyActionEffects(array $event, array $action, array $gameState): array
    {
        $option = collect($event['resolution_options'] ?? [])->firstWhere('key', $action['resolution_option']);
        if (! $option) {
            return [];
        }
        $effects = $option['effects'] ?? [];

        $payload = [
            'task_updates' => [],
            'team_updates' => [],
            'new_tasks' => [],
            'budget_change' => $effects['budget_delta'] ?? 0,
            'timeline_change' => $effects['timeline_delta'] ?? 0,
            'applied_effects' => [],
        ];

        // Task progress / status adjustments
        if (! empty($effects['task_progress_delta']) && ! empty($event['task_ids'])) {
            foreach ($event['task_ids'] as $tid) {
                $payload['task_updates'][$tid]['progress_boost'] = $effects['task_progress_delta'];
            }
            $payload['applied_effects'][] = 'Boosted progress of related tasks by '.$effects['task_progress_delta'].'%';
        }
        if (! empty($effects['task_status'])) {
            foreach ($event['task_ids'] as $tid) {
                $payload['task_updates'][$tid]['status'] = $effects['task_status'];
            }
            $payload['applied_effects'][] = 'Set related task status to '.$effects['task_status'];
        }
        if (! empty($effects['increase_estimate_pct']) && ! empty($event['task_ids'])) {
            foreach ($event['task_ids'] as $tid) {
                $payload['task_updates'][$tid]['estimated_hours'] = 'increased_by_'.($effects['increase_estimate_pct']).'_percent';
            }
            $payload['applied_effects'][] = 'Adjusted estimates by +'.$effects['increase_estimate_pct'].'%';
        }

        // New tasks (investment / scope add)
        if (! empty($effects['create_new_tasks'])) {
            foreach ($effects['create_new_tasks'] as $t) {
                $payload['new_tasks'][] = [
                    'title' => $t['title'],
                    'priority' => $t['priority'] ?? 'Medium',
                    'estimated_hours' => $t['estimated_hours'] ?? 6,
                    'required_skills' => $t['required_skills'] ?? ['General'],
                    'budget' => $t['budget'] ?? ($t['estimated_hours'] ?? 6) * 50,
                ];
            }
            $payload['applied_effects'][] = 'Added '.count($effects['create_new_tasks']).' new task(s)';
        }

        // Team morale / capacity
        if (isset($effects['morale_delta']) && ! empty($event['member_ids'])) {
            foreach ($event['member_ids'] as $mid) {
                $payload['team_updates'][$mid]['morale_change'] = $effects['morale_delta'];
            }
            $payload['applied_effects'][] = 'Morale change '.$effects['morale_delta'].' for involved members';
        }
        if (isset($effects['capacity_delta_pct']) && ! empty($event['member_ids'])) {
            foreach ($event['member_ids'] as $mid) {
                $payload['team_updates'][$mid]['workload'] = max(5, 50 - $effects['capacity_delta_pct']);
            }
            $payload['applied_effects'][] = 'Adjusted workload due to capacity impact';
        }

        // Quality risk expressed as narrative only
        if (isset($effects['quality_risk_delta'])) {
            $payload['applied_effects'][] = ($effects['quality_risk_delta'] < 0 ? 'Reduced' : 'Increased').' quality risk';
        }

        // Reassign tasks from member (frontend will handle actual reassignment logic)
        if (isset($effects['reassign_tasks_from_member_id'])) {
            $payload['applied_effects'][] = 'Reassign tasks from member ID '.$effects['reassign_tasks_from_member_id'];
            $payload['member_reassign_from'] = $effects['reassign_tasks_from_member_id'];
        }
        // Member departure event
        if (isset($effects['member_departure_id'])) {
            $payload['applied_effects'][] = 'Member ID '.$effects['member_departure_id'].' departed';
            $payload['member_departure_id'] = $effects['member_departure_id'];
        }

        return $payload;
    }

    /** (Optional) Evaluate task level custom actions (currently simple heuristic). */
    public function evaluateTaskAction(array $task, array $action, array $gameState): array
    {
        $base = 55;
        if ($action['action_type'] === 'split_task' && ($task['estimated_hours'] ?? 0) > 10) {
            $base += 10;
        }
        if ($action['action_type'] === 'rush_delivery' && ($gameState['remaining_budget'] ?? 0) < 2000) {
            $base -= 8;
        }
        $base = max(0, min(100, $base + rand(-5, 5)));

        return $this->composeEvaluation($base, $this->buildFeedback($base, null, [], $gameState), []);
    }

    /* ============================= PRIVATE HELPERS ============================= */
    protected function autoAssignTasks(array &$tasks, array $team): void
    {
        $memberLoad = [];
        foreach ($team as $m) {
            $memberLoad[$m['name']] = 0;
        }
        $priorityRank = ['High' => 0, 'Medium' => 1, 'Low' => 2];
        usort($tasks, function ($a, $b) use ($priorityRank) {
            $pa = $priorityRank[$a['priority']] ?? 3;
            $pb = $priorityRank[$b['priority']] ?? 3;
            if ($pa === $pb) {
                return ($b['estimated_hours'] ?? 0) <=> ($a['estimated_hours'] ?? 0);
            }

            return $pa <=> $pb;
        });
        foreach ($tasks as &$t) {
            $req = $t['required_skills'] ?? ['General'];
            $candidates = [];
            foreach ($team as $m) {
                $match = array_intersect($req, $m['skills']);
                if ($req === ['General'] || $match) {
                    $cap = $m['capacity_hours'] ?? 40;
                    $ratio = $cap ? ($memberLoad[$m['name']] / $cap) : 1;
                    $candidates[] = [$m, count($match), $ratio];
                }
            }
            if ($candidates) {
                usort($candidates, fn ($x, $y) => $x[1] === $y[1] ? $x[2] <=> $y[2] : $y[1] <=> $x[1]);
                $chosen = $candidates[0][0];
                $t['assignee'] = $chosen['name'];
                $memberLoad[$chosen['name']] += $t['estimated_hours'];
            }
            $t['status'] = $t['status'] ?? 'Pending';
        }
        unset($t);
        usort($tasks, fn ($a, $b) => ($a['id'] ?? 0) <=> ($b['id'] ?? 0));
    }

    protected function seedInitialProgress(array &$tasks): void
    {
        foreach ($tasks as &$t) {
            if ($t['priority'] === 'High' && rand(0, 1)) {
                $t['status'] = 'In Progress';
                $t['progress'] = rand(8, 22);
            }
            if ($t['priority'] === 'Medium' && rand(0, 100) < 30) {
                $t['status'] = 'In Progress';
                $t['progress'] = rand(5, 15);
            }
            if (isset($t['estimated_hours'])) {
                $t['remaining_hours'] = max(0, (int) round($t['estimated_hours'] * (1 - ($t['progress'] ?? 0) / 100)));
            }
        }
        unset($t);
    }

    protected function simpleEvaluation(int $score, array $feedback): array
    {
        return $this->composeEvaluation($score, $feedback, []);
    }

    protected function composeEvaluation(int $score, array $feedback, array $effects): array
    {
        return [
            'overall_score' => $score,
            'action_effectiveness' => $score,
            'resolution_completeness' => min(100, $score + 8),
            'strategic_thinking' => max(0, $score - 5),
            'stakeholder_impact' => $score,
            'long_term_consequences' => $score + ($effects['quality_risk_delta'] ?? 0) < 0 ? $score + 5 : $score - 3,
            'feedback' => $feedback,
            'metrics_impact' => $effects,
            'consequences' => collect($effects)->map(function ($v, $k) {
                return ['type' => $k, 'value' => $v, 'description' => Str::of($k)->snake()->replace('_', ' ')->title().' => '.(is_array($v) ? json_encode($v) : $v)];
            })->values()->all(),
        ];
    }

    protected function buildFeedback(int $score, ?array $option, array $effects, array $gameState): array
    {
        $fb = [];
        if ($score >= 85) {
            $fb[] = 'Excellent strategic alignment; strong trade‑off management.';
        } elseif ($score >= 70) {
            $fb[] = 'Solid response with minor optimization potential.';
        } elseif ($score >= 55) {
            $fb[] = 'Adequate but leaves some risk or value unaddressed.';
        } else {
            $fb[] = 'Suboptimal – consider balancing budget, morale, and schedule impacts.';
        }
        if (($effects['budget_delta'] ?? 0) < 0 && ($gameState['remaining_budget'] ?? 0) < 5000) {
            $fb[] = 'High spend while contingency is low – monitor remaining budget closely.';
        }
        if (($effects['morale_delta'] ?? 0) > 0 && ($gameState['team_morale_avg'] ?? 0) < 65) {
            $fb[] = 'Good morale investment while sentiment was trending low.';
        }
        if (! empty($option['follow_up'])) {
            $fb[] = 'Schedule follow‑up: '.$option['follow_up'];
        }

        return $fb;
    }

    /* ===================== ORIGINAL GENERATORS (REFINED) ===================== */
    protected function generateProjectIdea(): array
    {
        try {
            // Per-run unique seed to encourage varied AI output and allow front-end differentiation
            $seed = (string) Str::uuid();
            $json = $this->openAI->chatJson([
                ['role' => 'system', 'content' => 'You create diverse, realistic non-software-only project scenarios (healthcare, education, manufacturing, operations, marketing, events, sustainability, construction, finance). Return STRICT JSON only.'],
                ['role' => 'user', 'content' => 'Seed: '.$seed.'\nGenerate one project with: title (avoid repeating past examples), description (45-70 words, incorporate a subtle unique angle), domain, primary_objective, constraints {budget: number(20000-60000), timeline_weeks: number(6-20), risk_level: low|medium|high}, key_deliverables (6-10 concise bullet strings). Ensure variety vs common sustainability rollouts.'],
            ], temperature: 0.8);
            if (! is_array($json) || ! isset($json['title'])) {
                return $this->fallbackIdea();
            }

            return [
                'title' => $json['title'],
                'description' => $json['description'] ?? 'Project scenario',
                'domain' => $json['domain'] ?? 'General Operations',
                'primary_objective' => $json['primary_objective'] ?? 'Deliver core outcomes within constraints',
                'constraints' => $json['constraints'] ?? [
                    'budget' => rand(25000, 50000),
                    'timeline_weeks' => rand(8, 16),
                    'risk_level' => collect(['low', 'medium', 'high'])->random(),
                ],
                'key_deliverables' => $json['key_deliverables'] ?? $this->randomDeliverables(),
                'generated_via' => 'ai',
                'instance_id' => $seed,
            ];
        } catch (\Throwable $e) {
            Log::info('SimpleSimulationGenerator AI idea failed', ['error' => $e->getMessage()]);

            return $this->fallbackIdea();
        }
    }

    protected function fallbackIdea(): array
    {
        $angles = [
            'leveraging gamified micro-challenges',
            'introducing IoT-based usage telemetry',
            'piloting department scorecards with public leaderboards',
            'embedding green KPIs into quarterly reviews',
            'partnering with a local university for audit validation',
        ];
        $domains = ['Sustainability', 'Facilities', 'Operations', 'Compliance', 'Change Management'];
        $domain = $domains[array_rand($domains)];
        $seed = (string) Str::uuid();

        return [
            'title' => $domain.' Initiative Rollout #'.substr($seed, 0, 8),
            'description' => 'Deploy a cross-functional program '.$angles[array_rand($angles)].' to drive measurable reductions and cultural adoption within a constrained cost envelope.',
            'domain' => $domain,
            'primary_objective' => 'Achieve measurable uplift in target KPIs within timeframe',
            'constraints' => [
                'budget' => rand(22000, 48000),
                'timeline_weeks' => rand(8, 14),
                'risk_level' => collect(['low', 'medium', 'high'])->random(),
            ],
            'key_deliverables' => $this->randomDeliverables(),
            'generated_via' => 'fallback',
            'instance_id' => $seed,
        ];
    }

    protected function randomDeliverables(): array
    {
        $pool = [
            'Baseline resource consumption report',
            'Energy optimization action plan',
            'Stakeholder training workshops',
            'Waste reduction pilot deployment',
            'Vendor sustainability compliance matrix',
            'Executive progress dashboard',
            'Risk & mitigation log',
            'Post-initiative performance audit',
            'Policy & procedure updates',
            'Communications rollout package',
        ];
        shuffle($pool);

        return array_slice($pool, 0, rand(6, 9));
    }

    protected function generateTasks(array $project): array
    {
        $base = $project['key_deliverables'] ?? $this->randomDeliverables();
        $tasks = [];
        $totalBudget = $project['constraints']['budget'] ?? rand(25000, 50000);
        $hoursTotal = 0;
        $estimates = [];
        foreach ($base as $idx => $deliverable) {
            $est = rand(6, 16);
            $estimates[$idx] = $est;
            $hoursTotal += $est;
        }
        foreach ($base as $idx => $deliverable) {
            $est = $estimates[$idx];
            // Much more conservative budget allocation: cap at 400 per task
            $budget = min(400, $est * 50); // 50 per hour, max 400
            $sharePct = $totalBudget > 0 ? round(($budget / $totalBudget) * 100, 2) : null;
            $tasks[] = [
                'id' => $idx + 1,
                'title' => Str::limit($deliverable, 72),
                'priority' => collect(['High', 'Medium', 'Low'])->random(),
                'status' => 'Pending',
                'assignee' => null,
                'progress' => 0,
                'estimated_hours' => $est,
                'remaining_hours' => $est,
                'required_skills' => $this->inferSkills($deliverable),
                'budget' => $budget,
                'budget_share_pct' => $sharePct,
                'cancellable' => true,
            ];
        }

        return $tasks;
    }

    protected function inferSkills(string $text): array
    {
        $skillsMap = [
            'report' => 'Analysis',
            'energy' => 'Operations',
            'training' => 'Facilitation',
            'pilot' => 'Implementation',
            'vendor' => 'Procurement',
            'dashboard' => 'Analytics',
            'risk' => 'Risk Mgmt',
            'policy' => 'Governance',
            'communication' => 'Comms',
        ];
        $skills = [];
        foreach ($skillsMap as $k => $s) {
            if (Str::contains(Str::lower($text), $k)) {
                $skills[] = $s;
            }
        }
        if (empty($skills)) {
            $skills[] = 'General';
        }

        return array_slice(array_unique($skills), 0, 3);
    }

    protected function generateTeam(array $project, array $tasks): array
    {
        $roles = [
            ['role' => 'Project Manager', 'skills' => ['Coordination', 'Risk Mgmt', 'Comms']],
            ['role' => 'Analyst', 'skills' => ['Analysis', 'Data', 'Reporting']],
            ['role' => 'Operations Lead', 'skills' => ['Operations', 'Optimization', 'Implementation']],
            ['role' => 'Trainer', 'skills' => ['Facilitation', 'Comms', 'Engagement']],
            ['role' => 'Procurement Specialist', 'skills' => ['Procurement', 'Vendors', 'Negotiation']],
            ['role' => 'Sustainability Expert', 'skills' => ['Governance', 'Compliance', 'Risk']],
            ['role' => 'Data Specialist', 'skills' => ['Analytics', 'Dashboards', 'Metrics']],
        ];
        shuffle($roles);
        // Collect required skills from tasks
        $requiredSkills = [];
        foreach ($tasks as $t) {
            foreach ($t['required_skills'] as $s) {
                $requiredSkills[$s] = true;
            }
        }
        $requiredSkills = array_keys($requiredSkills);
        $team = [];
        $id = 1;
        $defaultRate = $project['cost_model']['default_member_hourly_rate'] ?? 100;
        // First, seed with role templates ensuring coverage
        foreach ($requiredSkills as $skill) {
            // find a role offering this skill
            $matchedRole = null;
            foreach ($roles as $r) {
                if (in_array($skill, $r['skills'])) {
                    $matchedRole = $r;
                    break;
                }
            }
            if (! $matchedRole) {
                $matchedRole = ['role' => $skill.' Specialist', 'skills' => [$skill]];
            }
            // If not already a member with this skill, add one
            $alreadyCovered = false;
            foreach ($team as $m) {
                if (in_array($skill, $m['skills'])) {
                    $alreadyCovered = true;
                    break;
                }
            }
            if (! $alreadyCovered) {
                $capacity = rand(30, 40);
                $hourly = (int) round($defaultRate * rand(90, 125) / 100); // +/-25%
                $team[] = [
                    'id' => $id++,
                    'name' => $this->fakeName(),
                    'role' => $matchedRole['role'],
                    'skills' => $matchedRole['skills'],
                    'workload' => rand(25, 70),
                    'status' => collect(['Active', 'Busy', 'Available'])->random(),
                    'capacity_hours' => $capacity,
                    // new morale & cost attributes consumed by front-end
                    'morale' => rand(60, 80),
                    'hourly_rate' => $hourly,
                    'weekly_cost' => $hourly * $capacity,
                    'removable' => true,
                ];
            }
        }
        // Fill to minimum size if needed
        while (count($team) < 5) {
            $r = $roles[array_rand($roles)];
            $capacity = rand(30, 40);
            $hourly = (int) round($defaultRate * rand(90, 125) / 100);
            $team[] = [
                'id' => $id++,
                'name' => $this->fakeName(),
                'role' => $r['role'],
                'skills' => $r['skills'],
                'workload' => rand(25, 70),
                'status' => collect(['Active', 'Busy', 'Available'])->random(),
                'capacity_hours' => $capacity,
                'morale' => rand(60, 80),
                'hourly_rate' => $hourly,
                'weekly_cost' => $hourly * $capacity,
                'removable' => true,
            ];
        }
        // Cap at 8 members
        $team = array_slice($team, 0, 8);

        return $team;
    }

    protected function fakeName(): string
    {
        $first = ['Sarah', 'Michael', 'Ava', 'Liam', 'Noah', 'Grace', 'Daniel', 'Olivia', 'Ethan', 'Maya', 'Lucas', 'Emma', 'Sofia', 'Henry', 'Nora'];
        $last = ['Chen', 'Johnson', 'Patel', 'Rodriguez', 'Khan', 'Singh', 'Garcia', 'Davis', 'Martinez', 'Walker', 'Lopez', 'Reed', 'Cooper', 'Diaz', 'Mitchell'];

        return $first[array_rand($first)].' '.$last[array_rand($last)];
    }

    /* ============================== EVENT GENERATION ============================== */
    protected function generateEvents(array $project, array $team, array $tasks): array
    {
        $totalWeeks = $project['total_weeks'] ?? 10;
        $events = [];
        $id = 1;

        // Core scenario coverage (manager directive, attrition, conflict, request)
        $events = array_merge($events, $this->mandatoryScenarios($project, $team, $tasks, $id, $totalWeeks));

        for ($week = 1; $week <= $totalWeeks; $week++) {
            // Always inject standup as an actionable improvement event with options
            $events[] = [
                'id' => $id++,
                'trigger_week' => $week,
                'title' => 'Weekly Standup',
                'type' => 'Standup',
                'action_type' => 'standup',
                'severity' => 'low',
                'desc' => 'Synchronize on blockers & alignment. Choose how deeply to invest this week.',
                'member_ids' => collect($team)->pluck('id')->all(),
                'task_ids' => [],
                'resolution_requires_action' => true,
                'resolution_options' => [
                    ['key' => 'skip', 'title' => 'Light Async Check‑In', 'description' => 'No meeting; minimal progress boost, saves budget.', 'effects' => ['budget_delta' => 0, 'task_progress_delta' => 3, 'morale_delta' => -1]],
                    ['key' => 'focused', 'title' => 'Focused 15‑min Standup', 'description' => 'Balanced sync; modest progress & morale.', 'effects' => ['budget_delta' => -(int) round(count($team) * 40), 'task_progress_delta' => 6, 'morale_delta' => +1]],
                    ['key' => 'deep_dive', 'title' => 'Extended Problem‑Solving Session', 'description' => 'Higher cost; larger progress boost & risk reduction.', 'effects' => ['budget_delta' => -(int) round(count($team) * 80), 'task_progress_delta' => 10, 'morale_delta' => +2, 'quality_risk_delta' => -1]],
                ],
            ];
            // Deterministic funding injection opportunity (midpoint or week 4 whichever sooner) ensures budget increase path
            $fundingWeek = min(4, max(1, (int) ceil($totalWeeks / 2)));
            if ($week === $fundingWeek) {
                $events[] = [
                    'id' => $id++, 'trigger_week' => $week, 'title' => 'Executive Funding Opportunity', 'type' => 'Funding Injection', 'severity' => 'low',
                    'desc' => 'Executive sponsor offers discretionary funds contingent on governance.', 'member_ids' => [], 'task_ids' => [], 'resolution_requires_action' => true,
                    'action_type' => 'funding_injection',
                    'resolution_options' => [
                        ['key' => 'accept_with_controls', 'title' => 'Accept $10k With Controls', 'description' => 'Increase budget; minor overhead (quality +)', 'effects' => ['budget_delta' => +10000, 'quality_risk_delta' => -1, 'morale_delta' => +1]],
                        ['key' => 'accept_light', 'title' => 'Accept $6k Fast', 'description' => 'Less process; moderate benefit', 'effects' => ['budget_delta' => +6000, 'morale_delta' => +1]],
                        ['key' => 'decline', 'title' => 'Decline Funding', 'description' => 'Maintain lean scope; no change', 'effects' => []],
                    ],
                ];
            }
            // Random 1‑2 contextual events
            $num = rand(2, 3); // increase richness
            for ($i = 0; $i < $num; $i++) {
                $events[] = array_merge(['id' => $id++, 'trigger_week' => $week], $this->dynamicEventTemplate($tasks, $team, $project, $week, $totalWeeks));
            }
        }
        usort($events, fn ($a, $b) => $a['trigger_week'] === $b['trigger_week'] ? $a['id'] <=> $b['id'] : $a['trigger_week'] <=> $b['trigger_week']);

        return $events;
    }

    /* Legacy helpers retained (unused in new flow but kept for reference) */
    protected function agileCeremonyTemplate(int $week, array $tasks, array $team, array $project): array
    {
        $options = ['Sprint Retro', 'Sprint Planning', 'Team Celebration', 'Mid-Sprint Sync'];
        $pick = $options[array_rand($options)];
        $highTask = collect($tasks)->where('priority', 'High')->where('status', 'Pending')->first();

        return match ($pick) {
            'Sprint Retro' => [
                'title' => 'Sprint Retrospective Insights',
                'type' => 'Ceremony',
                'desc' => 'Retro identifies one process bottleneck; addressing it could free ~5% capacity next week.',
                'impact' => 'Opportunity: minor efficiency gain',
                'member_ids' => [],
                'task_ids' => [],
                'action_type' => 'team_event', // resolved by running a team event
                'actions' => [
                    'Document one improvement action',
                    'Select owner to implement',
                    'Optionally adjust one task estimate (-5%) if justified',
                ],
            ],
            'Sprint Planning' => [
                'title' => 'Sprint Planning Alignment',
                'type' => 'Ceremony',
                'desc' => 'Revisit priorities; ensure high value tasks are staffed first.',
                'impact' => 'Focus alignment',
                'member_ids' => [],
                'task_ids' => $highTask ? [$highTask['id']] : [],
                'action_type' => 'update_task', // resolve by updating linked high priority task
                'actions' => [
                    'Confirm scope of top priority tasks',
                    'Reassign underutilized members',
                    'Defer lowest value item if capacity tight',
                ],
            ],
            'Team Celebration' => [
                'title' => 'Team Celebration Opportunity',
                'type' => 'Team Event',
                'desc' => 'Option to allocate small time for recognition; may boost morale (+5% velocity next week).',
                'impact' => 'Morale boost potential',
                'member_ids' => [],
                'task_ids' => [],
                'action_type' => 'team_event',
                'actions' => [
                    'Decide whether to invest time in celebration',
                    'If yes, ensure critical tasks stay staffed',
                    'Track morale changes',
                ],
            ],
            default => [
                'title' => 'Mid-Sprint Sync',
                'type' => 'Ceremony',
                'desc' => 'Brief sync uncovers minor blockers early.',
                'impact' => 'Risk mitigation',
                'member_ids' => [],
                'task_ids' => [],
                'action_type' => 'standup', // resolved by conducting a standup
                'actions' => [
                    'Surface emerging risks',
                    'Update at-risk task status',
                    'Rebalance workload if needed',
                ],
            ]
        };
    }

    /**
     * Generate mandatory scenario coverage events so every simulation includes:
     * - Manager directive email (add task)
     * - Manager directive email (update existing task detail)
     * - Team member removal scenario
     * - Team conflict between two members
     * - Team request / wish (quality of life / tooling)
     * - Budget increase request for a task
     * - Compensation / raise request
     * PLUS GUARANTEED CRITICAL EVENTS:
     * - Budget cut
     * - Member sickness
     * - Member demands increase
     * - Team conflict (already included)
     * - Delay (vendor/external delay)
     */
    /** Replaces older generateMandatoryScenarioEvents with richer options */
    protected function mandatoryScenarios(array $project, array $team, array $tasks, int &$eventId, int $totalWeeks): array
    {
        if (empty($team)) {
            return [];
        }
        $events = [];
        $randTask = $tasks[array_rand($tasks)] ?? null;
        $memberA = $team[array_rand($team)];
        $memberB = $team[array_rand($team)];
        if ($memberA['id'] === $memberB['id'] && count($team) > 1) {
            $memberB = $team[($memberA['id'] % count($team))];
        }
        $weeks = range(1, min($totalWeeks, 7));
        shuffle($weeks);
        $week = fn () => array_shift($weeks) ?? rand(1, $totalWeeks);

        \Log::info('Creating mandatory events for project', [
            'total_weeks' => $totalWeeks,
            'available_weeks' => $weeks,
            'team_size' => count($team),
        ]);

        // MANDATORY EVENT 1: Budget Cut (NEW - GUARANTEED)
        $events[] = [
            'id' => $eventId++, 'trigger_week' => $week(), 'title' => 'Emergency Budget Cut', 'type' => 'Budget Cut', 'severity' => 'high',
            'desc' => 'Executive mandate: reduce project budget by 20% due to organizational restructuring.',
            'member_ids' => [], 'task_ids' => [],
            'action_type' => 'budget_cut',
            'resolution_requires_action' => true,
            'resolution_options' => [
                ['key' => 'reduce_scope', 'title' => 'Reduce Scope by 25%', 'description' => 'Cancel non-critical tasks to meet budget', 'effects' => ['budget_delta' => 0, 'morale_delta' => -3, 'quality_risk_delta' => +2, 'scope_reduction' => 25]],
                ['key' => 'defer_tasks', 'title' => 'Defer Tasks to Phase 2', 'description' => 'Move tasks to future phases', 'effects' => ['budget_delta' => 0, 'morale_delta' => -1, 'timeline_delta' => +1]],
                ['key' => 'negotiate_timeline', 'title' => 'Negotiate Extended Timeline', 'description' => 'Extend project to absorb cost reduction', 'effects' => ['budget_delta' => 0, 'timeline_delta' => +2, 'morale_delta' => -2]],
            ],
        ];

        // MANDATORY EVENT 2: Member Sickness (NEW - GUARANTEED)
        $events[] = [
            'id' => $eventId++, 'trigger_week' => $week(), 'title' => 'Member Sickness: '.$memberA['name'], 'type' => 'Member Sickness', 'severity' => 'medium',
            'desc' => $memberA['name'].' is unexpectedly unavailable due to illness for 1-2 weeks.',
            'member_ids' => [$memberA['id']], 'task_ids' => [],
            'action_type' => 'member_sickness',
            'resolution_requires_action' => true,
            'resolution_options' => [
                ['key' => 'hire_temporary', 'title' => 'Hire Temporary Contractor', 'description' => 'Maintain timeline but increase budget', 'effects' => ['budget_delta' => -1500, 'timeline_delta' => 0, 'morale_delta' => +1]],
                ['key' => 'redistribute_work', 'title' => 'Redistribute Workload', 'description' => 'Spread work among team; morale impact', 'effects' => ['budget_delta' => 0, 'morale_delta' => -2, 'timeline_delta' => +1]],
                ['key' => 'delay_affected_tasks', 'title' => 'Delay Affected Tasks', 'description' => 'Accept timeline impact; lowest cost', 'effects' => ['budget_delta' => 0, 'timeline_delta' => +2, 'morale_delta' => 0]],
            ],
        ];

        // MANDATORY EVENT 3: Member Demands Increase (NEW - GUARANTEED)
        $events[] = [
            'id' => $eventId++, 'trigger_week' => $week(), 'title' => 'Compensation Request: '.$memberB['name'], 'type' => 'Member Demands', 'severity' => 'medium',
            'desc' => $memberB['name'].' requests immediate salary increase citing market rates and project criticality.',
            'member_ids' => [$memberB['id']], 'task_ids' => [],
            'action_type' => 'member_demands',
            'resolution_requires_action' => true,
            'resolution_options' => [
                ['key' => 'approve_increase', 'title' => 'Approve Salary Increase', 'description' => 'Grant 15% increase; boost morale and retention', 'effects' => ['budget_delta' => -1800, 'morale_delta' => +8, 'velocity_delta_pct' => +2]],
                ['key' => 'offer_bonus', 'title' => 'Offer Performance Bonus', 'description' => 'One-time bonus instead of permanent increase', 'effects' => ['budget_delta' => -900, 'morale_delta' => +3, 'velocity_delta_pct' => +1]],
                ['key' => 'decline_request', 'title' => 'Decline Request', 'description' => 'No budget impact but risk of departure', 'effects' => ['budget_delta' => 0, 'morale_delta' => -5, 'attrition_risk' => true]],
            ],
        ];

        // MANDATORY EVENT 4: Add Task directive
        $events[] = [
            'id' => $eventId++, 'trigger_week' => $week(), 'title' => 'Manager Directive: Add Compliance Audit', 'type' => 'Manager Directive', 'severity' => 'medium',
            'desc' => 'Regulatory change requires adding a compliance audit preparation task.',
            'member_ids' => [], 'task_ids' => [],
            'action_type' => 'add_task',
            'resolution_requires_action' => true,
            'resolution_options' => [
                ['key' => 'add_full', 'title' => 'Add Full Audit Task (10h)', 'description' => 'Adds scope but reduces future risk', 'effects' => ['budget_delta' => -1000, 'create_new_tasks' => [['title' => 'Compliance Audit Prep', 'priority' => 'Medium', 'estimated_hours' => 10, 'required_skills' => ['Governance', 'Analysis']]], 'quality_risk_delta' => -1]],
                ['key' => 'add_light', 'title' => 'Add Light Checklist (6h)', 'description' => 'Less effort; moderate risk reduction', 'effects' => ['budget_delta' => -600, 'create_new_tasks' => [['title' => 'Compliance Checklist', 'priority' => 'Low', 'estimated_hours' => 6, 'required_skills' => ['Governance']]], 'quality_risk_delta' => 0]],
                ['key' => 'defer', 'title' => 'Defer To Phase 2', 'description' => 'No immediate cost; quality risk increases', 'effects' => ['budget_delta' => 0, 'quality_risk_delta' => +2, 'morale_delta' => -1]],
            ],
        ];

        // MANDATORY EVENT 5: Team Conflict (ALWAYS APPEARS IN WEEK 2-3)
        $conflictWeek = min(2 + ($eventId % 2), $totalWeeks); // Week 2 or 3, whichever is available
        $events[] = [
            'id' => $eventId++, 'trigger_week' => $conflictWeek, 'title' => 'Team Conflict: '.$memberA['name'].' & '.$memberB['name'], 'type' => 'Team Conflict', 'severity' => 'medium',
            'desc' => 'Friction causing coordination drag between members.', 'member_ids' => [$memberA['id'], $memberB['id']], 'task_ids' => $randTask ? [$randTask['id']] : [],
            'action_type' => 'team_conflict',
            'resolution_requires_action' => true,
            'resolution_options' => [
                ['key' => 'mediate', 'title' => 'Facilitate Mediation', 'description' => 'Time investment for morale & velocity gain', 'effects' => ['budget_delta' => -300, 'morale_delta' => +5, 'velocity_delta_pct' => +4]],
                ['key' => 'reassign', 'title' => 'Reassign Shared Task', 'description' => 'Frees conflict pair but small progress tax', 'effects' => ['task_status' => 'Pending', 'task_progress_delta' => -5, 'morale_delta' => +3, 'quality_risk_delta' => -1]],
                ['key' => 'protocol', 'title' => 'Introduce Decision Protocol', 'description' => 'Adds minor overhead; sustainable benefit', 'effects' => ['budget_delta' => -150, 'morale_delta' => +2, 'velocity_delta_pct' => +2, 'quality_risk_delta' => -1, 'follow_up' => 'Review protocol adoption in 2 weeks.']],
            ],
        ];
        \Log::info('Team conflict event created', [
            'week' => $conflictWeek,
            'memberA' => $memberA['name'],
            'memberB' => $memberB['name'],
            'total_weeks' => $totalWeeks,
        ]);

        // MANDATORY EVENT 6: Vendor/External Delay (ENHANCED)
        $events[] = [
            'id' => $eventId++, 'trigger_week' => $week(), 'title' => 'Critical Vendor Delay', 'type' => 'Vendor Delay', 'severity' => 'high',
            'desc' => 'Key external dependency delayed by 2 weeks, threatening project timeline.',
            'member_ids' => $memberA ? [$memberA['id']] : [], 'task_ids' => $randTask ? [$randTask['id']] : [],
            'action_type' => 'vendor_delay',
            'resolution_requires_action' => true,
            'resolution_options' => [
                ['key' => 'expedite_vendor', 'title' => 'Pay Expedite Fee ($1,800)', 'description' => 'Recover timeline with premium cost', 'effects' => ['budget_delta' => -1800, 'timeline_delta' => 0, 'quality_risk_delta' => -1]],
                ['key' => 'parallel_workaround', 'title' => 'Develop Internal Workaround', 'description' => 'Create alternative solution; moderate cost', 'effects' => ['create_new_tasks' => [['title' => 'Vendor Workaround', 'priority' => 'High', 'estimated_hours' => 12, 'required_skills' => ['Development', 'Analysis']]], 'budget_delta' => -800, 'timeline_delta' => +1]],
                ['key' => 'absorb_delay', 'title' => 'Absorb Full Delay', 'description' => 'Accept 2-week delay; lowest cost option', 'effects' => ['timeline_delta' => +2, 'morale_delta' => -3, 'quality_risk_delta' => +1]],
            ],
        ];

        // MANDATORY EVENT 7: Attrition / retention decision (ALREADY INCLUDED)
        $events[] = [
            'id' => $eventId++, 'trigger_week' => $week(), 'title' => 'Attrition Notice: '.$memberA['name'], 'type' => 'Attrition', 'severity' => 'high', 'desc' => $memberA['name'].' signals possible departure next week; decide retention or transition strategy.', 'member_ids' => [$memberA['id']], 'task_ids' => [],
            'resolution_requires_action' => true,
            'action_type' => 'attrition',
            'resolution_options' => [
                ['key' => 'retain_with_praise', 'title' => 'Retention Package + Recognition', 'description' => 'Invest to keep member; boosts morale & slight velocity', 'effects' => ['budget_delta' => -800, 'morale_delta' => +8, 'velocity_delta_pct' => +3, 'quality_risk_delta' => -1]],
                ['key' => 'reassign_workload', 'title' => 'Reassign Critical Workload', 'description' => 'Reassign their tasks proactively; moderate morale cost but avoids abrupt loss', 'effects' => ['morale_delta' => -1, 'velocity_delta_pct' => -1, 'reassign_tasks_from_member_id' => $memberA['id']]],
                ['key' => 'prepare_transition', 'title' => 'Transition Plan (Knowledge Share)', 'description' => 'Light doc + handover; slight short-term velocity dip', 'effects' => ['budget_delta' => -400, 'velocity_delta_pct' => -2, 'morale_delta' => +1, 'reassign_tasks_from_member_id' => $memberA['id']]],
                ['key' => 'accept_departure', 'title' => 'Accept Departure & Reallocate', 'description' => 'Member leaves; budget savings but morale hit', 'effects' => ['budget_delta' => +1500, 'morale_delta' => -4, 'capacity_delta_pct' => -12, 'member_departure_id' => $memberA['id']]],
            ],
        ];

        return $events;
    }

    protected function dynamicEventTemplate(array $tasks, array $team, array $project, int $week, int $totalWeeks): array
    {
        $task = $tasks ? $tasks[array_rand($tasks)] : null;
        $member = $team ? $team[array_rand($team)] : null;
        $templates = [];
        // Scope creep
        $templates[] = [
            'title' => 'Scope Creep: '.($task['title'] ?? 'Deliverable'), 'type' => 'Scope Increase', 'severity' => 'medium',
            'desc' => 'Stakeholder proposes enhancement expanding effort for "'.($task['title'] ?? 'Item').'".', 'member_ids' => [], 'task_ids' => $task ? [$task['id']] : [], 'resolution_requires_action' => true,
            'action_type' => 'scope_creep',
            'resolution_options' => [
                ['key' => 'accept_full', 'title' => 'Accept Full Enhancement', 'description' => '+25% estimate & budget; higher stakeholder satisfaction', 'effects' => ['increase_estimate_pct' => 25, 'budget_delta' => -(int) round(($task['estimated_hours'] ?? 8) * 25), 'morale_delta' => +2, 'quality_risk_delta' => -1]],
                ['key' => 'negotiate_partial', 'title' => 'Negotiate Partial Scope', 'description' => 'Balanced increase; preserves buffer', 'effects' => ['increase_estimate_pct' => 12, 'budget_delta' => -(int) round(($task['estimated_hours'] ?? 8) * 12), 'quality_risk_delta' => -1]],
                ['key' => 'defer_change', 'title' => 'Defer To Future Phase', 'description' => 'No immediate cost; slight stakeholder frustration', 'effects' => ['morale_delta' => -2, 'quality_risk_delta' => +1]],
            ],
        ];
        // Vendor delay
        $templates[] = [
            'title' => 'Vendor Delay Impact', 'type' => 'Vendor Delay', 'severity' => 'high', 'desc' => 'External dependency delay threatens schedule buffer.', 'member_ids' => $member ? [$member['id']] : [], 'task_ids' => $task ? [$task['id']] : [], 'resolution_requires_action' => true,
            'action_type' => 'vendor_delay',
            'resolution_options' => [
                ['key' => 'expedite_vendor', 'title' => 'Pay Expedited Fee', 'description' => 'Recover timeline; budget hit', 'effects' => ['budget_delta' => -1200, 'timeline_delta' => -1, 'quality_risk_delta' => -1]],
                ['key' => 'parallel_task', 'title' => 'Start Parallel Contingency Task', 'description' => 'Adds new task; mitigates idle time', 'effects' => ['create_new_tasks' => [['title' => 'Contingency Workaround', 'priority' => 'High', 'estimated_hours' => 8, 'required_skills' => $task['required_skills'] ?? ['General']]], 'budget_delta' => -800, 'follow_up' => 'Review vendor progress in 1 week']],
                ['key' => 'absorb_delay', 'title' => 'Absorb Delay', 'description' => 'Accept +1 week risk; no cost', 'effects' => ['timeline_delta' => +1, 'morale_delta' => -1]],
            ],
        ];
        // Quality concern
        $templates[] = [
            'title' => 'Quality Concern: '.($task['title'] ?? 'Task'), 'type' => 'Quality Issue', 'severity' => 'medium', 'desc' => 'Potential defects accumulating – choose mitigation level.', 'member_ids' => [], 'task_ids' => $task ? [$task['id']] : [], 'resolution_requires_action' => true,
            'action_type' => 'quality_issue',
            'resolution_options' => [
                ['key' => 'full_refactor', 'title' => 'Immediate Refactor', 'description' => 'Progress setback; lowers future risk', 'effects' => ['task_progress_delta' => -15, 'quality_risk_delta' => -3, 'budget_delta' => -500]],
                ['key' => 'selective_review', 'title' => 'Selective Review', 'description' => 'Moderate improvement with limited cost', 'effects' => ['task_progress_delta' => -5, 'quality_risk_delta' => -2, 'budget_delta' => -250]],
                ['key' => 'document_debt', 'title' => 'Document & Proceed', 'description' => 'No delay now; future risk increases', 'effects' => ['quality_risk_delta' => +2]],
            ],
        ];
        // Management budget request (asks to allocate > 15k to accelerate critical path)
        if ($week <= 3) {
            $templates[] = [
                'title' => 'Management Acceleration Budget Request', 'type' => 'Mgmt Budget Request', 'severity' => 'medium',
                'desc' => 'Leadership requests allocation of $15k+ to accelerate critical path and add specialist capacity.', 'member_ids' => [], 'task_ids' => $task ? [$task['id']] : [], 'resolution_requires_action' => true,
                'action_type' => 'budget_request',
                'resolution_options' => [
                    ['key' => 'approve_full_15k', 'title' => 'Approve Full $15k', 'description' => 'Spend now to gain sustained velocity & morale boost', 'effects' => ['budget_delta' => -15000, 'velocity_delta_pct' => +6, 'morale_delta' => +3, 'quality_risk_delta' => -1]],
                    ['key' => 'approve_partial_8k', 'title' => 'Approve Partial $8k', 'description' => 'Moderate spend for smaller uplift', 'effects' => ['budget_delta' => -8000, 'velocity_delta_pct' => +3, 'morale_delta' => +1]],
                    ['key' => 'reprioritize', 'title' => 'Decline & Reprioritize', 'description' => 'No spend; risk of slower delivery & morale dip', 'effects' => ['morale_delta' => -2, 'velocity_delta_pct' => -2, 'quality_risk_delta' => +1]],
                    ['key' => 'escalate_for_external', 'title' => 'Escalate For External Funding', 'description' => 'No immediate spend; potential funding event later', 'effects' => ['morale_delta' => 0, 'follow_up' => 'Potential funding injection event in 2 weeks']],
                ],
            ];
        }
        // Possible funding injection later if escalation chosen earlier / random mid‑project
        if ($week >= 4 && rand(0, 100) < 30) {
            $templates[] = [
                'title' => 'Executive Funding Opportunity', 'type' => 'Funding Injection', 'severity' => 'low', 'desc' => 'Executive sponsor offers discretionary funds contingent on governance.', 'member_ids' => [], 'task_ids' => [], 'resolution_requires_action' => true,
                'action_type' => 'funding_injection',
                'resolution_options' => [
                    ['key' => 'accept_with_controls', 'title' => 'Accept $10k With Controls', 'description' => 'Increase budget; minor overhead (quality +)', 'effects' => ['budget_delta' => +10000, 'quality_risk_delta' => -1, 'morale_delta' => +1]],
                    ['key' => 'accept_light', 'title' => 'Accept $6k Fast', 'description' => 'Less process; moderate benefit', 'effects' => ['budget_delta' => +6000, 'morale_delta' => +1]],
                    ['key' => 'decline', 'title' => 'Decline Funding', 'description' => 'Maintain lean scope; no change', 'effects' => []],
                ],
            ];
        }
        // Morale slump event
        if (rand(0, 100) < 25) {
            $templates[] = [
                'title' => 'Team Morale Slump', 'type' => 'Morale', 'severity' => 'medium', 'desc' => 'Sustained pressure causing morale dip; decide intervention level.', 'member_ids' => collect($team)->pluck('id')->all(), 'task_ids' => [], 'resolution_requires_action' => true,
                'action_type' => 'morale_slump',
                'resolution_options' => [
                    ['key' => 'run_workshop', 'title' => 'Run Recognition Workshop', 'description' => 'Costly but boosts morale & future velocity', 'effects' => ['budget_delta' => -3000, 'morale_delta' => +6, 'velocity_delta_pct' => +3]],
                    ['key' => 'light_checkins', 'title' => 'Light 1:1 Check‑Ins', 'description' => 'Low cost; small morale lift', 'effects' => ['budget_delta' => -800, 'morale_delta' => +3]],
                    ['key' => 'do_nothing', 'title' => 'Monitor Only', 'description' => 'No cost; risk morale decline', 'effects' => ['morale_delta' => -3]],
                ],
            ];
        }
        // Technical debt spike event
        if ($task && rand(0, 100) < 20) {
            $templates[] = [
                'title' => 'Technical Debt Spike: '.$task['title'], 'type' => 'Technical Debt', 'severity' => 'high', 'desc' => 'Accumulated shortcuts threaten sustainability.', 'member_ids' => [], 'task_ids' => [$task['id']], 'resolution_requires_action' => true,
                'action_type' => 'technical_debt',
                'resolution_options' => [
                    ['key' => 'fund_refactor', 'title' => 'Fund Refactor ($5k)', 'description' => 'Reduce future risk; slow immediate progress', 'effects' => ['budget_delta' => -5000, 'task_progress_delta' => -10, 'quality_risk_delta' => -3]],
                    ['key' => 'targeted_cleanup', 'title' => 'Targeted Cleanup ($2k)', 'description' => 'Balanced cost / risk reduction', 'effects' => ['budget_delta' => -2000, 'task_progress_delta' => -4, 'quality_risk_delta' => -2]],
                    ['key' => 'accept_risk', 'title' => 'Accept Short‑Term Risk', 'description' => 'No cost now; risk increases', 'effects' => ['quality_risk_delta' => +3]],
                ],
            ];
        }

        return $templates[array_rand($templates)];
    }
}
