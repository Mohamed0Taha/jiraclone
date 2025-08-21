<?php

// File: app/Services/ProjectAssistantConstants.php

namespace App\Services;

final class ProjectAssistantConstants
{
    public const SERVER_STATUSES = ['todo', 'inprogress', 'review', 'done'];

    public const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    public const METH_KANBAN = 'kanban';

    public const METH_SCRUM = 'scrum';

    public const METH_AGILE = 'agile';

    public const METH_WATERFALL = 'waterfall';

    public const METH_LEAN = 'lean';

    public const ENHANCED_ACTION_PATTERNS = [
        'find_task' => [
            '/\b(?:find|search|locate|show|get)\s+(?:task|tasks)\b/i',
            '/\b(?:which|what)\s+task\b/i',
            '/\btask\s+(?:by|with|from|created by|assigned to)\b/i',
        ],
        'project_info' => [
            '/\b(?:project|this project)\s+(?:info|details|summary|overview)\b/i',
            '/\bwhen\s+(?:was\s+)?(?:this\s+)?project\s+(?:created|started)\b/i',
            '/\bproject\s+(?:start|end|due)\s+date\b/i',
        ],
        'update_project' => [
            '/\b(?:update|change|modify|set)\s+project\b/i',
            '/\bproject\s+(?:name|title|description|due|start)\b/i',
        ],
    ];

    public const TASK_ID_PATTERNS = [
        'by_id' => '/\b(?:task\s+)?#?(\d+)\b/i',
        'by_assignee' => '/\b(?:task[s]?\s+)?(?:assigned\s+to|for|by)\s+([a-z0-9._@\-\s]+)\b/i',
        'by_creator' => '/\b(?:task[s]?\s+)?(?:created\s+by|from)\s+([a-z0-9._@\-\s]+)\b/i',
        'by_milestone' => '/\b(?:task[s]?\s+)?(?:in|from)\s+milestone\s+([a-z0-9._\-\s]+)\b/i',
        'by_status_combo' => '/\b([a-z\-\s]+)\s+(?:task[s]?\s+)?(?:assigned\s+to|for)\s+([a-z0-9._@\-\s]+)\b/i',
    ];
}
