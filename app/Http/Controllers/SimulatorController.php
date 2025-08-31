<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SimulatorController extends Controller
{
    public function evaluateAction(Request $request)
    {
        return response()->json(['success' => true]);
    }

    public function evaluateTaskAction(Request $request)
    {
        return response()->json(['success' => true]);
    }

    public function getAnalytics(Request $request)
    {
        return response()->json(['success' => true]);
    }
}
