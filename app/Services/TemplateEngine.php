<?php

namespace App\Services;

use App\Models\Automation;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class TemplateEngine
{
    /**
     * Replace template variables in text with actual values
     */
    public function replaceVariables(string $text, Automation $automation, array $context = []): string
    {
        // Log the original text for debugging
        Log::info('Template replacement input', [
            'text' => $text,
            'automation_id' => $automation->id,
            'context_keys' => array_keys($context),
        ]);

        // Build replacement data
        $data = $this->buildReplacementData($automation, $context);

        // Replace both {{variable}} and {variable} formats
        $result = $this->performReplacement($text, $data);

        Log::info('Template replacement output', [
            'original' => $text,
            'result' => $result,
            'replacements_made' => $text !== $result,
        ]);

        return $result;
    }

    /**
     * Build the data array for template replacement
     */
    private function buildReplacementData(Automation $automation, array $context = []): array
    {
        $data = [];

        // Basic automation data
        $data['automation'] = [
            'id' => $automation->id,
            'name' => $automation->name,
            'description' => $automation->description,
        ];

        // Project data
        if ($automation->project) {
            $data['project'] = [
                'id' => $automation->project->id,
                'name' => $automation->project->name,
                'description' => $automation->project->description,
                'status' => $automation->project->status,
                'tasks_count' => $automation->project->tasks()->count(),
                'completed_tasks_count' => $automation->project->tasks()->where('status', 'done')->count(),
            ];
        }

        // User data (project owner)
        if ($automation->project && $automation->project->user) {
            $user = $automation->project->user;
            $data['user'] = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'first_name' => explode(' ', $user->name)[0],
                'last_name' => count(explode(' ', $user->name)) > 1 ? explode(' ', $user->name)[1] : '',
            ];
        }

        // Task data from context
        if (isset($context['task']) && $context['task'] instanceof Task) {
            $task = $context['task'];
            $data['task'] = [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status,
                'priority' => $task->priority,
                'due_date' => $task->end_date ? Carbon::parse($task->end_date)->format('Y-m-d') : null,
                'due_date_formatted' => $task->end_date ? Carbon::parse($task->end_date)->format('M j, Y') : null,
                'created_at' => $task->created_at->format('Y-m-d H:i:s'),
                'created_at_formatted' => $task->created_at->format('M j, Y \a\t g:i A'),
                'updated_at' => $task->updated_at->format('Y-m-d H:i:s'),
                'updated_at_formatted' => $task->updated_at->format('M j, Y \a\t g:i A'),
            ];

            // Task assignee data
            if ($task->assignee_id && $task->assignee) {
                $data['task']['assignee'] = [
                    'id' => $task->assignee->id,
                    'name' => $task->assignee->name,
                    'email' => $task->assignee->email,
                ];
            }

            // Task creator data
            if ($task->creator_id && $task->creator) {
                $data['task']['creator'] = [
                    'id' => $task->creator->id,
                    'name' => $task->creator->name,
                    'email' => $task->creator->email,
                ];
            }
        }

        // Date/time data
        $now = Carbon::now();
        $data['date'] = [
            'now' => $now->format('Y-m-d H:i:s'),
            'today' => $now->format('Y-m-d'),
            'time' => $now->format('H:i:s'),
            'formatted' => $now->format('M j, Y \a\t g:i A'),
            'timestamp' => $now->timestamp,
        ];

        // Add direct current_date and current_time variables for easier access
        $data['current_date'] = $now->format('Y-m-d');
        $data['current_time'] = $now->format('H:i:s');
        $data['current_datetime'] = $now->format('Y-m-d H:i:s');

        // Merge any additional context data
        $data = array_merge_recursive($data, $context);

        return $data;
    }

    /**
     * Perform the actual template replacement
     */
    private function performReplacement(string $text, array $data): string
    {
        // Replace {{variable.property}} format
        $text = preg_replace_callback('/\{\{([^}]+)\}\}/', function ($matches) use ($data) {
            return $this->resolveVariable($matches[1], $data);
        }, $text);

        // Replace {variable} format for backward compatibility
        $text = preg_replace_callback('/\{([^}]+)\}/', function ($matches) use ($data) {
            $key = $matches[1];
            // Skip if it's a CSS property or already processed
            if (strpos($key, ':') !== false || strpos($key, '.') !== false) {
                return $matches[0];
            }

            return $this->resolveVariable($key, $data);
        }, $text);

        return $text;
    }

    /**
     * Resolve a variable path like "task.title" or "project.name"
     */
    private function resolveVariable(string $path, array $data): string
    {
        $parts = explode('.', $path);
        $value = $data;

        foreach ($parts as $part) {
            if (is_array($value) && isset($value[$part])) {
                $value = $value[$part];
            } else {
                // Variable not found, return original placeholder
                return '{{'.$path.'}}';
            }
        }

        return is_string($value) || is_numeric($value) ? (string) $value : '{{'.$path.'}}';
    }

    /**
     * Get available template variables for documentation/UI
     */
    public function getAvailableVariables(): array
    {
        return [
            'automation' => [
                'name' => 'Automation name',
                'description' => 'Automation description',
            ],
            'project' => [
                'name' => 'Project name',
                'description' => 'Project description',
                'status' => 'Project status',
                'tasks_count' => 'Total number of tasks',
                'completed_tasks_count' => 'Number of completed tasks',
            ],
            'task' => [
                'title' => 'Task title',
                'description' => 'Task description',
                'status' => 'Task status (todo, in_progress, done)',
                'priority' => 'Task priority (low, medium, high)',
                'due_date' => 'Task due date (YYYY-MM-DD)',
                'due_date_formatted' => 'Task due date (formatted)',
                'created_at_formatted' => 'Task creation date (formatted)',
                'updated_at_formatted' => 'Task update date (formatted)',
                'assignee.name' => 'Assigned user name',
                'assignee.email' => 'Assigned user email',
            ],
            'user' => [
                'name' => 'Project owner full name',
                'email' => 'Project owner email',
                'first_name' => 'Project owner first name',
                'last_name' => 'Project owner last name',
            ],
            'date' => [
                'today' => 'Current date (YYYY-MM-DD)',
                'time' => 'Current time (HH:MM:SS)',
                'formatted' => 'Current date and time (formatted)',
                'now' => 'Current timestamp',
            ],
        ];
    }
}
