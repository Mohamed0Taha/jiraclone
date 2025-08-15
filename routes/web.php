<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Foundation\Auth\EmailVerificationRequest;

use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\ProjectAssistantController;
use App\Http\Controllers\AutomationController;
use App\Models\Project;

/*
|--------------------------------------------------------------------------
| Public Landing
|--------------------------------------------------------------------------
*/
Route::get('/', fn () => Inertia::render('Landing'))->name('landing');

/* Optional quick test page */
Route::get('/test-ai', fn () => view('test-ai'));

/*
|--------------------------------------------------------------------------
| Email Debug Helper (shows a RELATIVE-signed link)
|--------------------------------------------------------------------------
*/
Route::get('/debug-email', function () {
    $user = Auth::user();
    if (!$user) {
        return response('Please log in first', 401);
    }

    $relative = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)],
        false // ← RELATIVE signature
    );

    return [
        'user_id'        => $user->id,
        'email'          => $user->email,
        'relative_link'  => $relative,
        'full_link'      => rtrim(config('app.url'), '/') . $relative,
        'app_url'        => config('app.url'),
        'current_host'   => request()->getSchemeAndHttpHost(),
        'is_verified'    => (bool) $user->email_verified_at,
    ];
})->middleware('auth');

/*
|--------------------------------------------------------------------------
| Lightweight Health Check (no session)
|--------------------------------------------------------------------------
*/
Route::get('/health', fn () => response()->json([
    'ok'      => true,
    'time'    => now()->toIso8601String(),
    'env'     => app()->environment(),
    'debug'   => (bool) config('app.debug'),
    'laravel' => app()->version(),
]));

/*
|--------------------------------------------------------------------------
| Google OAuth
|--------------------------------------------------------------------------
*/
Route::get('/auth/google',          [GoogleController::class, 'redirectToGoogle'])->name('google.login');
Route::get('/auth/google/callback', [GoogleController::class, 'handleGoogleCallback']);

/*
|--------------------------------------------------------------------------
| Email Verification (RELATIVE-signed links)
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    // Notice screen
    Route::get('/email/verify', function () {
        return Inertia::render('Auth/VerifyEmail', [
            'status' => session('status'),
        ]);
    })->name('verification.notice');

    // Verification link target
    Route::get('/verify-email/{id}/{hash}', function (EmailVerificationRequest $request) {
        $request->fulfill();
        return redirect()->intended('/dashboard')->with('verified', true);
    })->middleware(['signed:relative', 'throttle:6,1'])
      ->name('verification.verify');

    // Resend verification email
    Route::post('/email/verification-notification', function (Request $request) {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended('/dashboard');
        }
        $request->user()->sendEmailVerificationNotification();
        return back()->with('status', 'verification-link-sent');
    })->middleware(['throttle:6,1'])->name('verification.send');
});

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/
Route::get('/dashboard', function (Request $request) {
    $projects = $request->user()->projects()
        ->with(['tasks:id,project_id,title,status'])
        ->get()
        ->map(function ($p) {
            $group = fn (string $status) => $p->tasks
                ->where('status', $status)
                ->values()
                ->map->only('id', 'title')
                ->all();

            return [
                'id'          => $p->id,
                'name'        => $p->name,
                'description' => $p->description,
                'tasks'       => [
                    'todo'       => $group('todo'),
                    'inprogress' => $group('inprogress'),
                    'review'     => $group('review'),
                    'done'       => $group('done'),
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
    Route::get('/billing',            [BillingController::class, 'show'])->name('billing.show');
    Route::post('/billing/checkout',  [BillingController::class, 'createCheckout'])->name('billing.checkout');
    Route::post('/billing/portal',    [BillingController::class, 'portal'])->name('billing.portal');
    Route::post('/billing/cancel',    [BillingController::class, 'cancel'])->name('billing.cancel');
    Route::post('/billing/resume',    [BillingController::class, 'resume'])->name('billing.resume');
});

/*
|--------------------------------------------------------------------------
| Profile / Projects / Tasks / Comments / Automations / Assistant
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {

    /* Profile */
    Route::get('/profile',    [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile',  [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    /* Projects */
    Route::get('/projects',        [ProjectController::class, 'index'])->name('projects.index');
    Route::get('/projects/create', [ProjectController::class, 'create'])->name('projects.create');
    Route::post('/projects',       [ProjectController::class, 'store'])->name('projects.store');

    // Single, canonical AI PDF endpoint
    Route::post('/projects/{project}/report', [ProjectController::class, 'generateReport'])
        ->name('projects.report.generate');

    // Edit/Update before show
    Route::get('/projects/{project}/edit', [ProjectController::class, 'edit'])->name('projects.edit');
    Route::patch('/projects/{project}',     [ProjectController::class, 'update'])->name('projects.update');

    // Show => redirect to tasks board
    Route::get('/projects/{project}', fn (Project $project) =>
        redirect()->route('tasks.index', $project)
    )->name('projects.show');

    Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');

    /* Nested project-scoped routes */
    Route::prefix('projects/{project}')->group(function () {

        /* TASKS: AI generator flow */
        Route::get('/tasks/ai', function (Request $request, Project $project) {
            return Inertia::render('Tasks/AITasksGenerator', [
                'project' => $project,
                'prefill' => $request->only(['count', 'prompt']),
            ]);
        })->name('tasks.ai.form');

        Route::post('/tasks/ai',         [TaskController::class, 'generateWithAI'])->name('tasks.ai.generate');
        Route::post('/tasks/ai/preview', [TaskController::class, 'previewWithAI'])->name('tasks.ai.preview');
        Route::post('/tasks/ai/accept',  [TaskController::class, 'acceptAIPreview'])->name('tasks.ai.accept');
        Route::post('/tasks/ai/reject',  [TaskController::class, 'rejectAIPreview'])->name('tasks.ai.reject');

        // Suggestions (GET)
        Route::get('/tasks/ai/suggestions', [TaskController::class, 'suggestionsAI'])->name('tasks.ai.suggestions');

        /* TASKS: CRUD */
        Route::get('/tasks',           [TaskController::class, 'index'])->name('tasks.index');
        Route::get('/tasks/{task}',    [TaskController::class, 'show'])->name('tasks.show');
        Route::post('/tasks',          [TaskController::class, 'store'])->name('tasks.store');
        Route::patch('/tasks/{task}',  [TaskController::class, 'update'])->name('tasks.update');
        Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');

        /* COMMENTS */
        Route::post('/tasks/{task}/comments',             [CommentController::class, 'store'])->name('comments.store');
        Route::patch('/tasks/{task}/comments/{comment}',  [CommentController::class, 'update'])->name('comments.update');
        Route::delete('/tasks/{task}/comments/{comment}', [CommentController::class, 'destroy'])->name('comments.destroy');

        /* TIMELINE */
        Route::get('/timeline', [TaskController::class, 'timeline'])->name('tasks.timeline');

        /* AUTOMATIONS */
        Route::get('/automations',                       [AutomationController::class, 'index'])->name('automations.index');
        Route::post('/automations',                      [AutomationController::class, 'store'])->name('automations.store');
        Route::patch('/automations/{automation}',        [AutomationController::class, 'update'])->name('automations.update');
        Route::delete('/automations/{automation}',       [AutomationController::class, 'destroy'])->name('automations.destroy');
        Route::patch('/automations/{automation}/toggle', [AutomationController::class, 'toggle'])->name('automations.toggle');
        Route::post('/automations/{automation}/test',    [AutomationController::class, 'test'])->name('automations.test');
        Route::post('/automations/{automation}/execute', [AutomationController::class, 'execute'])->name('automations.execute');
        Route::post('/automations/process',              [AutomationController::class, 'processProject'])->name('automations.process');

        /* PROJECT ASSISTANT */
        Route::post('/assistant/chat',        [ProjectAssistantController::class, 'chat'])->name('projects.assistant.chat');
        Route::get('/assistant/suggestions',  [ProjectAssistantController::class, 'suggestions'])->name('projects.assistant.suggestions');
        Route::get('/assistant/test',         [ProjectAssistantController::class, 'test'])->name('projects.assistant.test');
    });
});

/*
|--------------------------------------------------------------------------
| Breeze / Auth scaffolding
|--------------------------------------------------------------------------
*/
require __DIR__ . '/auth.php';
