<?php

namespace App\Services\Gamification;

use App\Models\VirtualProjectSimulation;
use App\Models\SimulationAction;
use App\Services\Gamification\{AchievementCatalog,BuffSystem,RiskDeck,ProgressionTree};
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;

/**
 * Orchestrates awarding achievements, quest progress, and applying perks/buffs.
 */
class GamificationEngine
{
    public function __construct(
        protected BuffSystem $buffs,
        protected RiskDeck $riskDeck,
    ){}

    public function recordAction(VirtualProjectSimulation $sim, SimulationAction $action): void
    {
        $this->updateActionCounters($sim, $action);
        $this->evaluateAchievements($sim);
        $this->updateQuests($sim);
    }

    protected function metrics(VirtualProjectSimulation $sim): array { return $sim->metrics ?? []; }

    protected function saveMetrics(VirtualProjectSimulation $sim,array $metrics): void
    {
        $sim->metrics = $metrics; $sim->save();
    }

    protected function updateActionCounters(VirtualProjectSimulation $sim, SimulationAction $action): void
    {
        $m = $this->metrics($sim);
        $m['action_counts'] = $m['action_counts'] ?? [];
        $m['action_counts'][$action->type] = ($m['action_counts'][$action->type] ?? 0) + 1;
        // combo window tracking
        $now = now();
        $window = $m['combo_window'] ?? [];
        $window[] = ['t'=>$now->timestamp,'type'=>$action->type];
        $window = array_values(array_filter($window, fn($e)=> $now->timestamp - $e['t'] <= 15*60));
        $m['combo_window'] = $window;
        $this->saveMetrics($sim,$m);
    }

    public function dailyCycle(VirtualProjectSimulation $sim): void
    {
        $m = $this->metrics($sim);
        // Possibly draw a risk card
        if (rand(1,100) <= 35) {
            $drawn = $this->riskDeck->draw($sim);
            if ($drawn) {
                $m = $this->metrics($sim); // refreshed
                $m['notifications'][] = ['type'=>'risk_draw','card'=>$drawn,'day'=>$sim->current_day];
                $this->saveMetrics($sim,$m);
            }
        }
        // Process expired risk cards
        $triggered = $this->riskDeck->processTriggers($sim);
        if ($triggered) {
            $m = $this->metrics($sim);
            $m['notifications'][] = ['type'=>'risk_trigger','cards'=>$triggered,'day'=>$sim->current_day];
            $this->saveMetrics($sim,$m);
        }
        // Cleanup buffs
        $this->buffs->cleanup($sim);
        $this->evaluateAchievements($sim);
        $this->updateQuests($sim);
    }

    public function evaluateAchievements(VirtualProjectSimulation $sim): void
    {
        $m = $this->metrics($sim);
        $achieved = $m['achievements'] ?? [];
        $actions = $m['action_counts'] ?? [];
        $defs = AchievementCatalog::achievements();
        foreach ($defs as $key=>$def) {
            if (isset($achieved[$key])) continue; // already earned
            if ($this->checkCondition($sim,$def['condition'] ?? [], $actions)) {
                $achieved[$key] = [
                    'earned_at' => now()->toIso8601String(),
                    'points' => $def['points'],
                ];
                $m['xp'] = ($m['xp'] ?? 0) + $def['points'];
                $m['achievement_feed'][] = ['key'=>$key,'ts'=>now()->toIso8601String()];
            }
        }
        $m['achievements'] = $achieved;
        $sim->metrics = $m; $sim->save();
    }

    protected function checkCondition(VirtualProjectSimulation $sim, array $cond, array $actions): bool
    {
        $m = $this->metrics($sim);
        return match($cond['type'] ?? 'none') {
            'action_count' => ($actions[$cond['action']] ?? 0) >= ($cond['count'] ?? PHP_INT_MAX),
            'level_reached' => ($m['level'] ?? 1) >= ($cond['level'] ?? 99),
            'ai_alignment' => (($m['ai_relevancy']['raw']['overall']['scope_alignment_pct'] ?? 0) >= ($cond['gte'] ?? 999)),
            'final_metric' => $this->finalMetricCompare($sim,$cond),
            'metric_min_threshold' => $this->metricMinThreshold($sim,$cond),
            'combo_actions' => $this->comboWindowCount($m) >= ($cond['count'] ?? 999),
            'risk_neutralized' => (($m['risk_stats']['neutralized'] ?? 0) >= ($cond['count'] ?? 999)),
            'perfect_capacity_day' => ($m['last_day_capacity_perfect'] ?? false) === true,
            'sickness_response_fast' => false, // placeholder - would need timestamps of sickness events & responses
            default => false
        };
    }

    protected function finalMetricCompare(VirtualProjectSimulation $sim,array $cond): bool
    {
        $m = $this->metrics($sim);
        $path = $cond['path'] ?? '';
        $value = Arr::get($m,$path);
        if (!is_numeric($value)) return false;
        if (isset($cond['gte']) && $value < $cond['gte']) return false;
        if (isset($cond['lte']) && $value > $cond['lte']) return false;
        return true;
    }

    protected function metricMinThreshold(VirtualProjectSimulation $sim,array $cond): bool
    {
        $m = $this->metrics($sim);
        $history = $m['morale_history'] ?? [];
        if (($cond['metric'] ?? '') === 'morale') {
            foreach ($history as $entry) { if (($entry['v'] ?? 0) < ($cond['min'] ?? 0)) return false; }
            return !empty($history);
        }
        return false;
    }

    protected function comboWindowCount(array $m): int
    {
        $w = $m['combo_window'] ?? [];
        return count(array_filter($w, fn($e)=> in_array($e['type'], ['schedule_workshop','allocate_overtime','ack_budget_cut'])));
    }

    public function updateQuests(VirtualProjectSimulation $sim): void
    {
        $m = $this->metrics($sim);
        $quests = $m['quests'] ?? $this->bootstrapQuests();
        $actions = $m['action_counts'] ?? [];
        $changed = false;
        foreach ($quests as $key=>&$q) {
            foreach ($q['steps'] as $i=>&$step) {
                if (($step['done'] ?? false) === true) continue;
                if ($this->questStepSatisfied($sim,$step,$actions,$m)) {
                    $step['done'] = true; $changed = true;
                }
            }
            if (($q['completed'] ?? false)===false && $this->questCompleted($q)) {
                $q['completed'] = true; $changed = true;
                $m['xp'] = ($m['xp'] ?? 0) + ($q['reward_xp'] ?? 0);
                $m['achievement_feed'][] = ['quest'=>$key,'ts'=>now()->toIso8601String()];
            }
        }
        if ($changed) { $m['quests'] = $quests; $sim->metrics = $m; $sim->save(); }
    }

    protected function bootstrapQuests(): array
    {
        $defs = \App\Services\Gamification\AchievementCatalog::quests();
        $quests = [];
        foreach ($defs as $k=>$def) {
            $quests[$k] = $def; // copy
            foreach ($quests[$k]['steps'] as &$s) { $s['done'] = false; }
            $quests[$k]['completed'] = false;
        }
        return $quests;
    }

    protected function questStepSatisfied(VirtualProjectSimulation $sim,array $step,array $actions,array $metrics): bool
    {
        return match($step['do'] ?? '') {
            'assign_task' => ($actions['assign_task'] ?? 0) >= ($step['count'] ?? 999),
            'respond_event' => ($actions['respond_event'] ?? 0) >= ($step['count'] ?? 999),
            'reach_level' => ($metrics['level'] ?? 1) >= ($step['level'] ?? 99),
            'neutralize_risk' => (($metrics['risk_stats']['neutralized'] ?? 0) >= ($step['count'] ?? 999)),
            'reach_alignment' => (($metrics['ai_relevancy']['raw']['overall']['scope_alignment_pct'] ?? 0) >= ($step['pct'] ?? 999)),
            default => false
        };
    }

    protected function questCompleted(array $quest): bool
    {
        foreach ($quest['steps'] as $s) { if (empty($s['done'])) return false; }
        return true;
    }
}
