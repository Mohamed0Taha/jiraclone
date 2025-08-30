<?php

namespace App\Providers;

use App\Models\Project;
use App\Models\Task;
use App\Models\VirtualProjectSimulation;
use App\Policies\ProjectPolicy;
use App\Policies\TaskPolicy;
use App\Policies\VirtualProjectSimulationPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     */
    protected $policies = [
        Project::class => ProjectPolicy::class,
        Task::class => TaskPolicy::class,
        VirtualProjectSimulation::class => VirtualProjectSimulationPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        //
    }
}
