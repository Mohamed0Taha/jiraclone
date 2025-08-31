<?php
// Legacy SimulationActionController removed. Retained as no-op stub to avoid route binding failures if any.
namespace App\Http\Controllers; class SimulationActionController extends Controller {}
        $metrics['morale'] = max(0, ($metrics['morale'] ?? 70) - rand(3, 6));
        $metrics['slowdown_factor'] = max(0.7, ($metrics['slowdown_factor'] ?? 1.0) - 0.02); // slight speed up
        $sim->metrics = $metrics;
        $sim->save();
        $action = SimulationAction::create([
            'simulation_id' => $sim->id,
            'user_id' => Auth::id(),
            'type' => 'allocate_overtime',
            'payload' => ['hours' => $hours, 'cost' => $cost],
            'day_performed' => $sim->current_day,
        ]);

        return ['action' => $action, 'metrics' => $sim->metrics, 'budget_remaining' => $sim->budget_total - $sim->budget_used];
    }
}
