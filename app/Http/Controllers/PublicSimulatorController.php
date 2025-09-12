<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PublicSimulatorController extends Controller
{
    public function index()
    {
        Log::info('Practice landing page accessed');
        return Inertia::render('PublicSimulator/Index', [
            'title' => 'Project Management Simulator - Practice for Free',
            'description' => 'Practice project management skills with realistic scenarios. No signup required.',
        ]);
    }

    public function start(Request $request)
    {
        Log::info('Practice simulation started');

        $mockUser = new \App\Models\User([
            'name' => 'Practice User',
            'email' => 'practice@simulator.local',
        ]);

        $simulationGenerator = app(\App\Services\SimpleSimulationGenerator::class);
        $simulation = $simulationGenerator->generate($mockUser);

        $request->session()->put('simulator_payload', $simulation);

        return redirect()->route('public-simulator.simulator');
    }

    public function simulator(Request $request)
    {
        $simulation = $request->session()->get('simulator_payload');
        if (! $simulation) {
            return redirect()->route('public-simulator.index')->with('error', 'Please start a new simulation.');
        }

        return Inertia::render('Simulator/Index', [
            'simulation' => $simulation,
            'certificationAttempt' => null,
            'auth' => ['user' => null],
        ]);
    }
}

