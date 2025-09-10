<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $statuses = ['todo', 'inprogress', 'review', 'done'];
        $priorities = ['low', 'medium', 'high', 'urgent'];

        $start = now()->subDays(rand(0, 5));
        $end = (clone $start)->addDays(rand(3, 14));

        return [
            'project_id' => \App\Models\Project::factory(),
            'title' => $this->faker->sentence(4),
            'description' => $this->faker->paragraph(),
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $end->format('Y-m-d'),
            'creator_id' => \App\Models\User::factory(),
            'assignee_id' => rand(0, 1) ? \App\Models\User::factory() : null,
            'status' => $statuses[array_rand($statuses)],
            'priority' => $priorities[array_rand($priorities)],
            'milestone' => (bool) rand(0, 4) === 0,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
