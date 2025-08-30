<?php

namespace App\Http\Controllers;

use App\Models\VirtualProjectSimulation;
use App\Models\SimulationAction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\SimulationEngine;

class SimulationActionController extends Controller
{
    public function __construct(protected SimulationEngine $engine) {}

    protected function findUserSimulationOrFail(): VirtualProjectSimulation
    {
        $sim = VirtualProjectSimulation::where('user_id', Auth::id())->latest()->first();
        abort_unless($sim, 404, 'Simulation not found');
        return $sim;
    }

    public function index()
    {
        $sim = $this->findUserSimulationOrFail();
        return [
            'actions' => $sim->actions()->latest()->limit(50)->get(),
            'events' => $sim->events()->latest()->limit(50)->get(),
            'metrics' => $sim->metrics,
        ];
    }

    public function contactSick(Request $request)
    {
        $sim = $this->findUserSimulationOrFail();
        $member = $request->string('member');
        $impact = rand(0,1) ? 'improved' : 'unchanged';
        $metrics = $sim->metrics;
        if ($impact === 'improved') {
            $metrics['morale'] = min(100, ($metrics['morale'] ?? 70) + rand(2,5));
            $sim->metrics = $metrics; $sim->save();
        }
        $action = SimulationAction::create([
            'simulation_id' => $sim->id,
            'user_id' => Auth::id(),
            'type' => 'contact_sick_member',
            'payload' => [ 'member' => $member, 'result' => $impact ],
            'day_performed' => $sim->current_day,
        ]);
        return ['action' => $action, 'metrics' => $sim->metrics];
    }

    public function acknowledgeBudgetCut(Request $request)
    {
        $sim = $this->findUserSimulationOrFail();
        $percent = (int) $request->input('percent', 5);
        $metrics = $sim->metrics;
        // strategic response: adjust scope -> reduce baseline remaining hours by percent
        // Pending tasks: any not explicitly marked done
        $tasks = $sim->tasks()->where(function($q){
            $q->whereNull('status')->orWhere('status','!=','done');
        })->get();
        foreach ($tasks as $task) {
            $task->estimated_hours = max(1, (int) round($task->estimated_hours * (1 - $percent/100)));
            if ($task->remaining_hours > $task->estimated_hours) {
                $task->remaining_hours = $task->estimated_hours;
            }
            $task->save();
        }
        $action = SimulationAction::create([
            'simulation_id' => $sim->id,
            'user_id' => Auth::id(),
            'type' => 'ack_budget_cut',
            'payload' => ['percent'=>$percent,'tasks_adjusted'=>$tasks->count()],
            'day_performed' => $sim->current_day,
        ]);
        return ['action'=>$action];
    }

    public function scheduleWorkshop(Request $request)
    {
        $sim = $this->findUserSimulationOrFail();
        $cost = 300 + rand(0,200);
    // Spend from remaining budget by increasing budget_used
    $remaining = $sim->budget_total - $sim->budget_used;
    if ($cost > $remaining) { $cost = $remaining; }
    $sim->budget_used = min($sim->budget_total, $sim->budget_used + $cost);
        $metrics = $sim->metrics;
        $metrics['morale'] = min(100, ($metrics['morale'] ?? 70) + rand(5,10));
        $metrics['slowdown_factor'] = max(0.8, ($metrics['slowdown_factor'] ?? 1.0) - 0.05); // slight speed up
        $sim->metrics = $metrics; $sim->save();
        $action = SimulationAction::create([
            'simulation_id' => $sim->id,
            'user_id' => Auth::id(),
            'type' => 'schedule_workshop',
            'payload' => ['cost'=>$cost],
            'day_performed' => $sim->current_day,
        ]);
    return ['action'=>$action,'metrics'=>$sim->metrics,'budget_remaining'=>$sim->budget_total - $sim->budget_used];
    }

    public function allocateOvertime(Request $request)
    {
        $sim = $this->findUserSimulationOrFail();
        $hours = (int) $request->input('hours', 8);
        $cost = $hours * 60; // overtime cost
    $remaining = $sim->budget_total - $sim->budget_used;
    if ($cost > $remaining) { $cost = $remaining; }
    $sim->budget_used = min($sim->budget_total, $sim->budget_used + $cost);
        $metrics = $sim->metrics;
        $metrics['morale'] = max(0, ($metrics['morale'] ?? 70) - rand(3,6));
        $metrics['slowdown_factor'] = max(0.7, ($metrics['slowdown_factor'] ?? 1.0) - 0.02); // slight speed up
        $sim->metrics = $metrics; $sim->save();
        $action = SimulationAction::create([
            'simulation_id' => $sim->id,
            'user_id' => Auth::id(),
            'type' => 'allocate_overtime',
            'payload' => ['hours'=>$hours,'cost'=>$cost],
            'day_performed' => $sim->current_day,
        ]);
    return ['action'=>$action,'metrics'=>$sim->metrics,'budget_remaining'=>$sim->budget_total - $sim->budget_used];
    }
}
