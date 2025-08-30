<?php

namespace App\Services\Gamification;

/**
 * Describes unlockable perks at given levels for UI display & buff application.
 */
class ProgressionTree
{
    public static function perks(): array
    {
        return [
            2 => [
                ['key'=>'minor_throughput','label'=>'+5% Throughput','effect'=>['buff'=>'throughput','value'=>0.05,'duration_days'=>2]],
            ],
            3 => [
                ['key'=>'morale_buffer','label'=>'+5 Morale Cap','effect'=>['morale_cap'=>5]],
            ],
            4 => [
                ['key'=>'risk_scan','label'=>'Reveal Risk Card Early','effect'=>['risk_preview'=>1]],
            ],
            5 => [
                ['key'=>'focus_push','label'=>'+10% Throughput Today','effect'=>['buff'=>'throughput','value'=>0.10,'duration_days'=>1]],
            ],
        ];
    }
}
