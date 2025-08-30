<?php

namespace App\Support;

use App\Models\SimulationTeamMember;
use App\Models\VirtualProjectSimulation;
use App\Services\OpenAIService;
use Illuminate\Support\Facades\Log;

class TeamGenerator
{
    public function __construct(protected ?OpenAIService $openAI = null)
    {
        $this->openAI = $openAI ?: app(OpenAIService::class);
    }

    public function generate(VirtualProjectSimulation $simulation, int $count = 5): void
    {
        // Try AI-generated team first, fallback to predefined roles
        if ($this->generateAITeam($simulation, $count)) {
            return;
        }
        
        // Fallback to existing logic
        $this->generateFallbackTeam($simulation, $count);
    }

    protected function generateAITeam(VirtualProjectSimulation $simulation, int $count): bool
    {
        try {
            $domain = $simulation->meta['domain'] ?? 'General Project';
            $projectType = $simulation->meta['project_type'] ?? $simulation->meta['category'] ?? 'General';
            $description = $simulation->description;
            
            $teamData = $this->openAI->chatJson([
                ['role' => 'system', 'content' => 'Generate realistic project team members for diverse industries. Return ONLY JSON.'],
                ['role' => 'user', 'content' => "Generate $count team members for a '$domain' project: '$description'. For each member provide: name (realistic full name), role (job title appropriate for this industry), skills (3-5 relevant skills array), seniority (junior|mid|senior), daily_rate (150-400 based on role/seniority). Ensure roles are appropriate for the project type, not just software developers. JSON format: {\"team\": [{\"name\": \"\", \"role\": \"\", \"skills\": [], \"seniority\": \"\", \"daily_rate\": 0}]}"]
            ]);

            if (!isset($teamData['team']) || !is_array($teamData['team'])) {
                return false;
            }

            foreach ($teamData['team'] as $member) {
                if (!isset($member['name'], $member['role'], $member['skills'])) {
                    continue;
                }

                $dailyRate = (int) ($member['daily_rate'] ?? rand(200, 350));
                $capacity = rand(6, 8); // Hours per day
                
                SimulationTeamMember::create([
                    'simulation_id' => $simulation->id,
                    'name' => $member['name'],
                    'role' => $member['role'],
                    'skills' => is_array($member['skills']) ? $member['skills'] : ['general'],
                    'capacity_hours_per_day' => $capacity,
                    'remaining_hours_today' => $capacity,
                    'daily_cost' => $dailyRate,
                    'availability_status' => 'available',
                ]);
            }

            return true;
        } catch (\Exception $e) {
            Log::warning('AI team generation failed, using fallback', ['error' => $e->getMessage()]);
            return false;
        }
    }

    protected function generateFallbackTeam(VirtualProjectSimulation $simulation, int $count): void
    {
        $domain = $simulation->meta['domain'] ?? $simulation->meta['category'] ?? 'General';
        
        $rolesByDomain = [
            'Healthcare' => [
                ['Project Manager', ['healthcare', 'compliance', 'stakeholder_management'], 'pm'],
                ['Clinical Coordinator', ['patient_care', 'medical_protocols', 'training'], 'clinical'],
                ['Compliance Specialist', ['regulations', 'documentation', 'audit'], 'compliance'],
                ['Training Coordinator', ['education', 'curriculum', 'assessment'], 'training'],
                ['Quality Assurance Lead', ['quality_control', 'process_improvement', 'metrics'], 'qa'],
            ],
            'Education' => [
                ['Project Manager', ['education', 'curriculum', 'stakeholder_management'], 'pm'],
                ['Instructional Designer', ['curriculum', 'learning_design', 'assessment'], 'design'],
                ['Education Specialist', ['teaching', 'student_engagement', 'assessment'], 'education'],
                ['Technology Coordinator', ['ed_tech', 'systems', 'training'], 'tech'],
                ['Content Developer', ['content_creation', 'multimedia', 'writing'], 'content'],
            ],
            'Manufacturing' => [
                ['Project Manager', ['manufacturing', 'process_improvement', 'quality'], 'pm'],
                ['Process Engineer', ['lean_manufacturing', 'process_optimization', 'automation'], 'engineering'],
                ['Quality Control Specialist', ['quality_assurance', 'testing', 'standards'], 'qa'],
                ['Production Coordinator', ['scheduling', 'logistics', 'coordination'], 'production'],
                ['Safety Specialist', ['workplace_safety', 'compliance', 'training'], 'safety'],
            ],
            'Marketing' => [
                ['Project Manager', ['marketing', 'campaigns', 'analytics'], 'pm'],
                ['Marketing Strategist', ['strategy', 'market_research', 'positioning'], 'strategy'],
                ['Content Creator', ['copywriting', 'design', 'social_media'], 'content'],
                ['Digital Marketing Specialist', ['SEO', 'analytics', 'advertising'], 'digital'],
                ['Brand Coordinator', ['brand_management', 'design', 'consistency'], 'brand'],
            ],
            'Operations' => [
                ['Project Manager', ['operations', 'process_improvement', 'efficiency'], 'pm'],
                ['Business Analyst', ['analysis', 'requirements', 'documentation'], 'analysis'],
                ['Process Improvement Specialist', ['lean', 'six_sigma', 'optimization'], 'improvement'],
                ['Change Management Lead', ['change_management', 'communication', 'training'], 'change'],
                ['Operations Coordinator', ['coordination', 'logistics', 'scheduling'], 'ops'],
            ],
            'Construction' => [
                ['Project Manager', ['construction', 'scheduling', 'safety'], 'pm'],
                ['Site Supervisor', ['supervision', 'safety', 'quality_control'], 'supervisor'],
                ['Safety Coordinator', ['safety_regulations', 'training', 'compliance'], 'safety'],
                ['Quality Inspector', ['inspection', 'standards', 'documentation'], 'qa'],
                ['Logistics Coordinator', ['materials', 'scheduling', 'vendors'], 'logistics'],
            ],
        ];

        $roles = $rolesByDomain[$domain] ?? [
            ['Project Manager', ['general', 'coordination', 'communication'], 'pm'],
            ['Senior Specialist', ['domain_expertise', 'analysis', 'implementation'], 'senior'],
            ['Coordinator', ['coordination', 'logistics', 'communication'], 'coordinator'],
            ['Analyst', ['analysis', 'documentation', 'reporting'], 'analyst'],
            ['Support Specialist', ['support', 'assistance', 'coordination'], 'support'],
        ];

        $names = [
            'Aria Chen', 'Marcus Johnson', 'Priya Patel', 'Diego Martinez', 'Sarah Kim',
            'James Wilson', 'Maya Singh', 'Alex Thompson', 'Sofia Rodriguez', 'Ryan O\'Connor',
            'Zara Ahmed', 'Ethan Davis', 'Nia Williams', 'Lucas Brown', 'Amara Johnson',
            'Jordan Lee', 'Kaia Garcia', 'Nolan Smith', 'Tara Jones', 'Casey Miller'
        ];

        shuffle($roles);
        $selectedRoles = array_slice($roles, 0, $count);

        foreach ($selectedRoles as [$role, $skills, $tag]) {
            $name = $names[array_rand($names)];
            $capacity = rand(6, 8);
            $dailyCost = rand(250, 400);

            SimulationTeamMember::create([
                'simulation_id' => $simulation->id,
                'name' => $name,
                'role' => $role,
                'skills' => $skills,
                'capacity_hours_per_day' => $capacity,
                'remaining_hours_today' => $capacity,
                'daily_cost' => $dailyCost,
                'availability_status' => 'available',
            ]);
        }
    }
}
