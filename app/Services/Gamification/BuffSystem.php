<?php

namespace App\Services\Gamification;

use App\Models\VirtualProjectSimulation;

/**
 * Applies temporary buffs & debuffs that influence simulation metrics & task progress.
 * Buffs stored in metrics['buffs'] as array of entries: [key,type,effect,data,expires_day,stacks]
 */
class BuffSystem
{
    public function addBuff(VirtualProjectSimulation $sim, string $key, array $data): void
    {
        $metrics = $sim->metrics ?? [];
        $list = $metrics['buffs'] ?? [];
        $existingIndex = null;
        foreach ($list as $i => $b) {
            if ($b['key'] === $key) { $existingIndex = $i; break; }
        }
        if ($existingIndex !== null && ($data['stackable'] ?? false)) {
            $list[$existingIndex]['stacks'] = min(($data['max_stacks'] ?? 3), ($list[$existingIndex]['stacks'] ?? 1) + 1);
            $list[$existingIndex]['expires_day'] = max($list[$existingIndex]['expires_day'], $data['expires_day']);
        } elseif ($existingIndex === null) {
            $list[] = [
                'key' => $key,
                'type' => $data['type'] ?? 'modifier',
                'effect' => $data['effect'] ?? 'unknown',
                'value' => $data['value'] ?? 0,
                'stacks' => $data['stacks'] ?? 1,
                'expires_day' => $data['expires_day'] ?? ($sim->current_day + 1),
                'label' => $data['label'] ?? ucfirst($key),
                'description' => $data['description'] ?? '',
            ];
        }
        $metrics['buffs'] = $list;
        $sim->metrics = $metrics;
        $sim->save();
    }

    public function cleanup(VirtualProjectSimulation $sim): void
    {
        $metrics = $sim->metrics ?? [];
        $list = $metrics['buffs'] ?? [];
        $list = array_values(array_filter($list, fn($b) => $b['expires_day'] > $sim->current_day));
        $metrics['buffs'] = $list;
        $sim->metrics = $metrics;
        $sim->save();
    }

    /**
     * Modify base hours for task completion given active buffs/debuffs.
     */
    public function modifyTaskThroughput(VirtualProjectSimulation $sim, int $base): int
    {
        $metrics = $sim->metrics ?? [];
        $list = $metrics['buffs'] ?? [];
        $multiplier = 1.0;
        foreach ($list as $b) {
            if ($b['effect'] === 'throughput') {
                $multiplier += ($b['value'] * ($b['stacks'] ?? 1));
            }
            if ($b['effect'] === 'slowdown') {
                $multiplier -= ($b['value'] * ($b['stacks'] ?? 1));
            }
        }
        return max(1, (int) round($base * $multiplier));
    }
}
