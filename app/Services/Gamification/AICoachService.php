<?php

namespace App\Services\Gamification;

use App\Models\VirtualProjectSimulation;
use App\Services\OpenAIService;
use Illuminate\Support\Facades\Log;

/**
 * AICoachService: Generates short actionable coaching tips based on current simulation state.
 */
class AICoachService
{
    public function __construct(protected OpenAIService $openAI) {}

    public function generateTips(VirtualProjectSimulation $sim): array
    {
        $metrics = $sim->metrics ?? [];
        $snapshot = [
            'day' => $sim->current_day,
            'budget_total' => $sim->budget_total,
            'budget_used' => $sim->budget_used,
            'morale' => $metrics['morale'] ?? 0,
            'tasks' => $sim->tasks()->select('status','estimated_hours','remaining_hours','priority')->limit(60)->get()->toArray(),
            'events_count' => $sim->events()->count(),
            'level' => $metrics['level'] ?? 1,
            'ai_alignment' => $metrics['ai_relevancy']['raw']['overall']['scope_alignment_pct'] ?? null,
        ];
        try {
            $res = $this->openAI->chatJson([
                ['role'=>'system','content'=>'You are an elite agile program coach. Return STRICT JSON with key "tips" as array of concise imperatives (<=120 chars each). Focus on  tactical, data-driven suggestions.'],
                ['role'=>'user','content'=>json_encode($snapshot)]
            ], 0.4);
            if (!is_array($res) || !isset($res['tips'])) return [];
            return array_slice(array_filter($res['tips'], fn($t)=>is_string($t) && strlen($t)<=140),0,5);
        } catch (\Throwable $e) {
            Log::debug('AI coach fallback', ['err'=>$e->getMessage()]);
            return $this->fallback($snapshot);
        }
    }

    protected function fallback(array $snap): array
    {
        $out = [];
        if (($snap['morale'] ?? 0) < 70) { $out[] = 'Run a morale workshop or 1:1s; morale trending low.'; }
        $util = ($snap['budget_used'] ?? 0) / max(1,$snap['budget_total']);
        if ($util > 0.8) { $out[] = 'Budget nearly exhausted; trim scope or secure funds.'; }
        if (($snap['ai_alignment'] ?? 0) && $snap['ai_alignment'] < 60) { $out[] = 'Low alignment; prioritize tasks matching core requirements.'; }
        if (empty($out)) { $out[] = 'Maintain cadence; monitor risks & capacity tomorrow.'; }
        return $out;
    }
}
