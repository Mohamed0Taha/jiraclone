<?php

use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Inertia\Inertia;

use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;
use App\Models\Project;

/*
|--------------------------------------------------------------------------
| 🌐 Public Landing Page
|--------------------------------------------------------------------------
*/
Route::get('/', fn () => Inertia::render('Landing'))->name('landing');

/*
|--------------------------------------------------------------------------
| 🔐 Google OAuth
|--------------------------------------------------------------------------
*/
Route::get('/auth/google',          [GoogleController::class, 'redirectToGoogle'])->name('google.login');
Route::get('/auth/google/callback', [GoogleController::class, 'handleGoogleCallback']);

/*
|--------------------------------------------------------------------------
| 📊 Dashboard  (auth + verified)
|--------------------------------------------------------------------------
*/
Route::get('/dashboard', function (\Illuminate\Http\Request $request) {
    /* 1️⃣  Load every project with its tasks (id + title + status only) */
    $projects = $request->user()->projects()
        ->with(['tasks:id,project_id,title,status'])
        ->get()
        ->map(function ($p) {
            /* 2️⃣  Group tasks by status and cast to *real* arrays */
            $group = fn ($status) => $p->tasks
                ->where('status', $status)
                ->values()                    // Collection → Collection 0-based
                ->map->only('id', 'title')    // keep it light
                ->all();                      // 👈 Collection → array

            return [
                'id'          => $p->id,
                'name'        => $p->name,
                'description' => $p->description,
                'tasks'       => [
                    'todo'       => $group('todo'),
                    'inprogress' => $group('inprogress'),
                    'done'       => $group('done'),
                ],
            ];
        });

    return Inertia::render('Dashboard', ['projects' => $projects]);
})->middleware(['auth', 'verified'])->name('dashboard');


/*
|--------------------------------------------------------------------------
| 👤 Profile · 📁 Projects · 🗂 Tasks  (auth)
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

    /* 🔄 /projects/{id} → /projects/{id}/tasks */
    Route::get('/projects/{project}', fn (Project $project) =>
        redirect()->route('tasks.index', $project)
    )->name('projects.show');

    Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');

    /* Nested task routes */
    Route::prefix('projects/{project}')->group(function () {

        /* CRUD */
        Route::get('/tasks',           [TaskController::class, 'index'])->name('tasks.index');
        Route::post('/tasks',          [TaskController::class, 'store'])->name('tasks.store');
        Route::patch('/tasks/{task}',  [TaskController::class, 'update'])->name('tasks.update');
        Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');

        /* === AI generator flow === */

        /* Generator form — return prior values via ?count=&prompt= */
        Route::get('/tasks/ai', function (Request $request, Project $project) {
            return Inertia::render('Tasks/AITasksGenerator', [
                'project' => $project,
                'prefill' => $request->only(['count', 'prompt']), // 👈 keep previous inputs
            ]);
        })->name('tasks.ai.form');

        /* Original immediate-save route */
        Route::post('/tasks/ai', [TaskController::class, 'generateWithAI'])
             ->name('tasks.ai.generate');

        /* Preview first, then accept */
        Route::post('/tasks/ai/preview', [TaskController::class, 'previewWithAI'])
             ->name('tasks.ai.preview');
        Route::post('/tasks/ai/accept',  [TaskController::class, 'acceptGenerated'])
             ->name('tasks.ai.accept');
    });
});

/* old /login → landing */
Route::get('/login', fn () => redirect()->route('landing'));

/* Breeze auth routes */
require __DIR__.'/auth.php';
