<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

// Find user by email and make them admin
$email = 'taha.elfatih@gmail.com';
$user = User::where('email', $email)->first();

if ($user) {
    $user->update(['is_admin' => true]);
    echo "User {$user->name} ({$email}) has been made an admin!\n";
} else {
    echo "User with email {$email} not found.\n";
    // List all users
    echo "Available users:\n";
    User::all(['id', 'name', 'email'])->each(function($u) {
        echo "- {$u->id}: {$u->name} ({$u->email})\n";
    });
}
