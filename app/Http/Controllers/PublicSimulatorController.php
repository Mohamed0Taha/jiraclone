<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\SimpleSimulationGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PublicSimulatorController extends Controller
{
    public function __construct(protected SimpleSimulationGenerator $simulationGenerator) {}

    public function index()
    {
        \Log::info('PublicSimulatorController@index accessed', [
            'user_authenticated' => auth()->check(),
            'user_id' => auth()->id(),
            'url' => request()->fullUrl(),
        ]);

        return Inertia::render('PublicSimulator/Index', [
            'title' => 'Project Management Simulator - Practice for Free',
            'description' => 'Practice project management skills with realistic scenarios. No signup required.',
        ]);
    }

    public function generate(Request $request)
    {
        try {
            // Create a mock user for simulation generation (simulation service expects a User model)
            $mockUser = new User([
                'name' => 'Practice User',
                'email' => 'practice@simulator.local',
            ]);

            // Generate simulation using existing service
            $simulation = $this->simulationGenerator->generate($mockUser);

            // Add session tracking for this simulation session
            $sessionId = uniqid('sim_', true);
            $request->session()->put("simulation_session_{$sessionId}", [
                'simulation' => $simulation,
                'created_at' => now()->toISOString(),
                'actions_taken' => [],
            ]);

            return response()->json([
                'success' => true,
                'simulation' => $simulation,
                'session_id' => $sessionId,
            ]);

        } catch (\Exception $e) {
            Log::error('Public simulator generation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to generate simulation. Please try again.',
            ], 500);
        }
    }

    public function evaluateAction(Request $request)
    {
        try {
            $request->validate([
                'session_id' => 'required|string',
                'event' => 'required|array',
                'action' => 'required|array',
                'game_state' => 'required|array',
            ]);

            $sessionKey = "simulation_session_{$request->session_id}";
            $sessionData = $request->session()->get($sessionKey);

            if (! $sessionData) {
                return response()->json([
                    'success' => false,
                    'error' => 'Simulation session not found. Please start a new simulation.',
                ], 404);
            }

            // Evaluate action using existing service
            $result = $this->simulationGenerator->evaluateSimulationAction(
                $request->event,
                $request->action,
                $request->game_state
            );

            // Update session with action taken
            $sessionData['actions_taken'][] = [
                'timestamp' => now()->toISOString(),
                'event_id' => $request->event['id'] ?? null,
                'action' => $request->action,
                'result' => $result,
            ];

            $request->session()->put($sessionKey, $sessionData);

            return response()->json([
                'success' => true,
                'result' => $result,
            ]);

        } catch (\Exception $e) {
            Log::error('Public simulator action evaluation failed', [
                'error' => $e->getMessage(),
                'session_id' => $request->session_id ?? 'unknown',
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
                'session_id' => 'required|string',
                'task_id' => 'required',
                'action' => 'required|string',
                'game_state' => 'required|array',
            ]);

            $sessionKey = "simulation_session_{$request->session_id}";
            $sessionData = $request->session()->get($sessionKey);

            if (! $sessionData) {
                return response()->json([
                    'success' => false,
                    'error' => 'Simulation session not found. Please start a new simulation.',
                ], 404);
            }

            // For task actions, we'll create a simple evaluation
            // This can be expanded based on your existing task action logic
            $result = [
                'success' => true,
                'message' => 'Task action processed successfully.',
                'effects' => [
                    'task_updates' => [],
                    'team_updates' => [],
                    'metrics_change' => [],
                ],
            ];

            // Update session with task action taken
            $sessionData['actions_taken'][] = [
                'timestamp' => now()->toISOString(),
                'task_id' => $request->task_id,
                'action' => $request->action,
                'type' => 'task_action',
                'result' => $result,
            ];

            $request->session()->put($sessionKey, $sessionData);

            return response()->json([
                'success' => true,
                'result' => $result,
            ]);

        } catch (\Exception $e) {
            Log::error('Public simulator task action evaluation failed', [
                'error' => $e->getMessage(),
                'session_id' => $request->session_id ?? 'unknown',
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to evaluate task action. Please try again.',
            ], 500);
        }
    }
}
