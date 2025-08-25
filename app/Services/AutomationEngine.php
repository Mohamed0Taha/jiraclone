<?php

namespace App\Services;

use App\Mail\AutomationNotification;
use App\Models\Automation;
use App\Models\Project;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AutomationEngine
{
    protected TemplateEngine $templateEngine;

    public function __construct()
    {
        $this->templateEngine = new TemplateEngine;
    }

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
     * Process automations for a project with specific event context
     * This allows for more targeted automation execution and better deduplication
     */
    public function processProjectAutomationsWithContext(Project $project, string $eventType, int $taskId)
    {
        // Only process automations that match the event type
        $relevantTriggers = $this->getRelevantTriggersForEvent($eventType);

        $automations = $project->automations()
            ->where('is_active', true)
            ->whereIn('trigger', $relevantTriggers)
            ->get();

        Log::info("Found {$automations->count()} automations for event type '{$eventType}' in project {$project->id}");

        foreach ($automations as $automation) {
            try {
                // Pass the specific task context to help with deduplication
                $this->executeAutomationWithTaskContext($automation, $taskId);
            } catch (\Exception $e) {
                Log::error("Automation {$automation->id} failed: {$e->getMessage()}");
                $this->updateAutomationStats($automation, false);
            }
        }
    }

    /**
     * Get relevant trigger types for a given event
     */
    private function getRelevantTriggersForEvent(string $eventType): array
    {
        return match ($eventType) {
            'created' => ['task_created', 'Task Created'],
            'updated' => ['task_updated', 'Task Updated'],
            default => [] // No automations should run for unknown event types
        };
    }

    /**
     * Execute automation with specific task context for better deduplication
     */
    private function executeAutomationWithTaskContext(Automation $automation, int $taskId)
    {
        Log::info("Executing automation with task context: {$automation->name} (ID: {$automation->id}) for task {$taskId}");

        // Check cooldown period to prevent rapid re-execution
        if ($this->isInCooldownPeriod($automation)) {
            Log::info("Automation {$automation->id} is in cooldown period, skipping");

            return false;
        }

        // Load the specific task for context
        $task = Task::with(['assignee', 'creator', 'project'])->find($taskId);
        if (! $task) {
            Log::warning("Task {$taskId} not found for automation {$automation->id}");

            return false;
        }

        // Check if trigger conditions are met with the specific task context
        $triggerContext = $this->checkTriggerConditionsWithContext($automation, ['task' => $task]);
        if (! $triggerContext) {
            Log::info("Trigger conditions not met for automation: {$automation->name} with task {$taskId}");

            return false;
        }

        Log::info("Trigger conditions met for automation: {$automation->name}", ['context' => array_keys($triggerContext)]);

        // Execute all actions with trigger context
        $success = true;
        foreach ($automation->actions as $action) {
            Log::info("Executing action for automation {$automation->id}: ".json_encode($action));
            if (! $this->executeAction($action, $automation, $triggerContext)) {
                $success = false;
                Log::error("Action failed for automation {$automation->id}");
            }
        }

        // Update automation statistics
        $this->updateAutomationStats($automation, $success);

        return $success;
    }

    /**
     * Execute a specific automation
     */
    public function executeAutomation(Automation $automation)
    {
        Log::info("Executing automation: {$automation->name} (ID: {$automation->id})");

        // Check cooldown period to prevent rapid re-execution
        if ($this->isInCooldownPeriod($automation)) {
            Log::info("Automation {$automation->id} is in cooldown period, skipping");

            return false;
        }

        // Check if trigger conditions are met and get context
        $triggerContext = $this->checkTriggerConditionsWithContext($automation);
        if (! $triggerContext) {
            Log::info("Trigger conditions not met for automation: {$automation->name}");

            return false;
        }

        Log::info("Trigger conditions met for automation: {$automation->name}", ['context' => array_keys($triggerContext)]);

        // Execute all actions with trigger context
        $success = true;
        foreach ($automation->actions as $action) {
            Log::info("Executing action for automation {$automation->id}: ".json_encode($action));
            if (! $this->executeAction($action, $automation, $triggerContext)) {
                $success = false;
                Log::error("Action failed for automation {$automation->id}");
            }
        }

        // Update automation statistics
        $this->updateAutomationStats($automation, $success);

        return $success;
    }

    /**
     * Check if trigger conditions are met (backward compatibility)
     */
    private function checkTriggerConditions(Automation $automation): bool
    {
        return (bool) $this->checkTriggerConditionsWithContext($automation);
    }

    /**
     * Check if trigger conditions are met and return context data
     */
    private function checkTriggerConditionsWithContext(Automation $automation, array $providedContext = []): array|false
    {
        $trigger = $automation->trigger;
        $config = $automation->trigger_config;

        // If we have a provided task context, use it directly for task-based triggers
        if (isset($providedContext['task']) && in_array($trigger, ['task_created', 'Task Created', 'task_updated', 'Task Updated'])) {
            return $providedContext; // Use the specific task context
        }

        switch ($trigger) {
            case 'Schedule':
                return $this->checkScheduleTriggerWithContext($config, $automation);

            case 'Task Created':
            case 'task_created':
                return $this->checkTaskCreatedTriggerWithContext($config, $automation);

            case 'Task Updated':
            case 'task_updated':
                return $this->checkTaskUpdatedTriggerWithContext($config, $automation);

            case 'Task Due Date':
            case 'task_due_date':
                return $this->checkTaskDueDateTriggerWithContext($config, $automation);

            case 'Task Priority':
            case 'task_priority':
                return $this->checkTaskPriorityTriggerWithContext($config, $automation);

            case 'Project Status':
            case 'project_status':
                return $this->checkProjectStatusTriggerWithContext($config, $automation);

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
        return (bool) $this->checkScheduleTriggerWithContext($config, $automation);
    }

    /**
     * Schedule-based trigger with context
     */
    private function checkScheduleTriggerWithContext(array $config, Automation $automation): array|false
    {
        $frequency = $config['frequency'] ?? 'daily';
        $time = $config['time'] ?? '09:00';
        $lastRun = $automation->last_run_at;

        $now = Carbon::now();
        $scheduledTime = Carbon::today()->setTimeFromTimeString($time);

        switch ($frequency) {
            case 'daily':
                if (! $lastRun || $lastRun->lt($scheduledTime) && $now->gte($scheduledTime)) {
                    return ['schedule' => ['frequency' => 'daily', 'time' => $time, 'triggered_at' => $now]];
                }

                return false;

            case 'weekly':
                $dayOfWeek = $config['day_of_week'] ?? 1; // Monday
                $weeklyTime = Carbon::now()->startOfWeek()->addDays($dayOfWeek - 1)->setTimeFromTimeString($time);

                if (! $lastRun || $lastRun->lt($weeklyTime) && $now->gte($weeklyTime)) {
                    return ['schedule' => ['frequency' => 'weekly', 'day_of_week' => $dayOfWeek, 'time' => $time, 'triggered_at' => $now]];
                }

                return false;

            case 'hourly':
                $hourlyTime = Carbon::now()->startOfHour();
                if (! $lastRun || $lastRun->lt($hourlyTime)) {
                    return ['schedule' => ['frequency' => 'hourly', 'triggered_at' => $now]];
                }

                return false;

            default:
                return false;
        }
    }

    /**
     * Task created trigger
     */
    private function checkTaskCreatedTrigger(array $config, Automation $automation): bool
    {
        return (bool) $this->checkTaskCreatedTriggerWithContext($config, $automation);
    }

    /**
     * Task created trigger with context
     */
    private function checkTaskCreatedTriggerWithContext(array $config, Automation $automation): array|false
    {
        $columns = $config['columns'] ?? [];
        $timeWindow = $config['time_window'] ?? 5; // minutes

        $recentTasks = Task::where('project_id', $automation->project_id)
            ->where('created_at', '>=', Carbon::now()->subMinutes($timeWindow))
            ->orderBy('created_at', 'desc')
            ->get();

        if ($recentTasks->isEmpty()) {
            return false;
        }

        // If specific columns are configured, check if task is in those columns
        if (! empty($columns)) {
            $matchingTasks = $recentTasks->whereIn('status', $columns);
            if ($matchingTasks->isEmpty()) {
                return false;
            }
            // Use the most recent matching task
            $task = $matchingTasks->first();
        } else {
            // Use the most recent task
            $task = $recentTasks->first();
        }

        return ['task' => $task];
    }

    /**
     * Task due date trigger
     */
    private function checkTaskDueDateTrigger(array $config, Automation $automation): bool
    {
        return (bool) $this->checkTaskDueDateTriggerWithContext($config, $automation);
    }

    /**
     * Task due date trigger with context
     */
    private function checkTaskDueDateTriggerWithContext(array $config, Automation $automation): array|false
    {
        $hours = $config['hours_before'] ?? 24;
        $notificationTime = Carbon::now()->addHours($hours);

        $dueTasks = Task::where('project_id', $automation->project_id)
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [Carbon::now(), $notificationTime])
            ->orderBy('due_date', 'asc')
            ->get();

        if ($dueTasks->isEmpty()) {
            return false;
        }

        // Use the task with the earliest due date
        return ['task' => $dueTasks->first()];
    }

    /**
     * Task priority trigger
     */
    private function checkTaskPriorityTrigger(array $config, Automation $automation): bool
    {
        return (bool) $this->checkTaskPriorityTriggerWithContext($config, $automation);
    }

    /**
     * Task priority trigger with context
     */
    private function checkTaskPriorityTriggerWithContext(array $config, Automation $automation): array|false
    {
        $priority = $config['priority'] ?? 'high';
        $hoursUnassigned = $config['hours_unassigned'] ?? 2;

        $criticalTasks = Task::where('project_id', $automation->project_id)
            ->where('priority', $priority)
            ->whereNull('assigned_to')
            ->where('created_at', '<=', Carbon::now()->subHours($hoursUnassigned))
            ->orderBy('created_at', 'asc')
            ->get();

        if ($criticalTasks->isEmpty()) {
            return false;
        }

        // Use the oldest unassigned high priority task
        return ['task' => $criticalTasks->first()];
    }

    /**
     * Task updated trigger
     */
    private function checkTaskUpdatedTrigger(array $config, Automation $automation): bool
    {
        return (bool) $this->checkTaskUpdatedTriggerWithContext($config, $automation);
    }

    /**
     * Task updated trigger with context
     */
    private function checkTaskUpdatedTriggerWithContext(array $config, Automation $automation): array|false
    {
        $timeWindow = $config['time_window'] ?? 5; // minutes

        // Get recently updated tasks
        $recentlyUpdated = Task::where('project_id', $automation->project_id)
            ->where('updated_at', '>=', Carbon::now()->subMinutes($timeWindow))
            ->where('updated_at', '>', function ($query) {
                $query->select('created_at')
                    ->from('tasks as t2')
                    ->whereColumn('t2.id', 'tasks.id');
            })
            ->orderBy('updated_at', 'desc')
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
            $matchingTasks = $recentlyUpdated->filter(function ($task) use ($statusField, $targetStatus) {
                $taskStatus = $task->{$statusField} ?? '';

                return strtolower($taskStatus) === $targetStatus;
            });

            if ($matchingTasks->isEmpty()) {
                Log::info("No tasks with status '{$toStatus}' found for automation {$automation->id}");

                return false;
            }

            Log::info('Found '.$matchingTasks->count()." tasks with status '{$toStatus}' for automation {$automation->id}");

            // Use the most recently updated matching task
            return ['task' => $matchingTasks->first()];
        }

        // Fallback to old format
        $statusChanges = $config['status_changes'] ?? [];
        if (! empty($statusChanges)) {
            $matchingTasks = $recentlyUpdated->whereIn('status', $statusChanges);
            if ($matchingTasks->isEmpty()) {
                return false;
            }

            return ['task' => $matchingTasks->first()];
        }

        Log::info("Task updated trigger fired for automation {$automation->id} - ".$recentlyUpdated->count().' tasks updated');

        // Use the most recently updated task
        return ['task' => $recentlyUpdated->first()];
    }

    /**
     * Project status trigger
     */
    private function checkProjectStatusTrigger(array $config, Automation $automation): bool
    {
        return (bool) $this->checkProjectStatusTriggerWithContext($config, $automation);
    }

    /**
     * Project status trigger with context
     */
    private function checkProjectStatusTriggerWithContext(array $config, Automation $automation): array|false
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

                if ($completionPercentage >= $threshold) {
                    return [
                        'project' => $automation->project,
                        'completion_stats' => [
                            'total_tasks' => $totalTasks,
                            'completed_tasks' => $completedTasks,
                            'completion_percentage' => $completionPercentage,
                            'threshold' => $threshold,
                        ],
                    ];
                }

                return false;

            case 'all_tasks_completed':
                $incompleteTasks = Task::where('project_id', $automation->project_id)
                    ->whereNotIn('status', ['done', 'completed'])
                    ->count();

                if ($incompleteTasks === 0) {
                    return ['project' => $automation->project, 'all_tasks_completed' => true];
                }

                return false;

            case 'overdue_tasks':
                $overdueTasks = Task::where('project_id', $automation->project_id)
                    ->whereNotNull('due_date')
                    ->where('due_date', '<', Carbon::now())
                    ->whereNotIn('status', ['done', 'completed'])
                    ->get();

                if ($overdueTasks->isNotEmpty()) {
                    return [
                        'project' => $automation->project,
                        'overdue_tasks' => $overdueTasks,
                        'overdue_count' => $overdueTasks->count(),
                    ];
                }

                return false;

            default:
                return false;
        }
    }

    /**
     * Execute an action
     */
    private function executeAction(array $action, Automation $automation, array $context = []): bool
    {
        $type = $action['type'] ?? $action['name'];

        switch ($type) {
            case 'Email':
            case 'send_email': // Support both formats
                return $this->sendEmailAction($action, $automation, $context);

            case 'SMS':
            case 'sms':
            case 'send_sms':
            case 'twilio_sms': // Legacy support
                return $this->sendSMSAction($action, $automation, $context);

            case 'WhatsApp':
            case 'send_whatsapp':
                return $this->sendWhatsAppAction($action, $automation, $context);

            case 'Slack':
                return $this->sendSlackAction($action, $automation, $context);

            case 'Discord':
                return $this->sendDiscordAction($action, $automation, $context);

            case 'Calendar':
                return $this->createCalendarEventAction($action, $automation, $context);

            case 'Webhook':
                return $this->sendWebhookAction($action, $automation, $context);

            default:
                Log::warning("Unknown action type: {$type}");

                return false;
        }
    }

    /**
     * Send email action
     */
    private function sendEmailAction(array $action, Automation $automation, array $context = []): bool
    {
        try {
            // Handle both old and new config formats
            $config = $action['config'] ?? $action;

            $recipient = $config['to'] ?? $config['recipient'] ?? $automation->project->user->email;
            $subject = $config['subject'] ?? "Automation: {$automation->name}";
            $message = $config['body'] ?? $config['message'] ?? "Automation '{$automation->name}' has been triggered.";

            // Replace template variables using the new TemplateEngine
            $subject = $this->templateEngine->replaceVariables($subject, $automation, $context);
            $message = $this->templateEngine->replaceVariables($message, $automation, $context);

            Log::info("Attempting to send email for automation {$automation->id} to {$recipient} with subject: {$subject}");

            Mail::to($recipient)->send(new AutomationNotification($subject, $message));

            Log::info("Email sent successfully for automation {$automation->id} to {$recipient}");

            return true;
        } catch (\Exception $e) {
            Log::error("Failed to send email for automation {$automation->id}: {$e->getMessage()}");
            Log::error('Stack trace: '.$e->getTraceAsString());

            return false;
        }
    }

    /**
     * Send SMS action
     */
    private function sendSMSAction(array $action, Automation $automation, array $context = []): bool
    {
        try {
            $twilioService = app(TwilioService::class);

            // Handle both old and new config formats
            $config = $action['config'] ?? $action;

            $phoneNumber = $config['phone_number'] ?? $config['to'] ?? null;
            $message = $config['message'] ?? $config['body'] ?? "Automation '{$automation->name}' triggered for project '{$automation->project->name}'";

            if (! $phoneNumber) {
                Log::warning("SMS phone number not configured for automation {$automation->id}");

                return false;
            }

            // Replace template variables using the new TemplateEngine
            $message = $this->templateEngine->replaceVariables($message, $automation, $context);

            Log::info("Attempting to send SMS for automation {$automation->id} to {$phoneNumber}");

            // Pass automation data for tracking
            $options = [
                'automation_id' => $automation->id,
                'user_id' => $automation->user_id ?? null,
            ];

            $result = $twilioService->sendSMS($phoneNumber, $message, $options);

            if ($result['success']) {
                Log::info("SMS sent successfully for automation {$automation->id}. SID: {$result['message_sid']}");

                return true;
            } else {
                Log::error("Failed to send SMS for automation {$automation->id}: {$result['error']}");

                return false;
            }
        } catch (\Exception $e) {
            Log::error("SMS action failed for automation {$automation->id}: {$e->getMessage()}");

            return false;
        }
    }

    /**
     * Send WhatsApp action
     */
    private function sendWhatsAppAction(array $action, Automation $automation, array $context = []): bool
    {
        try {
            $twilioService = app(TwilioService::class);

            // Handle both old and new config formats
            $config = $action['config'] ?? $action;

            $phoneNumber = $config['phone_number'] ?? $config['to'] ?? null;
            $message = $config['message'] ?? $config['body'] ?? "🤖 Automation '{$automation->name}' triggered for project '{$automation->project->name}'";

            if (! $phoneNumber) {
                Log::warning("WhatsApp phone number not configured for automation {$automation->id}");

                return false;
            }

            // Replace template variables using the new TemplateEngine
            $message = $this->templateEngine->replaceVariables($message, $automation, $context);

            Log::info("Attempting to send WhatsApp message for automation {$automation->id} to {$phoneNumber}");

            $result = $twilioService->sendWhatsApp($phoneNumber, $message);

            if ($result['success']) {
                Log::info("WhatsApp message sent successfully for automation {$automation->id}. SID: {$result['sid']}");

                return true;
            } else {
                Log::error("Failed to send WhatsApp message for automation {$automation->id}: {$result['error']}");

                return false;
            }
        } catch (\Exception $e) {
            Log::error("WhatsApp action failed for automation {$automation->id}: {$e->getMessage()}");

            return false;
        }
    }

    /**
     * Send Slack notification
     */
    private function sendSlackAction(array $action, Automation $automation, array $context = []): bool
    {
        try {
            // Handle both old and new config formats
            $config = $action['config'] ?? $action;

            $webhookUrl = $config['webhook_url'] ?? config('services.slack.webhook_url');

            if (! $webhookUrl) {
                Log::warning("Slack webhook URL not configured for automation {$automation->id}");

                return false;
            }

            $message = $config['message'] ?? "🤖 Automation '{$automation->name}' triggered for project '{$automation->project->name}'";

            // Use TemplateEngine with context
            $message = $this->templateEngine->replaceVariables($message, $automation, $context);

            $channel = $config['channel'] ?? null;

            $payload = [
                'text' => $message,
                'username' => 'TaskPilot Bot',
                'icon_emoji' => ':robot_face:',
            ];

            if ($channel) {
                $payload['channel'] = $channel;
            }

            $response = Http::post($webhookUrl, $payload);

            if ($response->successful()) {
                Log::info("Slack notification sent for automation {$automation->id}");

                return true;
            } else {
                Log::error("Failed to send Slack notification for automation {$automation->id}: ".$response->body());

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
    private function sendDiscordAction(array $action, Automation $automation, array $context = []): bool
    {
        try {
            // Handle both old and new config formats
            $config = $action['config'] ?? $action;

            $webhookUrl = $config['webhook_url'] ?? config('services.discord.webhook_url');

            if (! $webhookUrl) {
                Log::warning("Discord webhook URL not configured for automation {$automation->id}");

                return false;
            }

            $message = $config['message'] ?? "🤖 Automation '{$automation->name}' triggered for project '{$automation->project->name}'";

            // Use TemplateEngine with context
            $message = $this->templateEngine->replaceVariables($message, $automation, $context);

            $payload = [
                'content' => $message,
                'username' => 'TaskPilot Bot',
                'avatar_url' => 'https://cdn.discordapp.com/attachments/123456789/robot.png',
            ];

            $response = Http::post($webhookUrl, $payload);

            if ($response->successful()) {
                Log::info("Discord notification sent for automation {$automation->id}");

                return true;
            } else {
                Log::error("Failed to send Discord notification for automation {$automation->id}: ".$response->body());

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
    private function createCalendarEventAction(array $action, Automation $automation, array $context = []): bool
    {
        try {
            // Handle both old and new config formats
            $config = $action['config'] ?? $action;

            $title = $config['title'] ?? "Automation Event: {$automation->name}";
            $description = $config['description'] ?? "Event created by automation '{$automation->name}' in project '{$automation->project->name}'";

            // Use TemplateEngine for variable replacement
            $title = $this->templateEngine->replaceVariables($title, $automation, $context);
            $description = $this->templateEngine->replaceVariables($description, $automation, $context);

            // This would integrate with Google Calendar, Outlook, etc.
            // For now, we'll just log it
            Log::info("Calendar event created for automation {$automation->id}: {$title} - {$description}");

            return true;
        } catch (\Exception $e) {
            Log::error("Calendar event creation failed for automation {$automation->id}: {$e->getMessage()}");

            return false;
        }
    }

    /**
     * Send webhook
     */
    private function sendWebhookAction(array $action, Automation $automation, array $context = []): bool
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
                'triggered_at' => Carbon::now()->toISOString(),
            ];

            // Apply template replacement to all string values in payload recursively
            $payload = $this->replacePayloadVariables($payload, $automation, $context);

            $response = Http::send($method, $url, ['json' => $payload]);

            if ($response->successful()) {
                Log::info("Webhook sent for automation {$automation->id} to {$url}");

                return true;
            } else {
                Log::error("Webhook failed for automation {$automation->id}: ".$response->body());

                return false;
            }
        } catch (\Exception $e) {
            Log::error("Webhook failed for automation {$automation->id}: {$e->getMessage()}");

            return false;
        }
    }

    /**
     * Apply template replacement to payload values recursively
     */
    private function replacePayloadVariables($payload, Automation $automation, array $context = []): array
    {
        if (is_array($payload)) {
            return array_map(function ($value) use ($automation, $context) {
                return $this->replacePayloadVariables($value, $automation, $context);
            }, $payload);
        } elseif (is_string($payload)) {
            return $this->templateEngine->replaceVariables($payload, $automation, $context);
        }

        return $payload;
    }

    /**
     * Replace placeholders in messages with template engine
     */
    private function replacePlaceholders(string $message, Automation $automation): string
    {
        // For now, we don't have context here, but the TemplateEngine will still
        // replace project, automation, user, and date variables
        return $this->templateEngine->replaceVariables($message, $automation, []);
    }

    /**
     * Check if automation is in cooldown period to prevent rapid re-execution
     */
    private function isInCooldownPeriod(Automation $automation): bool
    {
        if (! $automation->last_run_at) {
            return false; // Never run before, not in cooldown
        }

        // Get trigger-specific cooldown or fall back to default
        $triggerCooldowns = config('automations.trigger_cooldowns', []);
        $defaultCooldown = config('automations.cooldown_minutes', 5);

        $trigger = strtolower($automation->trigger);
        $cooldownMinutes = $triggerCooldowns[$trigger] ?? $defaultCooldown;

        // If cooldown is 0, never apply cooldown (useful for scheduled automations)
        if ($cooldownMinutes <= 0) {
            return false;
        }

        $cooldownEnds = $automation->last_run_at->addMinutes($cooldownMinutes);
        $isInCooldown = Carbon::now()->isBefore($cooldownEnds);

        if ($isInCooldown && config('automations.execution_tracking.enabled', true)) {
            $remainingMinutes = Carbon::now()->diffInMinutes($cooldownEnds, false);
            Log::info("Automation {$automation->id} is in cooldown for {$remainingMinutes} more minutes");
        }

        return $isInCooldown;
    }

    /**
     * Update automation statistics
     */
    private function updateAutomationStats(Automation $automation, bool $success): void
    {
        $automation->increment('runs_count');
        $automation->update(['last_run_at' => Carbon::now()]);

        // Log execution for debugging
        if (config('automations.execution_tracking.enabled', true)) {
            Log::info("Automation {$automation->id} executed. Run count: {$automation->runs_count}, Success: ".($success ? 'Yes' : 'No'));
        }

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
            'actions' => [],
        ];

        foreach ($automation->actions as $action) {
            $actionType = $action['type'] ?? $action['name'];
            $config = $action['config'] ?? $action;

            $actionResult = [
                'type' => $actionType,
                'config' => $config,
                'would_execute' => true,
                'validation' => [],
            ];

            // Add validation checks for different action types
            switch ($actionType) {
                case 'SMS':
                case 'send_sms':
                    if (empty($config['phone_number']) && empty($config['to'])) {
                        $actionResult['validation'][] = 'Phone number is required';
                        $actionResult['would_execute'] = false;
                    }
                    break;

                case 'WhatsApp':
                case 'send_whatsapp':
                    if (empty($config['phone_number']) && empty($config['to'])) {
                        $actionResult['validation'][] = 'Phone number is required';
                        $actionResult['would_execute'] = false;
                    }
                    break;

                case 'Email':
                case 'send_email':
                    if (empty($config['to']) && empty($config['recipient'])) {
                        $actionResult['validation'][] = 'Email recipient is required';
                        $actionResult['would_execute'] = false;
                    }
                    break;
            }

            $results['actions'][] = $actionResult;
        }

        return $results;
    }
}
