<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessAutomations;
use App\Models\Automation;
use App\Models\Project;
use App\Services\AutomationEngine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AutomationController extends Controller
{
    protected $automationEngine;

    public function __construct(AutomationEngine $automationEngine)
    {
        $this->automationEngine = $automationEngine;
    }

    public function index(Project $project)
    {
        $automations = $project->automations()
            ->latest()
            ->withCasts([
                'trigger_config' => 'array',
                'actions' => 'array',
            ])
            ->get()
            ->map(function ($automation) {
                return [
                    'id' => $automation->id,
                    'name' => $automation->name,
                    'description' => $automation->description,
                    'trigger' => $automation->trigger,
                    'trigger_config' => $automation->trigger_config,
                    'actions' => $automation->actions,
                    'is_active' => $automation->is_active,
                    'status' => $automation->is_active ? 'active' : 'paused',
                    'runs_count' => $automation->runs_count ?? 0,
                    'success_rate' => $automation->success_rate ?? 100,
                    'last_run_at' => $automation->last_run_at,
                    'created_at' => $automation->created_at,
                    'updated_at' => $automation->updated_at,
                ];
            });

        return Inertia::render('Automations/Index', [
            'project' => $project,
            'automations' => $automations,
            'quota' => [
                'used' => Auth::user()->getAutomationsCount(),
                'limit' => Auth::user()->getAutomationLimit(),
                'remaining' => Auth::user()->getRemainingAutomations(),
                'can_create' => Auth::user()->canCreateAutomations(),
                'plan' => Auth::user()->getCurrentPlan(),
            ],
        ]);
    }

    public function store(Request $request, Project $project)
    {
        $user = Auth::user();
        
        // Check automation quota
        if (!$user->canCreateAutomations()) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'You have reached your automation limit for your current plan.',
                    'quota_exceeded' => true,
                    'feature' => 'automation',
                    'current_count' => $user->getAutomationsCount(),
                    'limit' => $user->getAutomationLimit(),
                    'upgrade_url' => route('billing.show'),
                ], 403);
            }
            
            return redirect()
                ->back()
                ->with('error', 'You have reached your automation limit. Upgrade your plan to create more automations.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'trigger' => 'required|string',
            'trigger_config' => 'required|array',
            // Allow empty actions initially (user will add later in UI)
            'actions' => 'sometimes|array',
            'is_active' => 'boolean',
        ]);

        // Validate trigger config based on trigger type
        $this->validateTriggerConfig($validated['trigger'], $validated['trigger_config']);

        // Provide a safe default action array if missing / empty so creation does not fail
        if (! isset($validated['actions']) || empty($validated['actions'])) {
            $validated['actions'] = [[
                'id' => 'placeholder',
                'type' => 'noop',
                'name' => 'Placeholder Action',
                'note' => 'Auto-added placeholder. Edit this workflow to configure real actions.',
            ]];
        } else {
            $this->validateActions($validated['actions']);
        }

        $automation = $project->automations()->create([
            ...$validated,
            'runs_count' => 0,
            'success_rate' => 100.00,
        ]);

        Log::info("Automation created: {$automation->name} for project: {$project->name}");

        return redirect()
            ->route('automations.index', $project)
            ->with('success', 'Automation created successfully')
            ->with('automation', $automation);
    }

    public function update(Request $request, Project $project, Automation $automation)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'trigger' => 'required|string',
            'trigger_config' => 'required|array',
            'actions' => 'sometimes|array',
            'is_active' => 'boolean',
        ]);

        // Validate trigger config and actions (allow empty -> will keep existing or set placeholder)
        $this->validateTriggerConfig($validated['trigger'], $validated['trigger_config']);
        if (! isset($validated['actions']) || empty($validated['actions'])) {
            $validated['actions'] = $automation->actions ?: [[
                'id' => 'placeholder',
                'type' => 'noop',
                'name' => 'Placeholder Action',
                'note' => 'Auto-added placeholder. Edit this workflow to configure real actions.',
            ]];
        } else {
            $this->validateActions($validated['actions']);
        }

        $automation->update($validated);

        Log::info("Automation updated: {$automation->name}");

        return redirect()
            ->route('automations.index', $project)
            ->with('success', 'Automation updated successfully')
            ->with('automation', $automation);
    }

    public function destroy(Request $request, Project $project, Automation $automation)
    {
        $automationName = $automation->name;
        $automation->delete();

        Log::info("Automation deleted: {$automationName}");
        // If this is an Inertia request, respond with a redirect (required by Inertia)
        if ($request->header('X-Inertia')) {
            return redirect()
                ->route('automations.index', $project)
                ->with('success', 'Automation deleted successfully');
        }

        // Fallback for non-Inertia calls
        return response()->json([
            'success' => true,
            'message' => 'Automation deleted successfully',
        ]);
    }

    public function toggle(Request $request, Project $project, Automation $automation)
    {
        $automation->update([
            'is_active' => ! $automation->is_active,
        ]);

        Log::info("Automation toggled: {$automation->name} - ".($automation->is_active ? 'activated' : 'deactivated'));

        return response()->json([
            'success' => true,
            'message' => 'Automation status updated successfully',
            'automation' => $automation,
        ]);
    }

    public function test(Request $request, Project $project, Automation $automation)
    {
        try {
            $results = $this->automationEngine->testAutomation($automation);

            return response()->json([
                'success' => true,
                'message' => 'Automation test completed',
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            Log::error("Automation test failed: {$e->getMessage()}");

            return response()->json([
                'success' => false,
                'message' => 'Automation test failed: '.$e->getMessage(),
            ], 500);
        }
    }

    public function execute(Request $request, Project $project, Automation $automation)
    {
        try {
            $success = $this->automationEngine->executeAutomation($automation);

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Automation executed successfully' : 'Automation execution failed',
            ]);
        } catch (\Exception $e) {
            Log::error("Manual automation execution failed: {$e->getMessage()}");

            return response()->json([
                'success' => false,
                'message' => 'Automation execution failed: '.$e->getMessage(),
            ], 500);
        }
    }

    public function processProject(Project $project)
    {
        // Queue the automation processing job
        ProcessAutomations::dispatch($project);

        return response()->json([
            'success' => true,
            'message' => 'Automation processing queued for project',
        ]);
    }

    public function templates()
    {
        return response()->json([
            'templates' => $this->getWorkflowTemplates(),
        ]);
    }

    private function validateTriggerConfig(string $trigger, array $config): void
    {
        switch ($trigger) {
            case 'Schedule':
                if (! isset($config['frequency'])) {
                    throw new \InvalidArgumentException('Schedule trigger requires frequency');
                }
                break;
            case 'Task Created':
                // columns is optional
                break;
            case 'Task Due Date':
                if (! isset($config['hours_before'])) {
                    $config['hours_before'] = 24; // default
                }
                break;
            case 'Task Priority':
                if (! isset($config['priority'])) {
                    throw new \InvalidArgumentException('Task Priority trigger requires priority level');
                }
                break;
        }
    }

    private function validateActions(array $actions): void
    {
        foreach ($actions as $action) {
            if (! isset($action['type']) && ! isset($action['name'])) {
                throw new \InvalidArgumentException('Action must have a type or name');
            }

            $actionType = $action['type'] ?? $action['name'];

            switch ($actionType) {
                case 'Email':
                    if (! isset($action['subject']) || ! isset($action['message'])) {
                        throw new \InvalidArgumentException('Email action requires subject and message');
                    }
                    break;
                case 'Slack':
                case 'Discord':
                    if (! isset($action['message'])) {
                        throw new \InvalidArgumentException($actionType.' action requires message');
                    }
                    break;
                case 'Webhook':
                    if (! isset($action['url'])) {
                        throw new \InvalidArgumentException('Webhook action requires URL');
                    }
                    break;
            }
        }
    }

    private function getWorkflowTemplates(): array
    {
        return [
            [
                'id' => 'task-due-reminders',
                'name' => 'Task Due Date Reminders',
                'description' => 'Send email notifications 24 hours before tasks are due',
                'category' => 'notifications',
                'icon' => 'Schedule',
                'trigger' => 'Task Due Date',
                'trigger_config' => [
                    'hours_before' => 24,
                ],
                'actions' => [
                    [
                        'type' => 'Email',
                        'name' => 'Email',
                        'subject' => 'Task Due Reminder: {task_title}',
                        'message' => 'Hi! Just a reminder that your task "{task_title}" is due tomorrow. Don\'t forget to complete it on time!',
                        'recipient' => '{task_assignee_email}',
                    ],
                ],
            ],
            [
                'id' => 'new-task-notifications',
                'name' => 'New Task Notifications',
                'description' => 'Notify team via Slack when new tasks are created',
                'category' => 'notifications',
                'icon' => 'Add',
                'trigger' => 'Task Created',
                'trigger_config' => [
                    'columns' => [],
                    'time_window' => 5,
                ],
                'actions' => [
                    [
                        'type' => 'Slack',
                        'name' => 'Slack',
                        'message' => '🆕 New task created in {project_name}: "{task_title}"',
                        'webhook_url' => '',
                    ],
                ],
            ],
            [
                'id' => 'high-priority-escalation',
                'name' => 'High Priority Task Escalation',
                'description' => 'Auto-escalate high priority tasks that remain unassigned',
                'category' => 'escalation',
                'icon' => 'Rocket',
                'trigger' => 'Task Priority',
                'trigger_config' => [
                    'priority' => 'high',
                    'hours_unassigned' => 2,
                ],
                'actions' => [
                    [
                        'type' => 'Email',
                        'name' => 'Email',
                        'subject' => '🚨 High Priority Task Needs Attention',
                        'message' => 'A high priority task "{task_title}" has been unassigned for 2 hours. Please assign it immediately.',
                        'recipient' => '{project_manager_email}',
                    ],
                    [
                        'type' => 'Slack',
                        'name' => 'Slack',
                        'message' => '🚨 High priority task needs attention: "{task_title}" in {project_name}',
                        'webhook_url' => '',
                    ],
                ],
            ],
            [
                'id' => 'daily-progress-report',
                'name' => 'Daily Progress Report',
                'description' => 'Send daily summary of project progress to stakeholders',
                'category' => 'reporting',
                'icon' => 'Timeline',
                'trigger' => 'Schedule',
                'trigger_config' => [
                    'frequency' => 'daily',
                    'time' => '18:00',
                ],
                'actions' => [
                    [
                        'type' => 'Email',
                        'name' => 'Email',
                        'subject' => 'Daily Progress Report - {project_name}',
                        'message' => 'Here\'s your daily progress report for {project_name}:\n\nCompleted today: {tasks_completed_today}\nTotal progress: {project_completion_percentage}%\n\nKeep up the great work!',
                        'recipient' => '{stakeholder_email}',
                    ],
                ],
            ],
            [
                'id' => 'weekly-team-sync',
                'name' => 'Weekly Team Sync Reminder',
                'description' => 'Send weekly reminders for team sync meetings',
                'category' => 'meetings',
                'icon' => 'CalendarMonth',
                'trigger' => 'Schedule',
                'trigger_config' => [
                    'frequency' => 'weekly',
                    'day_of_week' => 1,
                    'time' => '09:00',
                ],
                'actions' => [
                    [
                        'type' => 'Calendar',
                        'name' => 'Calendar',
                        'title' => 'Weekly Team Sync - {project_name}',
                        'description' => 'Weekly sync meeting for project {project_name}',
                        'duration' => 60,
                    ],
                    [
                        'type' => 'Slack',
                        'name' => 'Slack',
                        'message' => '📅 Don\'t forget about today\'s team sync meeting for {project_name} at 9 AM!',
                        'webhook_url' => '',
                    ],
                ],
            ],
        ];
    }
}
