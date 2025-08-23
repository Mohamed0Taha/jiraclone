<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\AutomationController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectAssistantController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
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
Route::get('/', fn () => Inertia::render('Landing'))->name('landing');

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
| Dashboard
|--------------------------------------------------------------------------
*/
Route::get('/dashboard', function (Request $request) {
    $user = $request->user();

    // Get projects owned by the user
    $ownedProjects = $user->projects()
        ->with(['tasks:id,project_id,title,status'])
        ->get();

    // Get projects where the user is a member
    $memberProjects = $user->memberProjects()
        ->with(['tasks:id,project_id,title,status'])
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
    Route::prefix('projects/{project}/members')->middleware('subscription:members')->group(function () {
        Route::get('/', [App\Http\Controllers\ProjectMemberController::class, 'index'])->name('projects.members.index');
        Route::post('/invite', [App\Http\Controllers\ProjectMemberController::class, 'invite'])->name('projects.members.invite');
        Route::delete('/remove', [App\Http\Controllers\ProjectMemberController::class, 'remove'])->name('projects.members.remove');
        Route::patch('/cancel-invitation', [App\Http\Controllers\ProjectMemberController::class, 'cancelInvitation'])->name('projects.members.cancel-invitation');
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

        /* COMMENTS */
        Route::post('/tasks/{task}/comments', [CommentController::class, 'store'])->name('comments.store');
        Route::patch('/tasks/{task}/comments/{comment}', [CommentController::class, 'update'])->name('comments.update');
        Route::delete('/tasks/{task}/comments/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');

        /* TIMELINE */
        Route::get('/timeline', [TaskController::class, 'timeline'])->name('tasks.timeline');

        /* AUTOMATIONS (premium feature - automation) */
        Route::get('/automations', [AutomationController::class, 'index'])->middleware('subscription:automation')->name('automations.index');
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
