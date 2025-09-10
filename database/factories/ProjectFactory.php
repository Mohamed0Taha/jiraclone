<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->words(3, true);

        return [
            'user_id' => User::factory(),
            'name' => ucfirst($name),
            'key' => strtoupper(Str::substr(Str::slug($name, ''), 0, 6)),
            'description' => $this->faker->sentence(),
            'meta' => ['methodology' => 'kanban'],
            'start_date' => now()->subDays(rand(0, 10))->format('Y-m-d'),
            'end_date' => now()->addDays(rand(5, 30))->format('Y-m-d'),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
