<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Automation Settings
    |--------------------------------------------------------------------------
    |
    | Configuration options for the automation system
    |
    */

    // Enable/disable automation processing
    'enabled' => env('AUTOMATIONS_ENABLED', true),

    // Default automation settings
    'defaults' => [
        'email' => [
            'from' => env('MAIL_FROM_ADDRESS', 'automations@yourapp.com'),
            'from_name' => env('MAIL_FROM_NAME', 'Automation Bot'),
        ],
        'slack' => [
            'webhook_url' => env('SLACK_WEBHOOK_URL'),
            'username' => 'Automation Bot',
            'channel' => '#general',
        ],
        'discord' => [
            'webhook_url' => env('DISCORD_WEBHOOK_URL'),
            'username' => 'Automation Bot',
        ],
    ],

    // Rate limiting for automation execution
    'rate_limits' => [
        'per_automation' => 60, // seconds between executions of the same automation
        'per_project' => 10,    // seconds between processing any automation in the same project
    ],

    // Retry settings for failed actions
    'retry' => [
        'max_attempts' => 3,
        'delay' => 30, // seconds
    ],

    // Supported trigger types
    'triggers' => [
        'Schedule' => [
            'name' => 'Schedule',
            'description' => 'Trigger based on time schedules (daily, weekly, hourly)',
            'config_schema' => [
                'frequency' => ['daily', 'weekly', 'hourly'],
                'time' => 'string', // HH:MM format
                'day_of_week' => 'integer', // 1-7 (Monday-Sunday)
            ],
        ],
        'Task Created' => [
            'name' => 'Task Created',
            'description' => 'Trigger when new tasks are created',
            'config_schema' => [
                'columns' => 'array', // specific columns/statuses
                'time_window' => 'integer', // minutes
            ],
        ],
        'Task Updated' => [
            'name' => 'Task Updated',
            'description' => 'Trigger when tasks are updated',
            'config_schema' => [
                'status_changes' => 'array',
                'time_window' => 'integer',
            ],
        ],
        'Task Due Date' => [
            'name' => 'Task Due Date',
            'description' => 'Trigger based on task due dates',
            'config_schema' => [
                'hours_before' => 'integer',
            ],
        ],
        'Task Priority' => [
            'name' => 'Task Priority',
            'description' => 'Trigger based on task priority and assignment status',
            'config_schema' => [
                'priority' => ['low', 'medium', 'high', 'urgent'],
                'hours_unassigned' => 'integer',
            ],
        ],
        'Project Status' => [
            'name' => 'Project Status',
            'description' => 'Trigger based on project completion status',
            'config_schema' => [
                'check_type' => ['completion_percentage', 'all_tasks_completed', 'overdue_tasks'],
                'threshold' => 'integer',
            ],
        ],
    ],

    // Supported action types
    'actions' => [
        'Email' => [
            'name' => 'Email',
            'description' => 'Send email notifications',
            'icon' => 'Email',
            'config_schema' => [
                'recipient' => 'string',
                'subject' => 'string',
                'message' => 'string',
            ],
        ],
        'Slack' => [
            'name' => 'Slack',
            'description' => 'Send Slack notifications',
            'icon' => 'Notifications',
            'config_schema' => [
                'webhook_url' => 'string',
                'message' => 'string',
                'channel' => 'string',
            ],
        ],
        'Discord' => [
            'name' => 'Discord',
            'description' => 'Send Discord notifications',
            'icon' => 'PowerSettingsNew',
            'config_schema' => [
                'webhook_url' => 'string',
                'message' => 'string',
            ],
        ],
        'Calendar' => [
            'name' => 'Calendar',
            'description' => 'Create calendar events',
            'icon' => 'CalendarMonth',
            'config_schema' => [
                'title' => 'string',
                'description' => 'string',
                'duration' => 'integer',
            ],
        ],
        'Webhook' => [
            'name' => 'Webhook',
            'description' => 'Send HTTP webhooks',
            'icon' => 'Settings',
            'config_schema' => [
                'url' => 'string',
                'method' => ['GET', 'POST', 'PUT', 'PATCH'],
                'payload' => 'array',
            ],
        ],
    ],

    // Available placeholders for messages
    'placeholders' => [
        '{project_name}' => 'Project name',
        '{automation_name}' => 'Automation name',
        '{task_title}' => 'Task title',
        '{task_assignee_email}' => 'Task assignee email',
        '{project_manager_email}' => 'Project manager email',
        '{stakeholder_email}' => 'Stakeholder email',
        '{date}' => 'Current date',
        '{time}' => 'Current time',
        '{datetime}' => 'Current date and time',
        '{tasks_completed_today}' => 'Number of tasks completed today',
        '{project_completion_percentage}' => 'Project completion percentage',
    ],
];
