<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Example user
        if (! \App\Models\User::where('email', 'test@example.com')->exists()) {
            User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);
        }
        // Prefer expanded PM question bank (100+ questions) for production readiness
        // Falls back to general bank if expanded seeder missing
        if (class_exists(ExpandedPMQuestionsSeeder::class)) {
            $this->call(ExpandedPMQuestionsSeeder::class);
        } else {
            $this->call(GeneralPMQuestionBankSeeder::class);
        }
    }
}
