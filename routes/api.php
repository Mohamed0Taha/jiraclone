<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Test endpoint
Route::get('/test-dashboard', function () {
    return response()->json([
        'success' => true,
        'message' => 'Dashboard API is working',
        'timestamp' => now()->toISOString()
    ]);
});

// Dashboard Chat API - LLM Integration
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/dashboard/chat', [DashboardChatController::class, 'chat']);
});

// Project Data API
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/project/{id}/tasks', [ProjectDataController::class, 'getTasks']);
    Route::get('/project/{id}/dashboard-data', [ProjectDataController::class, 'getDashboardData']);
});
