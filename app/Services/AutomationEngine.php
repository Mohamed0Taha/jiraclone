<?php

namespace App\Services;

use App\Models\Automation;
use App\Models\Task;
use App\Models\Project;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;
use App\Mail\AutomationNotification;

class AutomationEngine
{
    /**
     * Process all active automations for a project
     */
    public function processProjectAutomations(Project $project)
    {
        $automations = $project->automations()->where('is_active', true)->get();
        
        foreach ($automations as $automation) {
            try {
                $this->executeAutomation($automation);
            } catch (\Exception $e) {
                Log::error("Automation {$automation->id} failed: {$e->getMessage()}");
                $this->updateAutomationStats($automation, false);
            }
        }
    }

    /**
     * Execute a specific automation
     */
    public function executeAutomation(Automation $automation)
    {
        Log::info("Executing automation: {$automation->name} (ID: {$automation->id})");

        // Check if trigger conditions are met
        if (!$this->checkTriggerConditions($automation)) {
            Log::info("Trigger conditions not met for automation: {$automation->name}");
            return false;
        }

        Log::info("Trigger conditions met for automation: {$automation->name}");

        // Execute all actions
        $success = true;
        foreach ($automation->actions as $action) {
            Log::info("Executing action for automation {$automation->id}: " . json_encode($action));
            if (!$this->executeAction($action, $automation)) {
                $success = false;
                Log::error("Action failed for automation {$automation->id}");
            }
        }

        // Update automation statistics
        $this->updateAutomationStats($automation, $success);

        return $success;
    }

    /**
     * Check if trigger conditions are met
     */
    private function checkTriggerConditions(Automation $automation): bool
    {
        $trigger = $automation->trigger;
        $config = $automation->trigger_config;

        switch ($trigger) {
            case 'Schedule':
                return $this->checkScheduleTrigger($config, $automation);
            
            case 'Task Created':
            case 'task_created':
                return $this->checkTaskCreatedTrigger($config, $automation);
            
            case 'Task Updated':
            case 'task_updated':
                return $this->checkTaskUpdatedTrigger($config, $automation);
            
            case 'Task Due Date':
            case 'task_due_date':
                return $this->checkTaskDueDateTrigger($config, $automation);
            
            case 'Task Priority':
            case 'task_priority':
                return $this->checkTaskPriorityTrigger($config, $automation);
            
            case 'Project Status':
            case 'project_status':
                return $this->checkProjectStatusTrigger($config, $automation);
            
            default:
                Log::warning("Unknown trigger type: {$trigger}");
                return false;
        }
    }

    /**
     * Schedule-based trigger (daily, weekly, etc.)
     */
    private function checkScheduleTrigger(array $config, Automation $automation): bool
    {
        $frequency = $config['frequency'] ?? 'daily';
        $time = $config['time'] ?? '09:00';
        $lastRun = $automation->last_run_at;

        $now = Carbon::now();
        $scheduledTime = Carbon::today()->setTimeFromTimeString($time);

        switch ($frequency) {
            case 'daily':
                return !$lastRun || $lastRun->lt($scheduledTime) && $now->gte($scheduledTime);
            
            case 'weekly':
                $dayOfWeek = $config['day_of_week'] ?? 1; // Monday
                $weeklyTime = Carbon::now()->startOfWeek()->addDays($dayOfWeek - 1)->setTimeFromTimeString($time);
                return !$lastRun || $lastRun->lt($weeklyTime) && $now->gte($weeklyTime);
            
            case 'hourly':
                $hourlyTime = Carbon::now()->startOfHour();
                return !$lastRun || $lastRun->lt($hourlyTime);
            
            default:
                return false;
        }
    }

    /**
     * Task created trigger
     */
    private function checkTaskCreatedTrigger(array $config, Automation $automation): bool
    {
        $columns = $config['columns'] ?? [];
        $timeWindow = $config['time_window'] ?? 5; // minutes

        $recentTasks = Task::where('project_id', $automation->project_id)
            ->where('created_at', '>=', Carbon::now()->subMinutes($timeWindow))
            ->get();

        if ($recentTasks->isEmpty()) {
            return false;
        }

        // If specific columns are configured, check if task is in those columns
        if (!empty($columns)) {
            return $recentTasks->whereIn('status', $columns)->isNotEmpty();
        }

        return true;
    }

    /**
     * Task due date trigger
     */
    private function checkTaskDueDateTrigger(array $config, Automation $automation): bool
    {
        $hours = $config['hours_before'] ?? 24;
        $notificationTime = Carbon::now()->addHours($hours);

        $dueTasks = Task::where('project_id', $automation->project_id)
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [Carbon::now(), $notificationTime])
            ->get();

        return $dueTasks->isNotEmpty();
    }

    /**
     * Task priority trigger
     */
    private function checkTaskPriorityTrigger(array $config, Automation $automation): bool
    {
        $priority = $config['priority'] ?? 'high';
        $hoursUnassigned = $config['hours_unassigned'] ?? 2;

        $criticalTasks = Task::where('project_id', $automation->project_id)
            ->where('priority', $priority)
            ->whereNull('assigned_to')
            ->where('created_at', '<=', Carbon::now()->subHours($hoursUnassigned))
            ->get();

        return $criticalTasks->isNotEmpty();
    }

    /**
     * Task updated trigger
     */
    private function checkTaskUpdatedTrigger(array $config, Automation $automation): bool
    {
        $timeWindow = $config['time_window'] ?? 5; // minutes
        
        // Get recently updated tasks
        $recentlyUpdated = Task::where('project_id', $automation->project_id)
            ->where('updated_at', '>=', Carbon::now()->subMinutes($timeWindow))
            ->where('updated_at', '>', function($query) {
                $query->select('created_at')
                      ->from('tasks as t2')
                      ->whereColumn('t2.id', 'tasks.id');
            })
            ->get();

        if ($recentlyUpdated->isEmpty()) {
            Log::info("No recently updated tasks found for automation {$automation->id}");
            return false;
        }

        // Check for specific status changes if configured
        $fromStatus = $config['from_status'] ?? null;
        $toStatus = $config['to_status'] ?? null;
        $field = $config['field'] ?? 'status';

        // If specific status transition is configured
        if ($toStatus && $toStatus !== 'Any') {
            $statusField = strtolower($field) === 'status' ? 'status' : $field;
            // Make status comparison case-insensitive
            $targetStatus = strtolower($toStatus);
            $matchingTasks = $recentlyUpdated->filter(function($task) use ($statusField, $targetStatus) {
                $taskStatus = $task->{$statusField} ?? '';
                return strtolower($taskStatus) === $targetStatus;
            });
            
            if ($matchingTasks->isEmpty()) {
                Log::info("No tasks with status '{$toStatus}' found for automation {$automation->id}");
                return false;
            }
            
            Log::info("Found " . $matchingTasks->count() . " tasks with status '{$toStatus}' for automation {$automation->id}");
            return true;
        }

        // Fallback to old format
        $statusChanges = $config['status_changes'] ?? [];
        if (!empty($statusChanges)) {
            return $recentlyUpdated->whereIn('status', $statusChanges)->isNotEmpty();
        }

        Log::info("Task updated trigger fired for automation {$automation->id} - " . $recentlyUpdated->count() . " tasks updated");
        return true;
    }

    /**
     * Project status trigger
     */
    private function checkProjectStatusTrigger(array $config, Automation $automation): bool
    {
        $targetStatus = $config['status'] ?? 'completed';
        $checkType = $config['check_type'] ?? 'completion_percentage';

        switch ($checkType) {
            case 'completion_percentage':
                $threshold = $config['threshold'] ?? 100;
                $totalTasks = Task::where('project_id', $automation->project_id)->count();
                
                if ($totalTasks === 0) {
                    return false;
                }

                $completedTasks = Task::where('project_id', $automation->project_id)
                    ->where('status', 'done')
                    ->count();

                $completionPercentage = ($completedTasks / $totalTasks) * 100;
                return $completionPercentage >= $threshold;

            case 'all_tasks_completed':
                $incompleteTasks = Task::where('project_id', $automation->project_id)
                    ->whereNotIn('status', ['done', 'completed'])
                    ->count();
                return $incompleteTasks === 0;

            case 'overdue_tasks':
                $overdueTasks = Task::where('project_id', $automation->project_id)
                    ->whereNotNull('due_date')
                    ->where('due_date', '<', Carbon::now())
                    ->whereNotIn('status', ['done', 'completed'])
                    ->count();
                return $overdueTasks > 0;

            default:
                return false;
        }
    }

    /**
     * Execute an action
     */
    private function executeAction(array $action, Automation $automation): bool
    {
        $type = $action['type'] ?? $action['name'];

        switch ($type) {
            case 'Email':
            case 'send_email': // Support both formats
                return $this->sendEmailAction($action, $automation);
            
            case 'Slack':
                return $this->sendSlackAction($action, $automation);
            
            case 'Discord':
                return $this->sendDiscordAction($action, $automation);
            
            case 'Calendar':
                return $this->createCalendarEventAction($action, $automation);
            
            case 'Webhook':
                return $this->sendWebhookAction($action, $automation);
            
            default:
                Log::warning("Unknown action type: {$type}");
                return false;
        }
    }

    /**
     * Send email action
     */
    private function sendEmailAction(array $action, Automation $automation): bool
    {
        try {
            // Handle both old and new config formats
            $config = $action['config'] ?? $action;
            
            $recipient = $config['to'] ?? $config['recipient'] ?? $automation->project->user->email;
            $subject = $config['subject'] ?? "Automation: {$automation->name}";
            $message = $config['body'] ?? $config['message'] ?? "Automation '{$automation->name}' has been triggered.";

            // Replace placeholders
            $message = $this->replacePlaceholders($message, $automation);

            Log::info("Attempting to send email for automation {$automation->id} to {$recipient} with subject: {$subject}");

            Mail::to($recipient)->send(new AutomationNotification($subject, $message));

            Log::info("Email sent successfully for automation {$automation->id} to {$recipient}");
            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send email for automation {$automation->id}: {$e->getMessage()}");
            Log::error("Stack trace: " . $e->getTraceAsString());
            return false;
        }
    }

    /**
     * Send Slack notification
     */
    private function sendSlackAction(array $action, Automation $automation): bool
    {
        try {
            $webhookUrl = $action['webhook_url'] ?? config('services.slack.webhook_url');
            
            if (!$webhookUrl) {
                Log::warning("Slack webhook URL not configured for automation {$automation->id}");
                return false;
            }

            $message = $action['message'] ?? "🤖 Automation '{$automation->name}' triggered for project '{$automation->project->name}'";
            $message = $this->replacePlaceholders($message, $automation);

            $payload = [
                'text' => $message,
                'username' => 'Automation Bot',
                'icon_emoji' => ':robot_face:'
            ];

            $response = Http::post($webhookUrl, $payload);

            if ($response->successful()) {
                Log::info("Slack notification sent for automation {$automation->id}");
                return true;
            } else {
                Log::error("Failed to send Slack notification for automation {$automation->id}: " . $response->body());
                return false;
            }
        } catch (\Exception $e) {
            Log::error("Slack notification failed for automation {$automation->id}: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Send Discord notification
     */
    private function sendDiscordAction(array $action, Automation $automation): bool
    {
        try {
            $webhookUrl = $action['webhook_url'] ?? config('services.discord.webhook_url');
            
            if (!$webhookUrl) {
                Log::warning("Discord webhook URL not configured for automation {$automation->id}");
                return false;
            }

            $message = $action['message'] ?? "🤖 Automation '{$automation->name}' triggered for project '{$automation->project->name}'";
            $message = $this->replacePlaceholders($message, $automation);

            $payload = [
                'content' => $message,
                'username' => 'Automation Bot'
            ];

            $response = Http::post($webhookUrl, $payload);

            if ($response->successful()) {
                Log::info("Discord notification sent for automation {$automation->id}");
                return true;
            } else {
                Log::error("Failed to send Discord notification for automation {$automation->id}: " . $response->body());
                return false;
            }
        } catch (\Exception $e) {
            Log::error("Discord notification failed for automation {$automation->id}: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Create calendar event
     */
    private function createCalendarEventAction(array $action, Automation $automation): bool
    {
        // This would integrate with Google Calendar, Outlook, etc.
        // For now, we'll just log it
        Log::info("Calendar event created for automation {$automation->id}");
        return true;
    }

    /**
     * Send webhook
     */
    private function sendWebhookAction(array $action, Automation $automation): bool
    {
        try {
            $url = $action['url'];
            $method = $action['method'] ?? 'POST';
            $payload = $action['payload'] ?? [];

            // Add automation context to payload
            $payload['automation'] = [
                'id' => $automation->id,
                'name' => $automation->name,
                'project' => $automation->project->name,
                'triggered_at' => Carbon::now()->toISOString()
            ];

            $response = Http::send($method, $url, ['json' => $payload]);

            if ($response->successful()) {
                Log::info("Webhook sent for automation {$automation->id} to {$url}");
                return true;
            } else {
                Log::error("Webhook failed for automation {$automation->id}: " . $response->body());
                return false;
            }
        } catch (\Exception $e) {
            Log::error("Webhook failed for automation {$automation->id}: {$e->getMessage()}");
            return false;
        }
    }

    /**
     * Replace placeholders in messages
     */
    private function replacePlaceholders(string $message, Automation $automation): string
    {
        $replacements = [
            '{project_name}' => $automation->project->name,
            '{automation_name}' => $automation->name,
            '{date}' => Carbon::now()->format('Y-m-d'),
            '{time}' => Carbon::now()->format('H:i:s'),
            '{datetime}' => Carbon::now()->format('Y-m-d H:i:s'),
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $message);
    }

    /**
     * Update automation statistics
     */
    private function updateAutomationStats(Automation $automation, bool $success): void
    {
        $automation->increment('runs_count');
        $automation->update(['last_run_at' => Carbon::now()]);

        // Update success rate
        if ($automation->runs_count > 0) {
            $successCount = $success ? 1 : 0;
            $totalSuccesses = ($automation->success_rate * ($automation->runs_count - 1) / 100) + $successCount;
            $newSuccessRate = ($totalSuccesses / $automation->runs_count) * 100;
            $automation->update(['success_rate' => $newSuccessRate]);
        }
    }

    /**
     * Test an automation without actually executing actions
     */
    public function testAutomation(Automation $automation): array
    {
        $results = [
            'trigger_check' => $this->checkTriggerConditions($automation),
            'actions' => []
        ];

        foreach ($automation->actions as $action) {
            $results['actions'][] = [
                'type' => $action['type'] ?? $action['name'],
                'config' => $action,
                'would_execute' => true
            ];
        }

        return $results;
    }
}
