<?php

namespace App\Services\Gamification;

use App\Models\VirtualProjectSimulation;
use Illuminate\Support\Str;

/**
 * RiskDeck: pseudo card system injecting optional mitigations before turning into real events.
 * Cards live in metrics['risk_deck']['active'] with states: pending -> mitigated|triggered.
 */
class RiskDeck
{
    protected array $catalog = [
        'vendor_cert_delay' => [
            'title' => 'Vendor Certification Delay',
            'description' => 'External vendor requires additional compliance checks.',
            'mitigation' => 'Allocate a compliance review task early.',
            'onTrigger' => ['create_event' => 'vendor_delay']
        ],
        'compliance_audit' => [
            'title' => 'Surprise Compliance Audit',
            'description' => 'Regulatory body schedules short-notice audit.',
            'mitigation' => 'Prepare documentation pack.',
            'onTrigger' => ['morale' => -5]
        ],
        'infra_cost_spike' => [
            'title' => 'Infrastructure Cost Spike',
            'description' => 'Cloud usage surges unexpectedly due to load tests.',
            'mitigation' => 'Optimize resource usage and caching.',
            'onTrigger' => ['budget_cut_flat' => 1200]
        ],
        'key_person_risk' => [
            'title' => 'Key Person Dependency',
            'description' => 'A single engineer holds critical deployment knowledge.',
            'mitigation' => 'Schedule knowledge sharing session.',
            'onTrigger' => ['slowdown_factor' => 0.1]
        ],
    ];

    public function draw(VirtualProjectSimulation $sim): ?array
    {
        $metrics = $sim->metrics ?? [];
        $deck = $metrics['risk_deck'] ?? ['active' => [],'history' => []];
        if (count($deck['active']) >= 3) { return null; }
        $key = array_rand($this->catalog);
        $card = $this->catalog[$key];
        $card['key'] = $key;
        $card['id'] = Str::uuid()->toString();
        $card['day_drawn'] = $sim->current_day;
        $card['state'] = 'pending';
        $card['deadline_day'] = $sim->current_day + rand(1,2); // must mitigate soon
        $deck['active'][] = $card;
        $metrics['risk_deck'] = $deck;
        $sim->metrics = $metrics; $sim->save();
        return $card;
    }

    public function mitigate(VirtualProjectSimulation $sim,string $cardId): bool
    {
        $metrics = $sim->metrics ?? [];
        $deck = $metrics['risk_deck'] ?? ['active'=>[],'history'=>[]];
        foreach ($deck['active'] as &$c) {
            if ($c['id'] === $cardId && $c['state']==='pending') {
                $c['state'] = 'mitigated';
                $deck['history'][] = $c;
                $deck['active'] = array_values(array_filter($deck['active'], fn($x)=>$x['id']!==$cardId));
                $metrics['risk_deck'] = $deck; $sim->metrics = $metrics; $sim->save();
                return true;
            }
        }
        return false;
    }

    public function processTriggers(VirtualProjectSimulation $sim): array
    {
        $metrics = $sim->metrics ?? [];
        $deck = $metrics['risk_deck'] ?? ['active'=>[],'history'=>[]];
        $triggered = [];
        $remaining = [];
        foreach ($deck['active'] as $c) {
            if ($c['state']==='pending' && $sim->current_day > $c['deadline_day']) {
                $c['state'] = 'triggered';
                $deck['history'][] = $c;
                $triggered[] = $c;
            } else {
                $remaining[] = $c;
            }
        }
        $deck['active'] = $remaining;
        $metrics['risk_deck'] = $deck;
        $sim->metrics = $metrics; $sim->save();
        return $triggered;
    }
}
