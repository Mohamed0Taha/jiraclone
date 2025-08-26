<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class UsageController extends Controller
{
    public function summary()
    {
        $user = Auth::user();
        return response()->json($user->getUsageSummary());
    }
}
