<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\SimpleSimulationGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SimulatorController extends Controller
{
    public function __construct(protected SimpleSimulationGenerator $simulationGenerator)
    {
    }

    public function evaluateAction(Request $request)
    {
        try {
            $request->validate([
                'event' => 'required|array',
                'action' => 'required|array',
                'game_state' => 'required|array',
            ]);
            
            // Evaluate action using existing service
            $result = $this->simulationGenerator->evaluateSimulationAction(
                $request->event,
                $request->action,
                $request->game_state
            );
            
            Log::info('Simulator action evaluated', [
                'event_id' => $request->event['id'] ?? null,
                'action' => $request->action,
                'score' => $result['score'] ?? 0,
            ]);
            
            return response()->json([
                'success' => true,
                'result' => $result,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Simulator action evaluation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to evaluate action. Please try again.',
            ], 500);
        }
    }

    public function evaluateTaskAction(Request $request)
    {
        try {
            $request->validate([
                'task_id' => 'required',
                'action' => 'required|string',
                'game_state' => 'required|array',
            ]);
            
            // For task actions, we'll create a simple evaluation
            // This matches the existing simulator behavior
            $result = [
                'success' => true,
                'message' => 'Task action processed successfully.',
                'effects' => [
                    'task_updates' => [],
                    'team_updates' => [],
                    'metrics_change' => [],
                ],
            ];
            
            Log::info('Simulator task action evaluated', [
                'task_id' => $request->task_id,
                'action' => $request->action,
            ]);
            
            return response()->json([
                'success' => true,
                'result' => $result,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Simulator task action evaluation failed', [
                'error' => $e->getMessage(),
                'task_id' => $request->task_id ?? 'unknown',
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to evaluate task action. Please try again.',
            ], 500);
        }
    }

    public function getAnalytics(Request $request)
    {
        return response()->json(['success' => true]);
    }
}
