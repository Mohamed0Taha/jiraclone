<?php

use Illuminate\Support\Facades\Route;

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
