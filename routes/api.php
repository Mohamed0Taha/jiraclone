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
