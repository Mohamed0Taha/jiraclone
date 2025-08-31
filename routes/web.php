<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\AutomationController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\CertificationController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectAssistantController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TwilioController;
use App\Models\CertificationAttempt;
use App\Models\Project;
use App\Models\User;
use App\Notifications\CustomVerifyEmail;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Public Landing
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('Landing');
})->name('landing');

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

/*
|--------------------------------------------------------------------------
| Email Verification (robust & proxy-safe)
|--------------------------------------------------------------------------
| 1) Notice page requires auth.
| 2) The verify link itself is PUBLIC (not behind auth) to avoid signature breakage.
| 3) We validate a RELATIVE signature and ignore common tracking params.
| 4) We verify the user's email and log them in.
*/

// Notice screen (requires auth)
Route::get('/email/verify', function () {
    return Inertia::render('Auth/VerifyEmail', ['status' => session('status')]);
})->middleware('auth')->name('verification.notice');

// Verification link target (PUBLIC)
Route::get('/verify-email/{id}/{hash}', function (Request $request, $id, $hash) {
    // Parameters to ignore during signature validation
    $ignored = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

    $isValid = false;

    // Method 1: Try relative signature validation first (recommended for dev/proxy environments)
    try {
        $isValid = URL::hasValidSignature($request, false, $ignored);
    } catch (\Exception $e) {
        // Continue to next method
    }

    // Method 2: If relative fails, try absolute validation
    if (! $isValid) {
        try {
            $isValid = URL::hasValidSignature($request, true, $ignored);
        } catch (\Exception $e) {
            // Continue to next method
        }
    }

    // Method 3: Manual signature validation for local development
    if (! $isValid && app()->environment(['local', 'testing'])) {
        try {
            $url = $request->url();
            $queryString = $request->getQueryString();

            if ($queryString) {
                // Parse query parameters
                parse_str($queryString, $params);
                $signature = $params['signature'] ?? null;

                if ($signature) {
                    unset($params['signature']);

                    // Rebuild URL without signature for validation
                    $baseUrl = $url.'?'.http_build_query($params);

                    // Generate expected signature
                    $expectedSignature = hash_hmac('sha256', $baseUrl, config('app.key'));

                    $isValid = hash_equals($expectedSignature, $signature);
                }
            }
        } catch (\Exception $e) {
            // If all methods fail, we'll show the error below
        }
    }

    if (! $isValid) {
        abort(403, 'Invalid signature. Please request a new verification email.');
    }

    $user = User::findOrFail($id);

    // Ensure the hash matches the user's current email
    if (! hash_equals(sha1($user->getEmailForVerification()), (string) $hash)) {
        abort(403, 'Invalid verification hash.');
    }

    if (! $user->hasVerifiedEmail()) {
        $user->markEmailAsVerified();
        event(new Verified($user));
    }

    // Log the user in after verification
    Auth::login($user);

    return redirect()->intended('/dashboard')->with('verified', true);
})->middleware('throttle:6,1')->name('verification.verify');

// Resend verification email (requires auth)
Route::post('/email/verification-notification', function (Request $request) {
    if ($request->user()->hasVerifiedEmail()) {
        return redirect()->intended('/dashboard');
    }
    $request->user()->sendEmailVerificationNotification();

    return back()->with('status', 'verification-link-sent');
})->middleware(['auth', 'throttle:6,1'])->name('verification.send');

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

// DEBUG: Minimal certificate test
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
Route::get('/dashboard', function (Request $request) {
    $user = $request->user();

    // Get projects owned by the user
    $ownedProjects = $user->projects()
        ->with(['tasks:id,project_id,title,status', 'user:id,name'])
        ->get();

    // Get projects where the user is a member
    $memberProjects = $user->memberProjects()
        ->with(['tasks:id,project_id,title,status', 'user:id,name'])
        ->get();

    // Combine both collections
    $allProjects = $ownedProjects->merge($memberProjects)->unique('id');

    $projects = $allProjects->map(function ($p) use ($user) {
        $group = fn (string $status) => $p->tasks
            ->where('status', $status)
            ->values()
            ->map->only('id', 'title')
            ->all();

        return [
            'id' => $p->id,
            'name' => $p->name,
            'description' => $p->description,
            'is_owner' => $p->user_id === $user->id,
            'owner' => [
                'id' => $p->user->id,
                'name' => $p->user->name,
            ],
            'tasks' => [
                'todo' => $group('todo'),
                'inprogress' => $group('inprogress'),
                'review' => $group('review'),
                'done' => $group('done'),
            ],
        ];
    });

    return Inertia::render('Dashboard', ['projects' => $projects]);
})->middleware(['auth', 'verified'])->name('dashboard');

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

    // User management routes
    Route::get('/users/create', [AdminController::class, 'createUser'])->name('users.create');
    Route::post('/users', [AdminController::class, 'storeUser'])->name('users.store');
    Route::get('/users/{user}/edit', [AdminController::class, 'editUser'])->name('users.edit');
    Route::put('/users/{user}', [AdminController::class, 'updateUser'])->name('users.update');
    Route::delete('/users/{user}', [AdminController::class, 'deleteUser'])->name('users.delete');
    Route::post('/users/{user}/upgrade', [AdminController::class, 'upgradeUser'])->name('users.upgrade');

    // Analytics routes
    Route::get('/email-logs', [AdminController::class, 'emailLogs'])->name('email-logs');
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
});

/*
|--------------------------------------------------------------------------
| Profile / Projects / Tasks / Comments / Automations / Assistant
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
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
        Route::get('/tasks/ai', function (Project $project) {
            return Inertia::render('Tasks/AITasksGenerator', [
                'project' => $project,
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
});

/*
|--------------------------------------------------------------------------
| Breeze / Auth scaffolding
|--------------------------------------------------------------------------
*/
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
Route::get('/debug/controller-check', function () {
    $file = file_get_contents(app_path('Http/Controllers/CertificationController.php'));
    $hasIntroGate = strpos($file, 'If no attempt exists, show intro page') !== false;
    $hasOldLogic = strpos($file, 'getCurrentQuestion') !== false;

    return response()->json([
        'has_intro_gate' => $hasIntroGate,
        'has_old_logic' => $hasOldLogic,
        'file_size' => strlen($file),
        'first_100_chars' => substr($file, 0, 100),
        'git_commit' => trim(shell_exec('git rev-parse HEAD')),
    ]);
});
