<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\GoogleCalendarController;
use App\Http\Controllers\AutomationController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\CertificationController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PublicSimulatorController;
use App\Http\Controllers\CustomViewsDataController;
use App\Http\Controllers\ProjectViewsController;
use App\Http\Controllers\CustomViewPageController;
use App\Http\Controllers\ProjectAssistantController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TwilioController;
use App\Models\CertificationAttempt;
use App\Models\Project;
use App\Models\User;
use App\Notifications\CustomVerifyEmail;
use Illuminate\Http\Request;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use App\Events\CustomViewDataUpdated;

/*
|--------------------------------------------------------------------------
| Public Landing
|--------------------------------------------------------------------------
*/

// Removed ad-hoc test/debug routes for clarity

Route::get('/', function (\App\Services\SubscriptionPlanService $planService) {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('Landing', [
        'plans' => $planService->allWithPricing(),
    ]);
})->name('landing');

// Blog routes (public, unauthenticated)
Route::middleware([])->group(function () {
    // Canonical singular path
    Route::get('/blog', [BlogController::class, 'index'])->name('blog.index');
    // Backwards compatibility: redirect legacy /blogs and /blogs/{slug}
    Route::redirect('/blogs', '/blog', 301);
    Route::get('/blogs/{slug}', function($slug){ return redirect()->route('blog.show', $slug); })->where('slug', '[a-zA-Z0-9\-_]+');
    // Public show route
    Route::get('/blog/{blog:slug}', [BlogController::class, 'show'])->name('blog.show')->where('blog', '[a-zA-Z0-9\-_]+');
});

// Legal pages (public, unauthenticated)
Route::get('/privacy_policy', function () {
    return Inertia::render('Legal/PrivacyPolicy');
})->name('privacy.policy');

Route::get('/terms_of_service', function () {
    return Inertia::render('Legal/TermsOfService');
})->name('terms.service');

// Removed debug endpoints; prefer local dev tools or controllers

// Public Simulator (no authentication required) - renamed to /practice to avoid auth conflict
Route::middleware([])->group(function () {
    Route::get('/practice', [PublicSimulatorController::class, 'index'])->name('public-simulator.index');
    Route::post('/practice/start', [PublicSimulatorController::class, 'start'])->name('public-simulator.start');
    Route::get('/practice/simulator', [PublicSimulatorController::class, 'simulator'])->name('public-simulator.simulator');
    
    // Use existing simulator endpoints (they work with the main simulator component)
    Route::post('/practice/evaluate-action', [App\Http\Controllers\SimulatorController::class, 'evaluateAction'])->name('public-simulator.evaluate-action');
    Route::post('/practice/evaluate-task-action', [App\Http\Controllers\SimulatorController::class, 'evaluateTaskAction'])->name('public-simulator.evaluate-task-action');
});

// (Temporary) Remove broad catch-all that could steal valid 404s (was interfering). If needed, re-add with tighter pattern.

/* Project Invitation Acceptance (public) */
Route::get('/invitation/{token}', [App\Http\Controllers\ProjectMemberController::class, 'acceptInvitation'])->name('projects.invitation.accept');

/*
|--------------------------------------------------------------------------
| Email Debug Helper (shows a RELATIVE-signed link)
|--------------------------------------------------------------------------
*/
/*
|--------------------------------------------------------------------------
| Email Debug Helper (shows a RELATIVE-signed link)
|--------------------------------------------------------------------------
*/
// Production cleanup: debug email route disabled
/* Route::get('/debug-email', function () {
    $user = Auth::user();
    if (! $user) {
        return response('Please log in first', 401);
    }

    // Generate relative URL
    $relative = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)],
        false // RELATIVE signature
    );

    // Generate full URL
    $full = rtrim(config('app.url'), '/').$relative;

    return response()->json([
        'user_id' => $user->id,
        'email_hash' => sha1($user->email),
        'relative_url' => $relative,
        'full_url' => $full,
        'app_url' => config('app.url'),
        'current_url' => request()->getSchemeAndHttpHost(),
        'is_verified' => $user->email_verified_at !== null,
    ]);
})->name('debug.email'); */

// Development only: Manual email verification
/* Route::get('/dev-verify-user/{id}', function ($id) {
    if (! app()->environment(['local', 'testing'])) {
        abort(404);
    }

    $user = User::findOrFail($id);

    if (! $user->hasVerifiedEmail()) {
        $user->markEmailAsVerified();
        event(new Verified($user));
        $message = "User {$user->email} has been manually verified for development purposes.";
    } else {
        $message = "User {$user->email} was already verified.";
    }

    Auth::login($user);

    return redirect('/dashboard')->with('status', $message);
})->name('dev.verify.user'); */

/*
|--------------------------------------------------------------------------
| Lightweight Health Check (no session)
|--------------------------------------------------------------------------
*/
Route::get('/health', fn () => response()->json([
    'ok' => true,
    'time' => now()->toIso8601String(),
    'env' => app()->environment(),
    'debug' => (bool) config('app.debug'),
    'laravel' => app()->version(),
]));

// Export project tasks (Jira CSV format)
Route::get('/projects/{project}/export/jira', [ProjectController::class, 'exportJira'])
    ->middleware('auth')
    ->name('projects.export.jira');

/*
|--------------------------------------------------------------------------
| Google OAuth
|--------------------------------------------------------------------------
*/
Route::get('/auth/google', [GoogleController::class, 'redirectToGoogle'])->name('google.login');
Route::get('/auth/google/callback', [GoogleController::class, 'handleGoogleCallback']);

Route::middleware('auth')->group(function () {
    Route::post('/integrations/google/calendar/sync', [GoogleCalendarController::class, 'sync'])->name('google.calendar.sync');
    Route::get('/integrations/google/calendar/connect', [GoogleCalendarController::class, 'connect'])->name('google.calendar.connect');
    Route::get('/integrations/google/calendar/callback', [GoogleCalendarController::class, 'callback'])->name('google.calendar.callback');
    Route::get('/integrations/google/calendar/status', [GoogleCalendarController::class, 'status'])->name('google.calendar.status');
});

/*
|--------------------------------------------------------------------------
| Email Verification (robust & proxy-safe)
|--------------------------------------------------------------------------
| 1) Notice page requires auth.
| 2) The verify link itself is PUBLIC (not behind auth) to avoid signature breakage.
| 3) We validate a RELATIVE signature and ignore common tracking params.
| 4) We verify the user's email and log them in.
*/

Route::get('/email/verify', [EmailVerificationController::class, 'notice'])->middleware('auth')->name('verification.notice');
Route::get('/verify-email/{id}/{hash}', [EmailVerificationController::class, 'verify'])->middleware('throttle:6,1')->name('verification.verify');
Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])->middleware(['auth', 'throttle:6,1'])->name('verification.send');

/*
|--------------------------------------------------------------------------
| Certification Program (authenticated)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {
    Route::get('/certification', [CertificationController::class, 'index'])->name('certification.index');
    Route::post('/certification/answer', [CertificationController::class, 'submitAnswer'])->name('certification.answer');
    Route::get('/certification/answer', function () {
        return redirect()->route('certification.index');
    });
    Route::post('/certification/previous', [CertificationController::class, 'previousQuestion'])->name('certification.previous');
    Route::post('/certification/start-practical', [CertificationController::class, 'startPracticalScenario'])->name('certification.start-practical');
    Route::post('/certification/begin', [CertificationController::class, 'begin'])->name('certification.begin');
    Route::post('/certification/cleanup', [CertificationController::class, 'cleanupExpiredAttempt'])->name('certification.cleanup');
    Route::get('/certification/practical', [CertificationController::class, 'practicalScenario'])->name('certification.practical');
    Route::post('/certification/practical', [CertificationController::class, 'submitPractical'])->name('certification.practical.submit');
    Route::get('/certification/results', [CertificationController::class, 'results'])->name('certification.results');
    Route::post('/certification/generate-simulation', [CertificationController::class, 'generateSimulation'])->name('certification.generate-simulation');
    Route::post('/certification/reset', [CertificationController::class, 'reset'])->name('certification.reset');
    Route::get('/certification/reset', [CertificationController::class, 'reset'])->name('certification.reset.get');
    Route::post('/certification/complete', [CertificationController::class, 'complete'])->name('certification.complete');
    Route::post('/certification/complete-from-simulator', [CertificationController::class, 'completeFromSimulator'])->name('certification.complete-from-simulator');
    Route::get('/certification/certificate', [CertificationController::class, 'certificate'])->name('certification.certificate');
    Route::get('/certification/badge', [CertificationController::class, 'badge'])->name('certification.badge');
    Route::post('/certification/time-up', [CertificationController::class, 'timeUp'])->name('certification.timeup');

    // Project Management Simulator
    Route::get('/simulator', function (\Illuminate\Http\Request $request) {
        // Check if user has passed PM questions phase (80% requirement)
        $latestAttempt = CertificationAttempt::where('user_id', $request->user()->id)
            ->whereIn('phase', ['practical_scenario', 'certification_complete'])
            ->orderByDesc('id')
            ->first();

        if (! $latestAttempt) {
            // User hasn't completed PM questions or didn't pass
            return redirect()->route('certification.index')
                ->with('error', 'You must complete and pass the PM questions (80% required) before accessing the simulator.');
        }

        // Additional check: verify they actually passed theory with 80%
        if ($latestAttempt->phase === 'practical_scenario') {
            $theoryPercentage = $latestAttempt->percentage ?? 0;
            if ($theoryPercentage < 80) {
                return redirect()->route('certification.index')
                    ->with('error', 'You must score 80% or higher on PM questions to access the simulator.');
            }
        }

        $payload = $request->session()->get('simulator_payload');

        return Inertia::render('Simulator/Index', [
            'simulation' => $payload,
            'certificationAttempt' => $latestAttempt, // Pass attempt for final scoring
        ]);
    })->name('simulator.index');

    // Simulator API endpoints
    Route::post('/simulator/evaluate-action', [App\Http\Controllers\SimulatorController::class, 'evaluateAction'])
        ->name('simulator.evaluate-action');
    Route::post('/simulator/evaluate-task-action', [App\Http\Controllers\SimulatorController::class, 'evaluateTaskAction'])
        ->name('simulator.evaluate-task-action');
    Route::post('/simulator/analytics', [App\Http\Controllers\SimulatorController::class, 'getAnalytics'])
        ->name('simulator.analytics');

    // Complete certification from simulator
    Route::post('/simulator/complete-certification', [CertificationController::class, 'completeFromSimulator'])
        ->name('simulator.complete-certification');

    // Testing bypass route for development
    Route::get('/certification/bypass-to-practical', function (Request $request) {
        $attempt = \App\Models\CertificationAttempt::firstOrCreate(
            ['user_id' => $request->user()->id],
            ['phase' => 'pm_concepts', 'current_step' => 1, 'total_score' => 0, 'max_possible_score' => 0]
        );

        // Force the attempt to have a high score for testing
        $attempt->update([
            'phase' => 'practical_scenario',
            'total_score' => 100,
            'max_possible_score' => 100,
            'percentage' => 100.0,
        ]);

        return redirect()->route('certification.practical-scenario')
            ->with('certification_mode', true)
            ->with('certification_attempt_id', $attempt->id)
            ->with('message', 'Testing bypass - Proceeding to practical scenario!');
    })->name('certification.bypass');

    // Local only: fully pass certification and jump to simulator
    if (app()->environment('local')) {
        Route::get('/certification/dev-force-pass', [CertificationController::class, 'devForcePass'])->name('certification.dev.force');
        // Dev helper: wipe attempts (GET added for convenience in local env)
        Route::match(['get', 'delete'], '/certification/dev-wipe', [CertificationController::class, 'devWipeAttempts'])->name('certification.dev.wipe');
    }

    // Removed Virtual Project Simulation Routes - no longer needed
    // All virtual project related routes have been removed as the feature is deprecated

    // Add new practical scenario route for certification
});

// Public certificate access + verification (no auth required)
Route::get('/verify/{serial}', [CertificationController::class, 'verifyPublic'])->name('certification.verify.public');

// DEBUG: Minimal certificate test (local only)
if (app()->environment('local')) {
Route::get('/certificates/{serial}/debug', function ($serial) {
    try {
        $attempt = \App\Models\CertificationAttempt::where('serial', $serial)->first();
        if (! $attempt) {
            return response('Serial not found', 404);
        }

        $user = $attempt->user;
        if (! $user) {
            return response('User missing', 500);
        }

        return response()->json([
            'serial' => $serial,
            'user_id' => $user->id,
            'user_name' => $user->name,
            'percentage' => $attempt->percentage,
            'completed_at' => $attempt->completed_at,
            'debug' => 'OK',
        ]);
    } catch (\Throwable $e) {
        return response()->json(['error' => $e->getMessage(), 'line' => $e->getLine()], 500);
    }
});
}

Route::get('/certificates/{serial}', [CertificationController::class, 'publicCertificate'])->name('certification.public.certificate');
Route::get('/certificates/{serial}/badge', [CertificationController::class, 'publicBadge'])->name('certification.public.badge');
// HD downloadable images (server-side rendered to JPEG)
Route::get('/certificates/{serial}/download.jpg', [CertificationController::class, 'downloadCertificateJpeg'])->name('certification.public.certificate.download');
Route::get('/certificates/{serial}/badge/download.jpg', [CertificationController::class, 'downloadBadgeJpeg'])->name('certification.public.badge.download');
// Open Graph images for social sharing
Route::get('/certificates/{serial}/download/og-image', [CertificationController::class, 'certificateOgImage'])->name('certification.public.certificate.og');
Route::get('/certificates/{serial}/badge/download/og-image', [CertificationController::class, 'badgeOgImage'])->name('certification.public.badge.og');

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/
Route::get('/dashboard', [DashboardController::class, 'index'])->middleware(['auth', 'verified'])->name('dashboard');

/*
|--------------------------------------------------------------------------
| Billing
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/billing', [BillingController::class, 'show'])->name('billing.show');
    Route::post('/billing/checkout', [BillingController::class, 'createCheckout'])->name('billing.checkout');
    Route::post('/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');
    Route::post('/billing/cancel', [BillingController::class, 'cancel'])->name('billing.cancel');
    Route::post('/billing/resume', [BillingController::class, 'resume'])->name('billing.resume');
});

/*
|--------------------------------------------------------------------------
| Admin Dashboard
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->name('admin.')->middleware(['auth', 'admin.only'])->group(function () {
    Route::get('/dashboard', [AdminController::class, 'dashboard'])->name('dashboard');
    Route::get('/users', [AdminController::class, 'users'])->name('users');
    Route::post('/users/{user}/make-admin', [AdminController::class, 'makeAdmin'])->name('make-admin');
    Route::post('/users/{user}/demote-admin', [AdminController::class, 'demoteAdmin'])->name('demote-admin');

    // Blog management routes
    Route::resource('blogs', \App\Http\Controllers\Admin\BlogController::class);
    
    // Blog API test page (development only)
    Route::get('/blogs/test-api', function() {
        return view('admin.blogs.test-api');
    })->name('blogs.test-api');
    
    // Blog AI routes
    Route::post('/blogs/generate', [\App\Http\Controllers\Admin\BlogController::class, 'generate'])->name('blogs.generate');
    Route::post('/blogs/ideas', [\App\Http\Controllers\Admin\BlogController::class, 'ideas'])->name('blogs.ideas');
    Route::post('/blogs/optimize', [\App\Http\Controllers\Admin\BlogController::class, 'optimize'])->name('blogs.optimize');
    Route::post('/blogs/generate-image', [\App\Http\Controllers\Admin\BlogController::class, 'generateImage'])->name('blogs.generate-image');
    Route::get('/blogs/{blog}/status', [\App\Http\Controllers\Admin\BlogController::class, 'status'])->name('blogs.status');
    
    // Blog publish/unpublish routes
    Route::post('/blogs/{blog}/publish', [\App\Http\Controllers\Admin\BlogController::class, 'publish'])->name('blogs.publish');
    Route::post('/blogs/{blog}/unpublish', [\App\Http\Controllers\Admin\BlogController::class, 'unpublish'])->name('blogs.unpublish');

    // User management routes
    Route::get('/users/create', [AdminController::class, 'createUser'])->name('users.create');
    Route::post('/users', [AdminController::class, 'storeUser'])->name('users.store');
    Route::get('/users/{user}/edit', [AdminController::class, 'editUser'])->name('users.edit');
    Route::put('/users/{user}', [AdminController::class, 'updateUser'])->name('users.update');
    Route::delete('/users/{user}', [AdminController::class, 'deleteUser'])->name('users.delete');
    Route::post('/users/{user}/upgrade', [AdminController::class, 'upgradeUser'])->name('users.upgrade');
    Route::post('/users/{user}/verify', [AdminController::class, 'verifyUser'])->name('users.verify');

    // Analytics routes
    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics');
    Route::post('/track-visitor', [AnalyticsController::class, 'trackVisitor'])->name('track-visitor');

    // Other analytics routes
    Route::get('/email-logs', [AdminController::class, 'emailLogs'])->name('email-logs');
    Route::get('/email-logs/{emailLog}', [AdminController::class, 'emailLogDetail'])->name('email-logs.detail');
    Route::get('/openai-requests', [AdminController::class, 'openaiRequests'])->name('openai-requests');
    Route::get('/billing', [AdminController::class, 'billing'])->name('billing');
    Route::get('/cancellations', [AdminController::class, 'cancellations'])->name('cancellations');

    // SMS tracking routes
    Route::get('/sms-messages', [AdminController::class, 'smsMessages'])->name('sms-messages');
    Route::get('/sms-messages/{smsMessage}', [AdminController::class, 'smsMessageShow'])->name('sms-message-show');
    Route::get('/sms-stats', [AdminController::class, 'smsStats'])->name('sms-stats');
    Route::post('/sms-messages/sync-status', [AdminController::class, 'syncSmsStatuses'])->name('sms-messages.sync');
    Route::get('/plans', [AdminController::class, 'plans'])->name('plans');
    Route::post('/plans/sync-stripe', [AdminController::class, 'syncPlansFromStripe'])->name('plans.sync');
    Route::post('/plans/update-price', [AdminController::class, 'updateStripePrice'])->name('plans.price.update');

    // Refund management routes
    Route::get('/refunds', [AdminController::class, 'refunds'])->name('refunds');
    Route::post('/refunds/process', [AdminController::class, 'processRefund'])->name('refunds.process');
    Route::post('/refunds/quick', [AdminController::class, 'quickRefund'])->name('refunds.quick');
    Route::get('/customers/{user}/payments', [AdminController::class, 'getCustomerPayments'])->name('customers.payments');

    // Broadcast Email
    Route::get('/broadcast-email', [AdminController::class, 'broadcastEmailForm'])->name('broadcast-email.form');
    Route::post('/broadcast-email', [AdminController::class, 'sendBroadcastEmail'])->name('broadcast-email.send');

    // Twilio Testing
    Route::get('/twilio-test', [AdminController::class, 'twilioTest'])->name('twilio-test');
    Route::post('/twilio/test-sms', [TwilioController::class, 'testSMS'])->name('twilio.test-sms');
    Route::post('/twilio/test-whatsapp', [TwilioController::class, 'testWhatsApp'])->name('twilio.test-whatsapp');
    Route::post('/twilio/check-status', [TwilioController::class, 'checkMessageStatus'])->name('twilio.check-status');

    // AppSumo Management
    Route::get('/appsumo', [AdminController::class, 'appSumoDashboard'])->name('appsumo.dashboard');
    Route::post('/appsumo/generate', [AdminController::class, 'generateAppSumoCodes'])->name('appsumo.generate');
    Route::get('/appsumo/export', [AdminController::class, 'exportAppSumoCodes'])->name('appsumo.export');
    Route::delete('/appsumo/delete', [AdminController::class, 'deleteAppSumoCodes'])->name('appsumo.delete');
});

/*
|--------------------------------------------------------------------------
| Profile / Projects / Tasks / Comments / Automations / Assistant
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    /* Broadcasting Authentication */
    Broadcast::routes();

    /* Profile */
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    /* Contact Us */
    Route::get('/contact', [ContactController::class, 'show'])->name('contact.show');
    Route::post('/contact', [ContactController::class, 'send'])->name('contact.send');

    /* Email Statistics API */
    Route::get('/api/email-stats', [\App\Http\Controllers\EmailStatsController::class, 'getStats'])->name('api.email-stats');
    Route::get('/api/email-logs', [\App\Http\Controllers\EmailStatsController::class, 'getRecentLogs'])->name('api.email-logs');

    /* Usage Summary API */
    Route::get('/api/usage-summary', [\App\Http\Controllers\Api\UsageController::class, 'summary'])->name('api.usage-summary');

    /* Projects */
    Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index');
    Route::get('/projects/create', [ProjectController::class, 'create'])->name('projects.create');
    Route::post('/projects/analyze-document', [ProjectController::class, 'analyzeDocument'])->name('projects.analyze-document');
    Route::post('/projects/draft', [ProjectController::class, 'createDraft'])->name('projects.draft.create');
    Route::post('/projects/{project}/complete', [ProjectController::class, 'completeDraft'])->name('projects.draft.complete');
    Route::post('/projects/{project}/tasks/bulk', [TaskController::class, 'storeBulk'])->name('projects.tasks.bulk');
    Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');

    // Single, canonical AI PDF endpoint (premium feature - reports)
    Route::post('/projects/{project}/report', [ProjectController::class, 'generateReport'])
        ->middleware('subscription:reports')
        ->name('projects.report.generate');

    // Edit/Update before show
    Route::get('/projects/{project}/edit', [ProjectController::class, 'edit'])->name('projects.edit');
    Route::patch('/projects/{project}', [ProjectController::class, 'update'])->name('projects.update');

    // Show => use controller method with explicit authorization
    Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');

    Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');

    /* Project Members Routes (premium feature - team collaboration) */
    // Members: view allowed for all authenticated users (overlay/upsell handled in UI), mutations gated
    Route::prefix('projects/{project}/members')->group(function () {
        Route::get('/', [App\Http\Controllers\ProjectMemberController::class, 'index'])->name('projects.members.index');
        Route::post('/invite', [App\Http\Controllers\ProjectMemberController::class, 'invite'])->middleware('subscription:members')->name('projects.members.invite');
        Route::delete('/remove', [App\Http\Controllers\ProjectMemberController::class, 'remove'])->middleware('subscription:members')->name('projects.members.remove');
        Route::patch('/cancel-invitation', [App\Http\Controllers\ProjectMemberController::class, 'cancelInvitation'])->middleware('subscription:members')->name('projects.members.cancel-invitation');
        Route::post('/leave', [App\Http\Controllers\ProjectMemberController::class, 'leave'])->name('projects.members.leave');
    });

    /* Nested project-scoped routes */
    Route::prefix('projects/{project}')->group(function () {
        /* TASKS: AI generator flow (premium feature - ai_task_generation) */
        Route::get('/tasks/ai', function (Request $request, Project $project) {
            $prefillData = $request->all();
            
            // Debug log the incoming data
            Log::info('AI Form Route - Incoming request data:', [
                'pinnedTasks_count' => isset($prefillData['pinnedTasks']) ? count($prefillData['pinnedTasks']) : 0,
                'pinnedTasks_sample' => isset($prefillData['pinnedTasks']) ? array_slice($prefillData['pinnedTasks'], 0, 3) : [],
            ]);
            
            // Clean and validate pinnedTasks to prevent data accumulation issues
            if (isset($prefillData['pinnedTasks']) && is_array($prefillData['pinnedTasks'])) {
                // Filter out any invalid or malformed pinned tasks
                $prefillData['pinnedTasks'] = array_filter($prefillData['pinnedTasks'], function($task) {
                    return is_array($task) && isset($task['title']) && !empty($task['title']);
                });
                
                // Limit to reasonable number to prevent UI issues
                $prefillData['pinnedTasks'] = array_slice($prefillData['pinnedTasks'], 0, 20);
                
                Log::info('AI Form Route - After cleaning:', [
                    'cleaned_pinnedTasks_count' => count($prefillData['pinnedTasks']),
                ]);
            }
            
            return Inertia::render('Tasks/AITasksGenerator', [
                'project' => $project,
                'prefill' => $prefillData,
            ]);
        })->name('tasks.ai.form'); // Remove middleware to allow access

        Route::post('/tasks/ai', [TaskController::class, 'generateWithAI'])->middleware('subscription:ai_tasks')->name('tasks.ai.generate');
        // Preview route: no subscription middleware so free users see generated tasks behind overlay
        Route::post('/tasks/ai/preview', [TaskController::class, 'previewWithAI'])->name('tasks.ai.preview');
        // Accept route still enforced by subscription middleware
        Route::post('/tasks/ai/accept', [TaskController::class, 'acceptAIPreview'])->middleware('subscription:ai_tasks')->name('tasks.ai.accept');
        Route::post('/tasks/ai/reject', [TaskController::class, 'rejectAIPreview'])->middleware('subscription:ai_tasks')->name('tasks.ai.reject');

        // AI task suggestions (no middleware needed - just suggestions)
        Route::get('/tasks/ai/suggestions', [TaskController::class, 'suggestionsAI'])->name('tasks.ai.suggestions');

        /* TASKS: CRUD */
        Route::get('/tasks', [TaskController::class, 'index'])->name('tasks.index');
        Route::get('/tasks/{task}', [TaskController::class, 'show'])->name('tasks.show');
        Route::post('/tasks', [TaskController::class, 'store'])->name('tasks.store');
        Route::patch('/tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
        Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');

        // Task attachments (images)
        Route::post('/tasks/{task}/attachments', [\App\Http\Controllers\TaskAttachmentController::class, 'store'])->name('tasks.attachments.store');
        Route::delete('/tasks/{task}/attachments/{attachment}', [\App\Http\Controllers\TaskAttachmentController::class, 'destroy'])->name('tasks.attachments.destroy');

        /* COMMENTS */
        Route::post('/tasks/{task}/comments', [CommentController::class, 'store'])->name('comments.store');
        Route::patch('/tasks/{task}/comments/{comment}', [CommentController::class, 'update'])->name('comments.update');
        Route::delete('/tasks/{task}/comments/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');

        /* TIMELINE */
        Route::get('/timeline', [TaskController::class, 'timeline'])->name('tasks.timeline');

        /* CUSTOM VIEWS */
        Route::get('/custom-views/{name}', [CustomViewPageController::class, 'show'])
        // Prevent collisions with API-like endpoints so they don't get caught by {name}
        ->where('name', '^(?!get$|delete$|chat$|list$)[A-Za-z0-9_-]+')
        ->name('custom-views.show');

        Route::get('/custom-views/get', [ProjectViewsController::class, 'getCustomView'])->name('custom-views.get');
        Route::get('/custom-views/list', [ProjectViewsController::class, 'listCustomViews'])->name('custom-views.list');

        Route::delete('/custom-views/delete', [ProjectViewsController::class, 'deleteCustomView'])->name('custom-views.delete');

        Route::post('/custom-views/save', [ProjectViewsController::class, 'saveCustomView'])->name('custom-views.save');
        Route::post('/custom-views/pin', [ProjectViewsController::class, 'pinMicroApp'])->name('custom-views.pin');
        Route::delete('/custom-views/pin', [ProjectViewsController::class, 'unpinMicroApp'])->name('custom-views.unpin');

        Route::post('/custom-views/save-data', [ProjectViewsController::class, 'saveComponentData'])->name('custom-views.save-data');

        Route::get('/custom-views/load-data', [ProjectViewsController::class, 'loadComponentData'])->name('custom-views.load-data');

        // Chat endpoint (JSON; client falls back when streaming unavailable)
        Route::post('/custom-views/chat', [ProjectViewsController::class, 'chat'])->name('custom-views.chat');

        // TEMP: E2E realtime test route - emits a sample workflow_step event
        // Visit: /projects/{project}/custom-views/test-realtime?view_name=default
        Route::get('/custom-views/test-realtime', function (Request $request, Project $project) {
            // Ensure the authenticated user can view the project
            if (! $request->user() || ! $request->user()->can('view', $project)) {
                abort(403);
            }

            $viewName = $request->query('view_name', 'default');

            try {
                broadcast(new CustomViewDataUpdated(
                    $project->id,
                    $viewName,
                    'workflow_step',
                    [
                        'sequence' => 1,
                        'step' => 'analysis',
                        'status' => 'completed',
                        'details' => 'Realtime test event delivered successfully',
                        'total' => 1,
                    ],
                    $request->user()
                ));

                return response()->json([
                    'ok' => true,
                    'message' => 'Test event broadcasted on private-custom-view.' . $project->id . '.' . $viewName,
                    'event' => 'custom-view-data-updated',
                ]);
            } catch (\Throwable $e) {
                Log::error('Test realtime broadcast failed', [
                    'project_id' => $project->id,
                    'view_name' => $viewName,
                    'error' => $e->getMessage(),
                ]);
                return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
            }
        })->name('custom-views.test-realtime');

        /* AUTOMATIONS (premium feature - automation) */
        // Allow all authenticated users to view automations index (overlay handles upsell)
        Route::get('/automations', [AutomationController::class, 'index'])->name('automations.index');
        Route::post('/automations', [AutomationController::class, 'store'])->middleware('subscription:automation')->name('automations.store');
        Route::patch('/automations/{automation}', [AutomationController::class, 'update'])->middleware('subscription:automation')->name('automations.update');
        Route::delete('/automations/{automation}', [AutomationController::class, 'destroy'])->middleware('subscription:automation')->name('automations.destroy');
        Route::patch('/automations/{automation}/toggle', [AutomationController::class, 'toggle'])->middleware('subscription:automation')->name('automations.toggle');
        Route::post('/automations/{automation}/test', [AutomationController::class, 'test'])->middleware('subscription:automation')->name('automations.test');
        Route::post('/automations/{automation}/execute', [AutomationController::class, 'execute'])->middleware('subscription:automation')->name('automations.execute');
        Route::post('/automations/process', [AutomationController::class, 'processProject'])->middleware('subscription:automation')->name('automations.process');

        /* PROJECT ASSISTANT (premium feature - ai_assistant) */
        Route::post('/assistant/chat', [ProjectAssistantController::class, 'chat'])->name('projects.assistant.chat'); // Remove middleware to allow access, handle overlay in controller
        Route::get('/assistant/suggestions', [ProjectAssistantController::class, 'suggestions'])->name('projects.assistant.suggestions'); // Remove middleware
        Route::post('/assistant/execute', [ProjectAssistantController::class, 'execute'])->middleware('subscription:ai_chat')->name('projects.assistant.execute'); // Keep middleware for actual execution
        Route::get('/assistant/test', [ProjectAssistantController::class, 'test'])->name('projects.assistant.test'); // Remove middleware
    });

    /* AI SDK compatible chat route for component generation */
    Route::post('/api/chat', function (Request $request) {
        try {
            $messages = $request->input('messages', []);
            
            // Extract project context from request body (sent by useChat body parameter)
            $projectId = $request->input('projectId') ?? null;
            $viewName = $request->input('viewName') ?? 'default';
            $currentComponentCode = $request->input('currentCode') ?? null;
            $projectContext = $request->input('projectContext') ?? null;
            
            if (!$projectId) {
                return response()->json(['error' => 'Project ID is required'], 400);
            }
            
            $project = Project::find($projectId);
            if (!$project) {
                return response()->json(['error' => 'Project not found'], 404);
            }
            
            // Get the latest user message
            $lastMessage = end($messages);
            $userMessage = $lastMessage['content'] ?? '';
            
            if (empty($userMessage)) {
                return response()->json(['error' => 'Message content is required'], 400);
            }
            
            // Build conversation history from messages array
            $conversationHistory = array_map(function($msg) {
                return [
                    'role' => $msg['role'],
                    'content' => $msg['content'],
                    'timestamp' => $msg['timestamp'] ?? now()->toISOString()
                ];
            }, $messages);
            
            // Initialize services
            $openAIService = app(\App\Services\OpenAIService::class);
            $googleImageService = app(\App\Services\GoogleImageService::class);
            $generativeUIService = new \App\Services\GenerativeUIService($openAIService, $googleImageService);
            
            Log::info('GenerativeUIService: Sending prompt to OpenAI', [
                'project_id' => $project->id,
                'user_message' => $userMessage,
                'is_update_request' => !empty($currentComponentCode),
                'current_component_length' => $currentComponentCode ? strlen($currentComponentCode) : 0,
                'has_project_context' => !is_null($projectContext),
                'project_context_keys' => $projectContext ? array_keys($projectContext) : [],
                'conversation_length' => count($conversationHistory),
            ]);
            
            // Process the request
            $result = $generativeUIService->processCustomViewRequest(
                $project,
                $userMessage,
                $request->user()->id, // userId
                null, // sessionId
                $viewName,
                $conversationHistory,
                $projectContext,
                $currentComponentCode
            );
            
            // Create the response message in AI SDK UIMessage format
            $responseMessage = [
                'id' => 'msg_' . uniqid(),
                'role' => 'assistant',
                'content' => $result['success'] ? $result['message'] : ($result['message'] ?? 'Failed to generate component'),
                'createdAt' => now()->toISOString(),
            ];
            
            // Add custom data for successful component generation
            if ($result['success']) {
                $responseMessage['experimental_data'] = [
                    'type' => 'spa_generated',
                    'component_code' => $result['component_code'],
                    'custom_view_id' => $result['custom_view_id'] ?? null
                ];
            } else {
                // Log detailed error information
                Log::warning('Component generation failed', [
                    'result' => $result,
                    'project_id' => $projectId,
                    'view_name' => $viewName,
                    'user_message' => $userMessage,
                    'user_id' => $request->user()->id
                ]);
            }
            
            // Return as a text/plain streaming response for AI SDK compatibility
            return response()->stream(function () use ($responseMessage) {
                // Simple data stream format
                echo "data: " . json_encode($responseMessage) . "\n\n";
                echo "data: [DONE]\n\n";
            }, 200, [
                'Content-Type' => 'text/plain',
                'Cache-Control' => 'no-cache',
                'Connection' => 'keep-alive',
            ]);
            
        } catch (\Exception $e) {
            Log::error('Chat API error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Internal server error'
            ], 500);
        }
    });
});

/*
|--------------------------------------------------------------------------
| Breeze / Auth scaffolding
|--------------------------------------------------------------------------
*/
/*
|--------------------------------------------------------------------------
| AppSumo Integration
|--------------------------------------------------------------------------
*/
// Public redemption page (no auth required)
Route::get('/appsumo/redeem', [App\Http\Controllers\AppSumoController::class, 'redeemPage'])->name('appsumo.redeem');
Route::get('/appsumo/redeem/{code}', [App\Http\Controllers\AppSumoController::class, 'redeemPage'])->name('appsumo.redeem.code');
Route::post('/appsumo/redeem', [App\Http\Controllers\AppSumoController::class, 'processRedemption'])->name('appsumo.redeem.process');
Route::get('/appsumo/success', [App\Http\Controllers\AppSumoController::class, 'successPage'])->name('appsumo.success');

// Dynamic AppSumo link (configurable for AppSumo dashboard)
Route::get('/appsumo', [App\Http\Controllers\AppSumoController::class, 'dynamicRedirect'])->name('appsumo.dynamic');

// AppSumo admin functionality moved to regular admin dashboard
// Codes can be managed through direct database queries or Artisan commands if needed

require __DIR__.'/auth.php';
if (app()->environment('local')) {
    Route::get('/test-email-production', function () {
        try {
            // Get a test user or create one
            $user = User::first();
            if (! $user) {
                $user = User::factory()->make([
                    'name' => 'Test User',
                    'email' => 'test@example.com',
                ]);
            }

            // Test basic email
            Mail::raw('This is a test email from TaskPilot local development using production settings.', function ($message) use ($user) {
                $message->to($user->email)
                    ->subject('TaskPilot - Production Email Test')
                    ->from(config('mail.from.address'), config('mail.from.name'));
            });

            return response()->json([
                'success' => true,
                'message' => 'Test email sent successfully!',
                'mail_config' => [
                    'mailer' => config('mail.default'),
                    'host' => config('mail.mailers.smtp.host'),
                    'port' => config('mail.mailers.smtp.port'),
                    'username' => config('mail.mailers.smtp.username'),
                    'encryption' => config('mail.mailers.smtp.encryption'),
                    'from_address' => config('mail.from.address'),
                    'from_name' => config('mail.from.name'),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ], 500);
        }
    });

    Route::get('/test-verification-email', function () {
        try {
            $user = User::first();
            if (! $user) {
                return response()->json(['error' => 'No user found. Please register a user first.'], 404);
            }

            // Send verification email
            $user->notify(new CustomVerifyEmail);

            return response()->json([
                'success' => true,
                'message' => 'Verification email sent successfully!',
                'user_email' => $user->email,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ], 500);
        }
    });
}

// Debug route
// Removed deprecated debug controller-check route
