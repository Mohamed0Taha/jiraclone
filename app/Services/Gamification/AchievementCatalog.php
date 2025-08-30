<?php

namespace App\Services\Gamification;

/**
 * Central static catalog describing all achievements, tiers, quests, and hidden feats.
 * Achievements are purely data-driven so frontend can render dynamically.
 */
class AchievementCatalog
{
    /**
     * Return associative array keyed by achievement key.
     * Each item: [title, description, tiers? , points, secret, category, condition(meta)]
     */
    public static function achievements(): array
    {
        return [
            'first_assign' => [
                'title' => 'First Delegation',
                'description' => 'Assign your first task to a team member.',
                'points' => 25,
                'secret' => false,
                'category' => 'onboarding',
                'condition' => ['type' => 'action_count','action' => 'assign_task','count' => 1]
            ],
            'five_assign' => [
                'title' => 'Delegation Cadence',
                'description' => 'Assign 5 tasks.',
                'points' => 40,
                'secret' => false,
                'category' => 'progression',
                'condition' => ['type' => 'action_count','action' => 'assign_task','count' => 5]
            ],
            'budget_guardian' => [
                'title' => 'Budget Guardian',
                'description' => 'Finish with 30%+ of original budget unspent.',
                'points' => 120,
                'secret' => false,
                'category' => 'efficiency',
                'condition' => ['type' => 'final_metric','path' => 'evaluation.raw.budget_remaining_ratio','gte' => 0.30]
            ],
            'scope_tamer' => [
                'title' => 'Scope Tamer',
                'description' => 'Keep scope growth under 5%.',
                'points' => 140,
                'secret' => false,
                'category' => 'efficiency',
                'condition' => ['type' => 'final_metric','path' => 'evaluation.raw.scope_growth_pct','lte' => 5]
            ],
            'all_tasks_done' => [
                'title' => 'Zero Backlog',
                'description' => 'Complete 100% of baseline hours (timebox).',
                'points' => 200,
                'secret' => false,
                'category' => 'mastery',
                'condition' => ['type' => 'final_metric','path' => 'evaluation.progress_pct','gte' => 100]
            ],
            'morale_keeper' => [
                'title' => 'Morale Keeper',
                'description' => 'Never let morale drop below 70.',
                'points' => 110,
                'secret' => false,
                'category' => 'wellbeing',
                'condition' => ['type' => 'metric_min_threshold','metric' => 'morale','min' => 70]
            ],
            'event_responder' => [
                'title' => 'Crisis Responder',
                'description' => 'Respond to 5 events in one simulation.',
                'points' => 90,
                'secret' => false,
                'category' => 'responsiveness',
                'condition' => ['type' => 'action_count','action' => 'respond_event','count' => 5]
            ],
            'sickness_support' => [
                'title' => 'Empathetic Lead',
                'description' => 'Check in on a sick team member immediately (same day).',
                'points' => 60,
                'secret' => true,
                'category' => 'wellbeing',
                'condition' => ['type' => 'sickness_response_fast','minutes' => 10]
            ],
            'level_5' => [
                'title' => 'Level 5 Unlocked',
                'description' => 'Reach level 5 in one simulation.',
                'points' => 150,
                'secret' => false,
                'category' => 'progression',
                'condition' => ['type' => 'level_reached','level' => 5]
            ],
            'risk_mitigator' => [
                'title' => 'Risk Mitigator',
                'description' => 'Neutralize 3 risk cards before they trigger.',
                'points' => 130,
                'secret' => false,
                'category' => 'risk',
                'condition' => ['type' => 'risk_neutralized','count' => 3]
            ],
            'combo_planner' => [
                'title' => 'Combo Planner',
                'description' => 'Chain 3 strategic actions in one cycle.',
                'points' => 160,
                'secret' => true,
                'category' => 'strategy',
                'condition' => ['type' => 'combo_actions','window_minutes' => 15,'count' => 3]
            ],
            'lean_allocator' => [
                'title' => 'Lean Allocator',
                'description' => 'Assign tasks spending less than 60% of budget used.',
                'points' => 100,
                'secret' => false,
                'category' => 'efficiency',
                'condition' => ['type' => 'final_metric','path' => 'evaluation.raw.budget_used_ratio','lte' => 0.60]
            ],
            'perfect_day' => [
                'title' => 'Perfect Day',
                'description' => 'Advance a day with 0 idle capacity (members fully utilized).',
                'points' => 75,
                'secret' => true,
                'category' => 'optimization',
                'condition' => ['type' => 'perfect_capacity_day']
            ],
            'ai_alignment' => [
                'title' => 'AI Aligned',
                'description' => 'Achieve AI scope alignment >= 85%.',
                'points' => 170,
                'secret' => false,
                'category' => 'ai',
                'condition' => ['type' => 'ai_alignment','gte' => 85]
            ],
        ];
    }

    /**
     * Quests are time-bound chains awarding bonus XP.
     */
    public static function quests(): array
    {
        return [
            'starter_path' => [
                'title' => 'Starter Path',
                'steps' => [
                    ['do' => 'assign_task','count' => 1,'label' => 'Assign any task'],
                    ['do' => 'respond_event','count' => 1,'label' => 'Respond to one event'],
                    ['do' => 'reach_level','level' => 2,'label' => 'Reach Level 2']
                ],
                'reward_xp' => 80
            ],
            'risk_route' => [
                'title' => 'Risk Route',
                'steps' => [
                    ['do' => 'neutralize_risk','count' => 1,'label' => 'Neutralize a risk card'],
                    ['do' => 'neutralize_risk','count' => 3,'label' => 'Neutralize 3 total risks'],
                    ['do' => 'reach_alignment','pct' => 70,'label' => 'Reach 70% AI scope alignment']
                ],
                'reward_xp' => 120
            ],
        ];
    }
}
