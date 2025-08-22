<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;

// Check if taha.elfatih@gmail.com exists and is admin
$user = User::where('email', 'taha.elfatih@gmail.com')->first();

if ($user) {
    echo "User found: {$user->name} ({$user->email})\n";
    echo "Is admin: " . ($user->is_admin ? 'YES' : 'NO') . "\n";
    
    if (!$user->is_admin) {
        $user->update(['is_admin' => true]);
        echo "Updated user to admin!\n";
    }
} else {
    echo "User with email taha.elfatih@gmail.com not found.\n";
    echo "Available users:\n";
    User::all(['id', 'name', 'email', 'is_admin'])->each(function($u) {
        echo "- {$u->id}: {$u->name} ({$u->email}) - Admin: " . ($u->is_admin ? 'YES' : 'NO') . "\n";
    });
}

echo "\nTesting AdminController methods...\n";

// Test if the admin controller methods work
try {
    $controller = new \App\Http\Controllers\AdminController();
    echo "AdminController instantiated successfully\n";
    
    // Check if we can call a simple method
    $reflection = new ReflectionClass($controller);
    echo "Available methods: " . implode(', ', array_map(fn($m) => $m->getName(), $reflection->getMethods())) . "\n";
    
} catch (Exception $e) {
    echo "Error instantiating AdminController: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
