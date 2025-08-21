<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'app' => [
                'name' => config('app.name'),
                'url' => rtrim(config('app.url'), '/'),
            ],
            'auth' => [
                'user' => $request->user() ? array_merge(
                    $request->user()->only(['id', 'name', 'email', 'email_verified_at']),
                    [
                        'has_active_subscription' => $request->user()->hasActiveSubscription(),
                        'current_plan' => $request->user()->getCurrentPlan(),
                        'on_trial' => $request->user()->onTrial('default'),
                        'ai_task_limit' => $request->user()->getAiTaskLimit(),
                        'ai_tasks_used' => $request->user()->ai_tasks_used ?? 0,
                        'ai_tasks_remaining' => $request->user()->getRemainingAiTasks(),
                    ]
                ) : null,
            ],
        ];
    }
}
