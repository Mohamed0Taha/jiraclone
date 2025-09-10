<?php

namespace App\Services;

use App\Models\ConversationMessage;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;

/**
 * ConversationHistoryManager
 *
 * Enhanced conversation history management with intelligent context awareness.
 * Tracks project changes, maintains conversation context, and provides smart
 * context updates for better AI assistant performance.
 */
class ConversationHistoryManager
{
    private ProjectContextService $contextService;

    public function __construct(ProjectContextService $contextService)
    {
        $this->contextService = $contextService;
    }

    /**
     * Get conversation history with enhanced context
     */
    public function getHistoryWithContext(Project $project, ?string $sessionId = null): array
    {
        $sessionId = $sessionId ?: $this->getSessionId($project);
        $history = $this->getHistory($sessionId);

        // Ensure we always have the latest project context in history
        $this->ensureContextInHistory($history, $project);

        // Add conversation metadata for context awareness
        $this->addConversationMetadata($history, $project, $sessionId);

        return $history;
    }

    /**
     * Add a message to history with enhanced context tracking
     */
    public function addToHistory(Project $project, string $role, string $content, ?string $sessionId = null): void
    {
        $sessionId = $sessionId ?: $this->getSessionId($project);
        $history = $this->getHistory($sessionId);

        // Extract and track entities mentioned in the message
        $entities = $this->extractEntities($content, $project);

        // Add the message with enhanced metadata
        $message = [
            'role' => $role,
            'content' => $content,
            'timestamp' => now()->toIso8601String(),
            'entities' => $entities,
            'context_snapshot' => $this->getContextSnapshot($project),
        ];

        // Track project state changes if this was a command execution
        if ($role === 'assistant' && $this->looksLikeCommandResult($content)) {
            $message['command_result'] = true;
            $this->trackProjectStateChange($sessionId, $project);
        }

        $history[] = $message;

        // Smart history pruning - keep more recent and contextually relevant messages
        $history = $this->smartHistoryPruning($history, $project);

        // Ensure context is updated
        $this->ensureContextInHistory($history, $project);

        // Save history
        $this->saveHistory($sessionId, $history);
    }

    /**
     * Get formatted history for OpenAI with full context
     */
    public function getFormattedHistoryForOpenAI(Project $project, ?string $sessionId = null): array
    {
        $history = $this->getHistoryWithContext($project, $sessionId);

        // Get fresh project context
        $context = $this->contextService->getSanitizedContextForLLM($project, [
            'include_tasks' => true,
            'include_comments' => false,
            'task_limit' => null, // Get ALL tasks
        ]);

        // Format for OpenAI
        $formatted = [];

        // Always start with system context
        $formatted[] = [
            'role' => 'system',
            'content' => $this->getSystemContextMessage($context),
        ];

        // Add conversation messages (excluding old system messages)
        foreach ($history as $msg) {
            if (isset($msg['role']) && isset($msg['content'])) {
                if ($msg['role'] !== 'system' || strpos($msg['content'], 'PROJECT_CONTEXT:') === false) {
                    $formatted[] = [
                        'role' => $msg['role'],
                        'content' => $msg['content'],
                    ];
                }
            }
        }

        return $formatted;
    }

    /**
     * Clear conversation history
     */
    public function clearHistory(Project $project, ?string $sessionId = null): void
    {
        $sessionId = $sessionId ?: $this->getSessionId($project);
        Cache::forget("conversation_{$sessionId}");
        Session::forget("conversation_{$sessionId}");
    }

    /**
     * Ensure context is in history
     */
    private function ensureContextInHistory(array &$history, Project $project): void
    {
        // Get current context
        $context = $this->contextService->getSanitizedContextForLLM($project, [
            'include_tasks' => true,
            'include_comments' => false,
            'task_limit' => null,
        ]);

        // Remove old context messages
        $history = array_filter($history, function ($msg) {
            return ! isset($msg['role']) ||
                   $msg['role'] !== 'system' ||
                   strpos($msg['content'] ?? '', 'PROJECT_CONTEXT:') === false;
        });

        // Add fresh context as system message at the beginning
        array_unshift($history, [
            'role' => 'system',
            'content' => $this->getSystemContextMessage($context),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * Get system context message
     */
    private function getSystemContextMessage(array $context): string
    {
        $message = "PROJECT_CONTEXT: You have access to the following project and task data:\n\n";

        // Project summary
        if (isset($context['project'])) {
            $p = $context['project'];
            $message .= "PROJECT INFORMATION:\n";
            $message .= "- Name: {$p['name']}\n";
            $message .= "- ID: {$p['id']}\n";

            if (isset($p['owner'])) {
                $message .= "- Owner: {$p['owner']['name']} ({$p['owner']['email']})\n";
            }

            if (isset($p['members'])) {
                $message .= '- Team Members: '.count($p['members'])."\n";
            }

            if (isset($p['statistics'])) {
                $stats = $p['statistics'];
                $message .= "\nTASK STATISTICS:\n";
                $message .= "- Total Tasks: {$stats['total']}\n";
                $message .= '- By Status: '.json_encode($stats['by_status'])."\n";
                $message .= '- By Priority: '.json_encode($stats['by_priority'])."\n";
                $message .= "- Overdue: {$stats['overdue']}\n";
            }
        }

        // Task details
        if (isset($context['tasks']) && is_array($context['tasks'])) {
            $message .= "\nCOMPLETE TASK LIST:\n";
            foreach ($context['tasks'] as $task) {
                $assignee = isset($task['assignee']) ? $task['assignee']['name'] : 'Unassigned';
                $message .= "- Task #{$task['id']}: \"{$task['title']}\" ";
                $message .= "(Status: {$task['status']}, Priority: {$task['priority']}, ";
                $message .= "Assigned to: {$assignee}";

                if (isset($task['dates']['end_date']) && $task['dates']['end_date']) {
                    $message .= ", Due: {$task['dates']['end_date']}";
                }

                if (isset($task['is_overdue']) && $task['is_overdue']) {
                    $message .= ' - OVERDUE';
                }

                $message .= ")\n";
            }
        }

        $message .= "\n[END OF PROJECT CONTEXT - Use this data to answer questions about tasks, IDs, assignments, etc.]";

        return $message;
    }

    /**
     * Get session ID for project
     */
    private function getSessionId(Project $project): string
    {
        return "project_{$project->id}_".session()->getId();
    }

    /**
     * Get history from storage
     */
    private function getHistory(string $sessionId): array
    {
        // Try cache first
        if ($cached = Cache::get("conversation_{$sessionId}")) {
            return $cached;
        }

        // Load from persistent storage (limit last 100 stored messages for the project)
        $projectId = $this->extractProjectIdFromSessionKey($sessionId);
        if ($projectId) {
            $stored = ConversationMessage::where('project_id', $projectId)
                ->orderByDesc('id')
                ->limit(100)
                ->get()
                ->reverse()
                ->map(function ($m) {
                    return [
                        'role' => $m->role,
                        'content' => $m->content,
                        'timestamp' => $m->created_at?->toIso8601String(),
                        'persisted' => true,
                        'entities' => $m->metadata['entities'] ?? null,
                    ];
                })->values()->all();

            Cache::put("conversation_{$sessionId}", $stored, now()->addMinutes(10));

            return $stored;
        }

        // Fallback to session (legacy) if no project id found
        return Session::get("conversation_{$sessionId}", []);
    }

    /**
     * Save history to storage
     */
    private function saveHistory(string $sessionId, array $history): void
    {
        Cache::put("conversation_{$sessionId}", $history, now()->addHours(2));
        Session::put("conversation_{$sessionId}", $history);

        // Persist only the latest appended non-system message (avoid re-writing whole history)
        $last = end($history);
        if ($last && isset($last['role']) && in_array($last['role'], ['user', 'assistant'])) {
            $projectId = $this->extractProjectIdFromSessionKey($sessionId);
            if ($projectId) {
                try {
                    ConversationMessage::create([
                        'project_id' => $projectId,
                        'user_id' => $last['role'] === 'user' ? (Auth::id() ?: null) : null,
                        'role' => $last['role'],
                        'content' => $last['content'] ?? '',
                        'metadata' => [
                            'entities' => $last['entities'] ?? null,
                            'context_snapshot' => $last['context_snapshot'] ?? null,
                        ],
                    ]);
                } catch (\Throwable $e) {
                    Log::warning('[ConversationHistoryManager] Persist failed', ['error' => $e->getMessage()]);
                }
            }
        }
    }

    /**
     * Add conversation metadata for enhanced context awareness
     */
    private function addConversationMetadata(array &$history, Project $project, string $sessionId): void
    {
        // Track conversation patterns and context
        $lastMessages = array_slice($history, -5); // Last 5 messages

        // Check for follow-up questions or command sequences
        $hasRecentCommands = false;
        $recentTaskMentions = [];

        foreach ($lastMessages as $msg) {
            if (isset($msg['command_result']) && $msg['command_result']) {
                $hasRecentCommands = true;
            }
            if (isset($msg['entities']['task_ids'])) {
                $recentTaskMentions = array_merge($recentTaskMentions, $msg['entities']['task_ids']);
            }
        }

        // Store conversation metadata
        Cache::put("conversation_meta_{$sessionId}", [
            'has_recent_commands' => $hasRecentCommands,
            'recent_task_mentions' => array_unique($recentTaskMentions),
            'conversation_length' => count($history),
            'last_activity' => now()->toIso8601String(),
        ], now()->addHours(2));
    }

    /**
     * Extract entities (task IDs, user names, etc.) from content
     */
    private function extractEntities(string $content, Project $project): array
    {
        $entities = [
            'task_ids' => [],
            'user_mentions' => [],
            'status_mentions' => [],
            'priority_mentions' => [],
        ];

        // Extract task IDs (#123, task 123, etc.)
        if (preg_match_all('/#?(\d+)/', $content, $matches)) {
            $taskIds = array_map('intval', $matches[1]);
            // Verify these are actual task IDs in the project
            $validTaskIds = Task::where('project_id', $project->id)
                ->whereIn('id', $taskIds)
                ->pluck('id')
                ->toArray();
            $entities['task_ids'] = $validTaskIds;
        }

        // Extract user mentions
        if (preg_match_all('/@([a-z0-9._-]+)/i', $content, $matches)) {
            $entities['user_mentions'] = array_unique($matches[1]);
        }

        // Extract status mentions
        $statuses = ['todo', 'in progress', 'inprogress', 'review', 'done', 'completed'];
        foreach ($statuses as $status) {
            if (stripos($content, $status) !== false) {
                $entities['status_mentions'][] = $status;
            }
        }

        // Extract priority mentions
        $priorities = ['low', 'medium', 'high', 'urgent', 'critical'];
        foreach ($priorities as $priority) {
            if (stripos($content, $priority) !== false) {
                $entities['priority_mentions'][] = $priority;
            }
        }

        return array_filter($entities, fn ($arr) => ! empty($arr));
    }

    /**
     * Get a compact context snapshot for change tracking
     */
    private function getContextSnapshot(Project $project): array
    {
        $snapshot = $this->contextService->buildSnapshot($project);

        return [
            'total_tasks' => $snapshot['tasks']['total'],
            'by_status' => $snapshot['tasks']['by_status'],
            'overdue_count' => $snapshot['tasks']['overdue'],
            'timestamp' => now()->toIso8601String(),
        ];
    }

    /**
     * Check if content looks like a command execution result
     */
    private function looksLikeCommandResult(string $content): bool
    {
        $indicators = [
            '✅', '🗑️', '✏️', '⚡', '👤',  // Emoji indicators
            'created successfully', 'deleted', 'updated successfully',
            'assigned', 'moved', 'completed',
        ];

        foreach ($indicators as $indicator) {
            if (stripos($content, $indicator) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Track project state changes for context awareness
     */
    private function trackProjectStateChange(string $sessionId, Project $project): void
    {
        $previousSnapshot = Cache::get("project_snapshot_{$sessionId}");
        $currentSnapshot = $this->getContextSnapshot($project);

        if ($previousSnapshot) {
            $changes = $this->detectChanges($previousSnapshot, $currentSnapshot);
            if (! empty($changes)) {
                Cache::put("project_changes_{$sessionId}", $changes, now()->addHours(1));
                Log::info('[ConversationHistoryManager] Project state changed', [
                    'session_id' => $sessionId,
                    'project_id' => $project->id,
                    'changes' => $changes,
                ]);
            }
        }

        Cache::put("project_snapshot_{$sessionId}", $currentSnapshot, now()->addHours(2));
    }

    /**
     * Detect changes between snapshots
     */
    private function detectChanges(array $previous, array $current): array
    {
        $changes = [];

        // Detect task count changes
        if ($previous['total_tasks'] !== $current['total_tasks']) {
            $changes['total_tasks'] = [
                'from' => $previous['total_tasks'],
                'to' => $current['total_tasks'],
                'diff' => $current['total_tasks'] - $previous['total_tasks'],
            ];
        }

        // Detect status distribution changes
        foreach (['todo', 'inprogress', 'review', 'done'] as $status) {
            $prev = $previous['by_status'][$status] ?? 0;
            $curr = $current['by_status'][$status] ?? 0;
            if ($prev !== $curr) {
                $changes['status_changes'][$status] = [
                    'from' => $prev,
                    'to' => $curr,
                    'diff' => $curr - $prev,
                ];
            }
        }

        // Detect overdue changes
        if ($previous['overdue_count'] !== $current['overdue_count']) {
            $changes['overdue_count'] = [
                'from' => $previous['overdue_count'],
                'to' => $current['overdue_count'],
                'diff' => $current['overdue_count'] - $previous['overdue_count'],
            ];
        }

        return $changes;
    }

    /**
     * Smart history pruning that keeps contextually relevant messages
     */
    private function smartHistoryPruning(array $history, Project $project): array
    {
        // If under limit, keep everything
        if (count($history) <= 30) {
            return $history;
        }

        // Always keep system messages and recent messages
        $importantMessages = [];
        $recentMessages = array_slice($history, -20); // Always keep last 20

        // Keep messages with task mentions that still exist
        $currentTaskIds = Task::where('project_id', $project->id)->pluck('id')->toArray();

        foreach ($history as $msg) {
            $keep = false;

            // Keep if it's a system message
            if (isset($msg['role']) && $msg['role'] === 'system') {
                $keep = true;
            }

            // Keep if it mentions tasks that still exist
            if (isset($msg['entities']['task_ids'])) {
                $relevantTaskIds = array_intersect($msg['entities']['task_ids'], $currentTaskIds);
                if (! empty($relevantTaskIds)) {
                    $keep = true;
                }
            }

            // Keep if it's a command result
            if (isset($msg['command_result']) && $msg['command_result']) {
                $keep = true;
            }

            // Keep if it's recent
            if (in_array($msg, $recentMessages)) {
                $keep = true;
            }

            if ($keep) {
                $importantMessages[] = $msg;
            }
        }

        // Ensure we don't exceed reasonable limits
        if (count($importantMessages) > 50) {
            $importantMessages = array_slice($importantMessages, -50);
        }

        return $importantMessages;
    }

    private function extractProjectIdFromSessionKey(string $sessionId): ?int
    {
        if (preg_match('/project_(\d+)_/', $sessionId, $m)) {
            return (int) $m[1];
        }

        return null;
    }

    /**
     * Get conversation insights for debugging
     */
    public function getConversationInsights(Project $project, ?string $sessionId = null): array
    {
        $sessionId = $sessionId ?: $this->getSessionId($project);

        return [
            'metadata' => Cache::get("conversation_meta_{$sessionId}", []),
            'recent_changes' => Cache::get("project_changes_{$sessionId}", []),
            'current_snapshot' => Cache::get("project_snapshot_{$sessionId}", []),
            'history_length' => count($this->getHistory($sessionId)),
        ];
    }
}
