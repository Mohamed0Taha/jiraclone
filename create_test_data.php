<?php

require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;

// Create some additional test users with cancellation data
$testData = [
    ['name' => 'John Doe', 'email' => 'john@example.com', 'reason' => 'not_using_enough'],
    ['name' => 'Jane Smith', 'email' => 'jane@example.com', 'reason' => 'missing_features'],
    ['name' => 'Bob Wilson', 'email' => 'bob@example.com', 'reason' => 'technical_issues'],
    ['name' => 'Alice Brown', 'email' => 'alice@example.com', 'reason' => 'switching_service'],
    ['name' => 'Charlie Davis', 'email' => 'charlie@example.com', 'reason' => 'temporary_pause'],
    ['name' => 'Eva Martinez', 'email' => 'eva@example.com', 'reason' => 'too_expensive'],
];

foreach ($testData as $data) {
    $existingUser = User::where('email', $data['email'])->first();
    if (! $existingUser) {
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
            'cancellation_reason' => $data['reason'],
            'cancelled_at' => now()->subDays(rand(1, 45)),
        ]);
        echo "Created user: {$user->name} with reason: {$user->getCancellationReasonLabel()}\n";
    } else {
        $existingUser->update([
            'cancellation_reason' => $data['reason'],
            'cancelled_at' => now()->subDays(rand(1, 45)),
        ]);
        echo "Updated existing user: {$existingUser->name} with reason: {$existingUser->getCancellationReasonLabel()}\n";
    }
}

echo "\nTest data setup complete!\n";
