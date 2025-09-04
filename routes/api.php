<?php

use App\Http\Controllers\EmailWebhookController;
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

// Email Forwarding Webhook Routes
Route::post('/email/webhook', [EmailWebhookController::class, 'handleIncomingEmail'])
    ->name('email.webhook');

Route::post('/email/test-forward', [EmailWebhookController::class, 'testForward'])
    ->name('email.test-forward');

// Simulate incoming email to support@taskpilot.us
Route::post('/simulate-support-email', function (Request $request) {
    $request->validate([
        'from' => 'required|email',
        'subject' => 'required|string',
        'content' => 'required|string',
    ]);

    \Log::info('Simulating incoming email to support@taskpilot.us', [
        'from' => $request->from,
        'subject' => $request->subject,
        'to' => 'support@taskpilot.us'
    ]);

    // Forward the simulated email
    $success = \App\Services\EmailForwardingService::forwardSupportEmail(
        subject: $request->subject,
        content: $request->content,
        fromEmail: $request->from,
        headers: []
    );

    return response()->json([
        'success' => $success,
        'message' => $success ? 
            'Simulated email forwarded successfully to taha.elfatih@gmail.com' : 
            'Failed to forward simulated email',
        'simulation_note' => 'This simulates what would happen when someone emails support@taskpilot.us'
    ]);
});
