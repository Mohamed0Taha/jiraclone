<?php

namespace App\Services;

use App\Models\User;
use App\Models\VirtualProjectSimulation;
use App\Models\SimulationTask;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

/**
 * Service: SimulationProjectGenerator
 *
 * Responsibilities:
 *  - Generate a new VirtualProjectSimulation with high variability (domain, complexity, risk profile, requirements)
 *  - (Optionally) use LLM to craft richer requirements & description when AI is enabled
 *  - Produce an AI evaluation of task relevancy & project coherence (scope vs team vs budget)
 *  - Store AI analysis inside simulation->metrics['ai_analysis'] & ['ai_relevancy']
 *  - Provide fallback deterministic pseudo-random generation if AI unavailable
 */
class SimulationProjectGenerator
{
    public function __construct(
        protected OpenAIService $openAI,
        protected SimulationEngine $engine,
    ) {}

    /**
     * Create a fully initialized simulation (without advancing days yet).
     * @param User $user
     * @param bool $useAi
     */
    public function generate(User $user, bool $useAi = true): VirtualProjectSimulation
    {
        $idea = $useAi ? $this->generateIdeaAI() : $this->generateIdeaFallback();

        $simulation = VirtualProjectSimulation::create([
            'user_id' => $user->id,
            'status' => 'active',
            'title' => $idea['title'],
            'description' => $idea['description'],
            'budget_total' => $idea['budget'],
            'total_days' => 7,
            'current_day' => 0,
            'requirements_document' => $idea['requirements'],
            'meta' => $idea['meta'] ?? [], // Pass project metadata for domain-specific generation
        ]);

        // Bootstrap team based on project domain (will use AI if available)
        $teamSize = $idea['meta']['team_size_needed'] ?? 5;
        if ($simulation->teamMembers()->count() === 0) {
            app(\App\Support\TeamGenerator::class)->generate($simulation, $teamSize);
        }

        // Initialize metrics defaults
        $this->initializeMetrics($simulation);

        // Generate domain-appropriate tasks (AI-powered for diversity)
        $this->engine->generateAITasks($simulation);

        // AI evaluation & enhancement (best-effort, swallow errors)
        if ($useAi) {
            try {
                $this->evaluateRelevancy($simulation, enhance: true);
            } catch (Exception $e) {
                Log::warning('SimulationProjectGenerator AI evaluation failed', ['error' => $e->getMessage()]);
            }
        }

        $simulation->refresh();
        return $simulation;
    }

    protected function initializeMetrics(VirtualProjectSimulation $simulation): void
    {
        $metrics = $simulation->meta ?? [];
        if (!isset($metrics['morale'])) { $metrics['morale'] = 80; }
        if (!isset($metrics['slowdown_factor'])) { $metrics['slowdown_factor'] = 1.0; }
        if (!isset($metrics['stakeholder_satisfaction'])) { $metrics['stakeholder_satisfaction'] = 82; }
        if (!isset($metrics['xp'])) { $metrics['xp'] = 0; }
        if (!isset($metrics['level'])) { $metrics['level'] = 1; }
        if (!isset($metrics['xp_log'])) { $metrics['xp_log'] = []; }
        if (!isset($metrics['day_started'])) {
            if ($simulation->current_day === null || $simulation->current_day < 0) {
                $simulation->current_day = 0;
            }
            $metrics['day_started'] = true;
        }
        if (!isset($metrics['assignment_costs'])) { $metrics['assignment_costs'] = []; }
        $simulation->meta = $metrics;
        $simulation->save();
    }

    /**
     * Produce a random idea using LLM returning structured JSON.
     * Fallback to local generator if API missing or error.
     */
    protected function generateIdeaAI(): array
    {
        try {
            // Diverse project domains for certification variety
            $domains = [
                'Healthcare System Implementation',
                'Educational Program Development', 
                'Marketing Campaign Launch',
                'Infrastructure Construction',
                'Event Management',
                'Product Manufacturing',
                'Business Process Optimization',
                'Financial Services Setup',
                'Research & Development',
                'Non-Profit Initiative',
                'Retail Operations',
                'Supply Chain Management',
                'Customer Service Enhancement',
                'Quality Assurance Program',
                'Training & Development',
                'Sustainability Initiative',
                'Digital Transformation',
                'Compliance & Regulatory',
                'Strategic Planning',
                'Operations Management'
            ];
            
            $selectedDomain = collect($domains)->random();
            
            $data = $this->openAI->chatJson([
                ['role' => 'system', 'content' => 'You generate realistic project management scenarios across diverse industries for certification training. Each project should be unique, challenging, and require different skills. Return ONLY JSON.'],
                ['role' => 'user', 'content' => "Generate a unique project in the '$selectedDomain' domain with realistic challenges. Include: title (project name), description (40-60 words), budget (15000-40000), complexity (standard|challenging|complex), industry_type, project_type, requirements (8-12 specific deliverables as array), key_objectives (4-6 measurable goals), risk_factors (3-5 potential challenges), success_metrics (3-4 KPIs), duration_weeks (6-16), team_size_needed (4-8). Ensure this is NOT a software development project unless specifically appropriate to the domain."]
            ]);

            // Validate and structure the response
            if (!is_array($data) || !isset($data['title'])) {
                return $this->generateIdeaFallback();
            }

            $requirements = '';
            if (isset($data['requirements']) && is_array($data['requirements'])) {
                $requirements = "PROJECT DELIVERABLES:\n" . implode("\n", array_map(fn($r) => "• $r", $data['requirements']));
            }
            
            if (isset($data['key_objectives']) && is_array($data['key_objectives'])) {
                $requirements .= "\n\nKEY OBJECTIVES:\n" . implode("\n", array_map(fn($o) => "• $o", $data['key_objectives']));
            }

            if (isset($data['success_metrics']) && is_array($data['success_metrics'])) {
                $requirements .= "\n\nSUCCESS METRICS:\n" . implode("\n", array_map(fn($m) => "• $m", $data['success_metrics']));
            }

            return [
                'title' => $data['title'],
                'description' => $data['description'] ?? 'AI generated project in ' . $selectedDomain,
                'budget' => (int) ($data['budget'] ?? rand(18000, 35000)),
                'requirements' => $requirements,
                'meta' => [
                    'domain' => $selectedDomain,
                    'industry_type' => $data['industry_type'] ?? $selectedDomain,
                    'project_type' => $data['project_type'] ?? 'General',
                    'complexity' => $data['complexity'] ?? 'standard',
                    'risk_factors' => $data['risk_factors'] ?? [],
                    'duration_weeks' => $data['duration_weeks'] ?? rand(8, 12),
                    'team_size_needed' => $data['team_size_needed'] ?? 5,
                    'generated_method' => 'ai_diverse',
                    'generation_timestamp' => now()->toIso8601String(),
                ]
            ];
        } catch (Exception $e) {
            Log::info('AI diverse idea generation failed; fallback used', ['error' => $e->getMessage()]);
            return $this->generateIdeaFallback();
        }
    }

    protected function generateIdeaFallback(): array
    {
        // Diverse project types across multiple industries (not just software)
        $projectTypes = [
            'Healthcare' => [
                'titles' => ['Medical Equipment Upgrade', 'Patient Care System Implementation', 'Healthcare Compliance Program', 'Medical Training Initiative'],
                'description' => 'Implement comprehensive healthcare improvements focusing on patient outcomes and regulatory compliance.',
                'deliverables' => ['Staff training modules', 'Equipment installation', 'Compliance documentation', 'Quality metrics dashboard', 'Patient feedback system', 'Safety protocols', 'Workflow optimization', 'Performance monitoring']
            ],
            'Education' => [
                'titles' => ['Curriculum Development Program', 'Learning Management System Rollout', 'Educational Technology Integration', 'Student Assessment Reform'],
                'description' => 'Develop and implement educational improvements to enhance learning outcomes and engagement.',
                'deliverables' => ['Curriculum design', 'Learning materials', 'Assessment tools', 'Teacher training', 'Student progress tracking', 'Technology setup', 'Parent engagement portal', 'Performance analytics']
            ],
            'Manufacturing' => [
                'titles' => ['Production Line Optimization', 'Quality Control System', 'Supply Chain Enhancement', 'Lean Manufacturing Initiative'],
                'description' => 'Optimize manufacturing processes to improve efficiency, quality, and cost-effectiveness.',
                'deliverables' => ['Process documentation', 'Equipment calibration', 'Quality standards', 'Worker training', 'Inventory management', 'Safety procedures', 'Performance dashboards', 'Cost analysis']
            ],
            'Marketing' => [
                'titles' => ['Brand Awareness Campaign', 'Customer Engagement Initiative', 'Market Research Project', 'Digital Marketing Transformation'],
                'description' => 'Execute comprehensive marketing strategy to increase brand visibility and customer acquisition.',
                'deliverables' => ['Market analysis', 'Brand guidelines', 'Campaign materials', 'Social media strategy', 'Customer surveys', 'Analytics setup', 'Content calendar', 'ROI tracking']
            ],
            'Operations' => [
                'titles' => ['Business Process Reengineering', 'Customer Service Enhancement', 'Operational Efficiency Program', 'Cost Reduction Initiative'],
                'description' => 'Streamline business operations to improve efficiency, reduce costs, and enhance customer satisfaction.',
                'deliverables' => ['Process mapping', 'Workflow optimization', 'Staff training', 'Performance metrics', 'Cost analysis', 'Customer feedback system', 'Documentation updates', 'Change management']
            ],
            'Construction' => [
                'titles' => ['Facility Renovation Project', 'Infrastructure Development', 'Safety Compliance Upgrade', 'Sustainable Building Initiative'],
                'description' => 'Manage construction and infrastructure projects ensuring safety, quality, and regulatory compliance.',
                'deliverables' => ['Project blueprints', 'Permit acquisition', 'Contractor coordination', 'Safety protocols', 'Quality inspections', 'Progress reporting', 'Budget tracking', 'Completion certification']
            ]
        ];

        $category = collect(array_keys($projectTypes))->random();
        $projectData = $projectTypes[$category];
        
        $title = collect($projectData['titles'])->random();
        $budget = rand(18000, 38000);
        
        $deliverables = collect($projectData['deliverables'])->random(rand(6, 10))->map(fn($d) => "• $d")->implode("\n");
        
        // Add some variety to the requirements format
        $requirements = "PROJECT DELIVERABLES:\n$deliverables\n\n";
        $requirements .= "KEY SUCCESS FACTORS:\n";
        $requirements .= "• Stakeholder engagement and communication\n";
        $requirements .= "• Budget adherence and cost control\n";
        $requirements .= "• Timeline management and milestone tracking\n";
        $requirements .= "• Quality assurance and testing\n";
        $requirements .= "• Risk mitigation and contingency planning";

        return [
            'title' => $title,
            'description' => $projectData['description'],
            'budget' => $budget,
            'requirements' => $requirements,
            'meta' => [
                'domain' => $category,
                'category' => $category,
                'complexity' => collect(['standard', 'challenging'])->random(),
                'generated_at' => now()->toIso8601String(),
                'uniqueness_seed' => uniqid(),
                'generated_method' => 'fallback_diverse'
            ]
        ];
    }

    /**
     * Evaluate how relevant existing tasks are vs requirements.
     * Optionally enhance by adding missing_high_impact tasks returned by AI.
     */
    public function evaluateRelevancy(VirtualProjectSimulation $simulation, bool $enhance = false): array
    {
        $tasks = $simulation->tasks()->get(['id','title','estimated_hours','priority','status','created_via']);
        if ($tasks->isEmpty()) {
            return [];
        }
        $requirements = (string) $simulation->requirements_document;

        try {
            $payload = $this->openAI->chatJson([
                ['role' => 'system','content' => 'You are an expert project analyst. Return STRICT JSON ONLY.'],
                ['role' => 'user','content' => $this->buildEvaluationPrompt($requirements, $tasks->toArray())]
            ], temperature: 0.15);
        } catch (Exception $e) {
            Log::warning('AI relevancy evaluation failed', ['error'=>$e->getMessage()]);
            return [];
        }

        // Expected shape: { tasks: [{id,relevance_pct,classification,comment}], coverage_summary:"", missing_tasks:[{title,reason,est_hours,priority}], overall:{ scope_alignment_pct:int, risk_flags:[...] } }
        $analysis = [
            'raw' => $payload,
            'at' => now()->toIso8601String(),
        ];

        $metrics = $simulation->metrics ?? [];
        $metrics['ai_relevancy'] = $analysis;
        $simulation->metrics = $metrics;
        $simulation->save();

        if ($enhance && isset($payload['missing_tasks']) && is_array($payload['missing_tasks'])) {
            foreach ($payload['missing_tasks'] as $mt) {
                if (!isset($mt['title'])) { continue; }
                SimulationTask::create([
                    'simulation_id' => $simulation->id,
                    'title' => Str::limit($mt['title'],255,'') ,
                    'estimated_hours' => (int) ($mt['est_hours'] ?? rand(4,10)),
                    'remaining_hours' => (int) ($mt['est_hours'] ?? rand(4,10)),
                    'priority' => in_array(($mt['priority'] ?? 'medium'), ['low','medium','high']) ? strtolower($mt['priority']) : 'medium',
                    'skill_tags' => ['general'],
                    'created_via' => 'ai_gap'
                ]);
            }
        }

        return $analysis;
    }

    protected function buildEvaluationPrompt(string $requirements, array $tasks): string
    {
        return <<<PROMPT
Evaluate the following simulation project.

REQUIREMENTS (multi-line):\n$requirements\n
TASKS JSON: \n"""\n".json_encode($tasks)."\n"""

Return JSON with keys:
{
  "tasks": [ {"id": <int>, "relevance_pct": <0-100>, "classification": "core|supporting|nice_to_have|out_of_scope", "comment": "short"} ],
  "coverage_summary": "one sentence",
  "missing_tasks": [ {"title":"", "reason":"", "est_hours":8, "priority":"high|medium|low"} ],
  "overall": { "scope_alignment_pct": <0-100>, "risk_flags": ["short text"], "redundant_task_ids": [<int>] }
}
NO commentary outside JSON.
PROMPT;
    }
}
