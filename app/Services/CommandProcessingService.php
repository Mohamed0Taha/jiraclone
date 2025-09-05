<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Throwable;

class CommandProcessingService
{
    private OpenAIService $openAIService;

    private ProjectContextService $contextService;

    private TaskGeneratorService $taskGenerator;

    private const SERVER_STATUSES = ['todo', 'inprogress', 'review', 'done'];

    private const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    public function __construct(
        OpenAIService $openAIService,
        ProjectContextService $contextService,
        TaskGeneratorService $taskGenerator
    ) {
        $this->openAIService = $openAIService;
        $this->contextService = $contextService;
        $this->taskGenerator = $taskGenerator;
    }

    public function generatePlan(Project $project, string $message, array $history, array $llmPlan = []): array
    {
        $plan = [];

        $mLow = strtolower(trim($message));
        // Direct weekly progress shortcut: treat as informational (no mutation) and delegate to Q&A service
        if (preg_match('/\b(weekly|week)\b.*\b(progress|report|summary)\b/', $mLow) || str_contains($mLow, 'weekly progress')) {
            try {
                if (class_exists(QuestionAnsweringService::class)) {
                    $qas = app(QuestionAnsweringService::class);
                    $report = $qas->answer($project, 'Weekly progress report', [], null);
                    return [
                        'preview_message' => $report,
                        'command_data' => null, // informational only
                    ];
                }
            } catch (\Throwable $e) {
                // fall through to normal planning if something goes wrong
            }
        }

        if (! empty($llmPlan['type'])) {
            $normalizedPlan = $this->normalizeLLMPlan($project, $llmPlan);
            if ($this->validatePlan($project, $normalizedPlan)['_ok']) {
                $plan = $normalizedPlan;
            }
        }

        if (empty($plan)) {
            $plan = $this->compileActionPlanEnhanced($project, $message, $history);
        }

        $validation = $this->validatePlan($project, $plan);
        if (! $validation['_ok']) {
            if (empty($plan['_error'])) {
                try {
                    $repaired = $this->llmRepairPlan($project, $message, $history, $plan, $validation['_why']);
                    $reVal = $this->validatePlan($project, $repaired);
                    if ($reVal['_ok']) {
                        $plan = $repaired;
                    } else {
                        return ['preview_message' => $validation['_why'], 'command_data' => null];
                    }
                } catch (Throwable $e) {
                    return ['preview_message' => $validation['_why'], 'command_data' => null];
                }
            } else {
                return ['preview_message' => $plan['_error'], 'command_data' => null];
            }
        }

        $methodology = $this->contextService->getCurrentMethodology($project);
        $preview = $this->preview($project, $plan, $methodology);

        return ['preview_message' => $preview, 'command_data' => $plan];
    }

    private function compileActionPlanEnhanced(Project $project, string $message, array $history = []): array
    {
        $m = trim($message);
        $mLow = strtolower($m);

        $ordinal = $this->parseOrdinalWindow($mLow);
        if ($ordinal) {
            $updates = $this->parseBulkUpdates($project, $mLow);
            if (! empty($updates)) {
                $plan = $this->createBulkUpdatePlan(['all' => true], $updates);
                $plan['filters'] = array_merge($plan['filters'], $ordinal);

                return $plan;
            }
        }

        if (preg_match('/\bmove\s+(?:all\s+)?tasks?\s+(?:to|into)\s+(?:the\s+)?(first|second|third|fourth)\s+(?:stage|column|phase)\b/i', $mLow, $mm)) {
            $status = $this->nthStageToStatus(strtolower($mm[1]));
            if ($status) {
                return $this->createBulkUpdatePlan(['all' => true], ['status' => $status]);
            }
        }

        // Check for bulk task creation commands (create X tasks, generate tasks, etc.)
        if ($this->isBulkTaskCreationCommand($m)) {
            return $this->parseBulkTaskCreationCommand($project, $message);
        }

        if (preg_match('/\b(?:create|add|new|make)\s+(?:a\s+)?(?:new\s+)?task\s+(?:called\s+|named\s+|titled\s+)?["\']?(.+?)["\']?$/i', $m, $matches)) {
            $title = trim($matches[1]);
            if ($title !== '') {
                return $this->createTaskPlan($title);
            }
        }

        if (preg_match('/\b(?:delete|remove|destroy|purge|drop)\b/i', $m)) {
            Log::debug('[CommandProcessingService] Delete command detected', ['message' => $m]);

            return $this->parseDeleteCommand($project, $m);
        }

        if (preg_match('/#?(\d+)/', $m, $idMatch)) {
            $taskId = (int) $idMatch[1];
            $updates = $this->parseTaskUpdates($project, $m, $taskId);
            if (! empty($updates)) {
                return $this->createTaskUpdatePlan($taskId, $updates);
            }
        }

        $filters = $this->parseFiltersEnhanced($project, $m);
        $updates = $this->parseBulkUpdates($project, $m);

        if (! empty($updates)) {
            Log::debug('[CommandProcessingService] bulk updates parsed', ['updates' => $updates, 'filters_before' => $filters]);
            if (empty($filters)) {
                $filters = ['all' => true];
            }
            Log::debug('[CommandProcessingService] returning bulk_update plan', ['filters_after' => $filters]);
            if ($ordinal) {
                $filters = array_merge($filters, $ordinal);
            }

            return $this->createBulkUpdatePlan($filters, $updates);
        }

        if (preg_match('/\bassign\b.*?\bto\s+([a-z0-9._@\- ]+)/i', $m, $matches)) {
            $plan = $this->parseAssignCommand($project, $m, $matches[1]);
            if ($ordinal) {
                $plan['filters'] = array_merge($plan['filters'] ?? [], $ordinal);
            }

            return $plan;
        }

        // Pronoun / implicit reference handling for assignment
        if (preg_match('/\bassign\b.*\b(all\s+of\s+)?(them|these|those)\b.*\bto\s+(me|myself|owner)\b/i', $mLow) ||
            preg_match('/\bassign\b.*\b(to\s+me|to\s+myself|to\s+owner)\b/i', $mLow)) {
            $assignee = (str_contains($mLow, 'owner')) ? '__OWNER__' : '__ME__';
            return [
                'type' => 'bulk_assign',
                'filters' => ['all' => true],
                'assignee' => $assignee,
            ];
        }

        // Pronoun based bulk status change e.g. "move them to done" or "mark all of them as in progress"
        if (preg_match('/\b(move|set|mark)\b.*\b(all\s+of\s+)?(them|these|those)\b.*\b(to|as)\s+([a-z\- ]{3,20})/i', $mLow, $pm)) {
            if ($status = $this->resolveStatusToken($project, $pm[5])) {
                return $this->createBulkUpdatePlan(['all' => true], ['status' => $status]);
            }
        }

        // If no basic patterns matched, try enhanced LLM synthesis
        return $this->enhancedLLMSynthesis($project, $message, $history);
    }

    /**
     * Determine if the recent assistant response contained an explicit list of tasks (IDs or bullet list)
     */
    private function historyRecentlyListedTasks(array $history, ?Project $project = null): bool
    {
        $recent = array_slice($history, -8); // look a little further back
        foreach ($recent as $h) {
            $c = strtolower($h['content'] ?? '');
            // Look for our deterministic listing markers
            if (str_contains($c, 'task #') || preg_match('/#\d+/', $c)) {
                return true;
            }
            if (str_contains($c, 'task assignments') || (preg_match('/found\s+\d+\s+tasks?/i', $c))) {
                return true;
            }
        }
        // Fallback: if there are tasks in the project we can still treat pronoun commands as global scope
        if ($project && Task::where('project_id', $project->id)->exists()) {
            return true;
        }
        return false;
    }

    private function parseTaskUpdates(Project $project, string $message, int $taskId): array
    {
        $updates = [];
        $m = strtolower($message);

        if (preg_match('/\bpriority\b/i', $m) && preg_match('/\b(low|medium|high|urgent|critical|blocker|p[0-3])\b/i', $m, $matches)) {
            if ($priority = $this->resolvePriorityToken($matches[1])) {
                $updates['priority'] = $priority;
            }
        }

        if (preg_match('/\b(?:move|set|mark|status)\b.*?\b(?:to|in|as)\s+([a-z\- ]+)\b/i', $m, $matches)) {
            if ($status = $this->resolveStatusToken($project, $matches[1])) {
                $updates['status'] = $status;
            }
        }

        if (preg_match('/\bassign\b.*?\bto\s+([a-z0-9._@\- ]+)/i', $m, $matches)) {
            $updates['assignee_hint'] = trim($matches[1]);
        }

        // Enhanced date parsing - due date, deadline, end date
        if (preg_match('/\b(?:due|deadline|end\s+date)\s+(?:on|by|at|to|for)?\s*(.+?)(?:\s|$)/i', $message, $matches)) {
            if ($date = $this->parseRelativeDate($matches[1])) {
                $updates['end_date'] = $date->toDateString();
            }
        }

        // Change/set/update end date patterns
        if (preg_match('/\b(?:change|set|update)\s+(?:the\s+)?end\s+date\s+(?:for\s+task\s+#?\d+\s+)?(?:to|as)\s+(.+?)(?:\s|$)/i', $message, $matches)) {
            if ($date = $this->parseRelativeDate($matches[1])) {
                $updates['end_date'] = $date->toDateString();
            }
        }

        if (preg_match('/\b(?:title|rename|set\s+title)\b.*?"([^"]+)"/i', $m, $matches)) {
            $updates['title'] = trim($matches[1]);
        }

        // Enhanced description parsing
        if (preg_match('/\b(?:update|set|change)\s+(?:the\s+)?description\s+(?:of\s+task\s+#?\d+\s+)?(?:to|as)\s+["\'](.+?)["\']$/i', $message, $matches)) {
            $updates['description'] = trim($matches[1]);
        } elseif (preg_match('/\bdescription\s+(?:to|as)\s+["\'](.+?)["\']$/i', $message, $matches)) {
            $updates['description'] = trim($matches[1]);
        } elseif (preg_match('/\b(?:set|update)\s+description[:\s]+["\'](.+?)["\']$/i', $message, $matches)) {
            $updates['description'] = trim($matches[1]);
        }

        return $updates;
    }

    private function parseBulkUpdates(Project $project, string $message): array
    {
        $updates = [];
        $m = strtolower($message);

        if (preg_match('/\bmove\s+.*?\bto\s+([a-z\- ]+)/i', $m, $matches)) {
            if ($toStatus = $this->resolveStatusToken($project, end($matches))) {
                $updates['status'] = $toStatus;
            }
        }

        if (preg_match('/\b(?:set|change|update)\s+(?:all\s+)?priority\s+(?:to|as)\s+(low|medium|high|urgent)\b/i', $m, $matches)) {
            if ($priority = $this->resolvePriorityToken($matches[1])) {
                $updates['priority'] = $priority;
            }
        }

        // Bulk due date updates e.g. "update due date for medium priority to next Friday"
        if (preg_match('/\b(update|set|change)\b.*\b(due|end|deadline)(?:\s+date)?\b.*\bto\s+([^\.]+)$/i', $message, $dm)) {
            $rawDate = trim($dm[3]);
            if ($date = $this->parseRelativeDate($rawDate)) {
                $updates['end_date'] = $date->toDateString();
            }
        }

        return $updates;
    }

    private function parseFiltersEnhanced(Project $project, string $message): array
    {
        $filters = [];
        $m = strtolower($message);

        if (preg_match_all('/#(\d+)/', $message, $matches)) {
            $filters['ids'] = array_map('intval', $matches[1]);
        }
    if (preg_match('/\b(low|medium|high|urgent)\s+priority\b/i', $m, $matches) || preg_match('/\bfor\s+(low|medium|high|urgent)\s+priority\b/i', $m, $matches)) {
            $filters['priority'] = $this->resolvePriorityToken($matches[1]);
        }
        // Also catch patterns like 'urgent tasks', 'high task', etc.
        elseif (preg_match('/\b(low|medium|high|urgent)\b\s+tasks?/i', $m, $matches)) {
            $filters['priority'] = $this->resolvePriorityToken($matches[1]);
        }
        // Explicit 'status is X'
        if (preg_match('/\bstatus\s+(?:is\s+)?([a-z\- ]+)/i', $m, $matches)) {
            $filters['status'] = $this->resolveStatusToken($project, $matches[1]);
        }
        // Natural language pattern e.g. 'todo tasks', 'in progress tasks', 'review task', 'done tasks'
        elseif (preg_match('/\b(todo|in\s?progress|review|done)\b\s+tasks?\b/i', $m, $sm)) {
            $filters['status'] = $this->resolveStatusToken($project, $sm[1]);
        }
        if (strpos($m, 'overdue') !== false) {
            $filters['overdue'] = true;
        }
        if (strpos($m, 'unassigned') !== false) {
            $filters['unassigned'] = true;
        }

        if (preg_match('/\b(my|me)\b/i', $m)) {
            $filters['assigned_to_hint'] = '__ME__';
        }
        if (preg_match("/\bowner'?s\b/i", $m)) {
            $filters['assigned_to_hint'] = '__OWNER__';
        }
        if (preg_match("/\b([A-Za-z]+)'s\s+tasks\b/u", $message, $mm)) {
            $filters['assigned_to_hint'] = trim($mm[1]);
        }
        if (preg_match('/\bfor\s+(@?[a-z0-9._\-]{2,40})\b(?!\s+priority)/i', $m, $mm)) {
            $filters['assigned_to_hint'] = ltrim(trim($mm[1]), '@');
        }
        if (preg_match('/\ball\s+tasks?\b/i', $m)) {
            $filters['all'] = true;
        }

        // If we accidentally captured a phrase containing 'priority' as an assignee hint, discard it
        if (! empty($filters['assigned_to_hint']) && str_contains($filters['assigned_to_hint'], 'priority')) {
            unset($filters['assigned_to_hint']);
        }

        return $filters;
    }

    private function parseDeleteCommand(Project $project, string $message): array
    {
        Log::debug('[CommandProcessingService] parseDeleteCommand', ['message' => $message]);
        $m = strtolower($message);

        // Check for task ID patterns like "#230", "230", "id 230", "task 230", "task with id 230"
        if (preg_match('/#?(\d+)/', $message, $matches) ||
            preg_match('/\b(?:task|id)\s+(?:with\s+id\s+|#?)(\d+)/i', $message, $matches) ||
            preg_match('/\b(?:the\s+)?(?:task\s+)?(?:with\s+)?(?:id\s+)?(\d+)\b/i', $message, $matches)) {
            $taskId = (int) $matches[1];
            Log::debug('[CommandProcessingService] Found task ID for deletion', ['taskId' => $taskId]);
            $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();
            if (! $task) {
                return ['_error' => "Task #{$taskId} not found in this project."];
            }

            return ['type' => 'task_delete', 'selector' => ['id' => $taskId]];
        }

        // Special delete patterns
        if (preg_match('/\b(?:all|everything)\b/i', $m)) {
            return ['type' => 'bulk_delete_all'];
        }
        if (strpos($m, 'overdue') !== false) {
            return ['type' => 'bulk_delete_overdue'];
        }

        $filters = $this->parseFiltersEnhanced($project, $message);
        if (! empty($filters)) {
            return ['type' => 'bulk_delete', 'filters' => $filters];
        }

        return ['_error' => 'Please specify which tasks to delete (e.g., "delete #123", "delete all overdue tasks").'];
    }

    private function parseAssignCommand(Project $project, string $message, string $assignee): array
    {
        $assignee = trim($assignee);
        $lowerAssignee = strtolower($assignee);
        if (in_array($lowerAssignee, ['me','myself'])) {
            $assignee = '__ME__';
        } elseif ($lowerAssignee === 'owner') {
            $assignee = '__OWNER__';
        }
        if (preg_match('/#?(\d+)/', $message, $matches)) {
            return $this->createTaskUpdatePlan((int) $matches[1], ['assignee_hint' => $assignee]);
        }

        $filters = $this->parseFiltersEnhanced($project, $message);

        // We never want to filter by existing assignee when performing an assignment; drop assigned_to_hint.
        if (isset($filters['assigned_to_hint'])) {
            unset($filters['assigned_to_hint']);
        }
        // If no other filters, default to all
        if (empty($filters)) {
            $filters = ['all' => true];
        }

        return [
            'type' => 'bulk_assign',
            'filters' => empty($filters) ? ['all' => true] : $filters,
            'assignee' => $assignee,
        ];
    }

    private function scaffoldedPlanSynthesis(Project $project, string $message, array $history): array
    {
        try {
            // Try enhanced synthesis first
            $enhanced = $this->enhancedLLMSynthesis($project, $message, $history);
            if (! empty($enhanced['type'])) {
                return $enhanced;
            }

            // Fallback to basic synthesis
            return $this->synthesizeWithLLM($project, $message, $history);
        } catch (Throwable $e) {
            Log::error('[scaffoldedPlanSynthesis] failed', ['error' => $e->getMessage()]);

            return ['type' => null];
        }
    }

    private function synthesizeWithLLM(Project $project, string $message, array $history): array
    {
        $method = $this->contextService->getCurrentMethodology($project);
        $labels = $this->contextService->serverToMethodPhase($method);
        $systemPrompt = $this->buildLLMSystemPrompt($method, $labels);

        $msgs = [['role' => 'system', 'content' => $systemPrompt]];
        $msgs[] = ['role' => 'user', 'content' => $message];

        $plan = $this->openAIService->chatJson($msgs, 0.1);

        return $this->normalizeLLMPlan($project, is_array($plan) ? $plan : []);
    }

    private function llmRepairPlan(Project $project, string $message, array $history, array $badPlan, string $why): array
    {
        $method = $this->contextService->getCurrentMethodology($project);
        $labels = $this->contextService->serverToMethodPhase($method);
        $system = $this->buildLLMSystemPrompt($method, $labels)."\nIMPORTANT: The previous plan was invalid because: ".$why."\nFix the plan based on the user's message.";

        $msgs = [['role' => 'system', 'content' => $system]];
        $msgs[] = ['role' => 'assistant', 'content' => json_encode($badPlan)];
        $msgs[] = ['role' => 'user', 'content' => $message];

        $plan = $this->openAIService->chatJson($msgs, 0.2);

        return $this->normalizeLLMPlan($project, is_array($plan) ? $plan : []);
    }

    private function buildLLMSystemPrompt(string $method, array $labels): string
    {
        return implode("\n", [
            'You are a strict command planner for a project management system.',
            "Methodology: {$method}. Status mapping: todo={$labels['todo']}, etc.",
            'Return ONLY a valid JSON object with this structure:',
            '{ "type": "create_task|task_update|task_delete|bulk_update|bulk_assign|bulk_delete", "selector": {"id": 123}, "payload": {"title": "...", "description": "..."}, "changes": {"status": "done", "priority": "high", "description": "...", "title": "...", "assignee_hint": "user", "end_date": "YYYY-MM-DD"}, "filters": {"status": "todo"}, "updates": {"priority": "high"}, "assignee": "name" }',
            '',
            'IMPORTANT RULES:',
            "1. For task updates, ALWAYS use 'task_update' type with 'selector.id' and 'changes' object.",
            '2. Description updates: Use changes.description with the new description text.',
            '3. Examples of description commands:',
            "   - 'update description of task 238 to \"new desc\"' → {\"type\":\"task_update\",\"selector\":{\"id\":238},\"changes\":{\"description\":\"new desc\"}}",
            "   - 'set task description to \"text\"' → {\"type\":\"task_update\",\"selector\":{\"id\":ID},\"changes\":{\"description\":\"text\"}}",
            '4. Normalize statuses to: todo, inprogress, review, done.',
            '5. Normalize priorities to: low, medium, high, urgent.',
            "6. Use `filters.assigned_to_hint` for mentions like \"Alice's tasks\".",
            '7. For unclear input, return an empty object {}.',
            "8. ALWAYS extract task IDs from patterns like '#238', 'task 238', 'task ID 238'.",
        ]);
    }

    private function validatePlan(Project $project, array $plan): array
    {
        $type = $this->normalizeType($plan['type'] ?? null);
        Log::debug('[CommandProcessingService] validatePlan', ['type' => $type, 'plan' => $plan]);

        if (! $type) {
            return ['_ok' => false, '_why' => 'I couldn\'t understand that command. Please be more specific.'];
        }

        $onlyAllowed = ['create_task', 'task_update', 'task_delete', 'bulk_update', 'bulk_assign', 'bulk_delete_overdue', 'bulk_delete_all', 'bulk_delete', 'bulk_task_generation'];
        if (! in_array($type, $onlyAllowed, true)) {
            return ['_ok' => false, '_why' => 'Unsupported command type.'];
        }

        if ($type === 'task_update' || $type === 'task_delete') {
            $id = (int) ($plan['selector']['id'] ?? 0);
            Log::debug('[CommandProcessingService] validating task operation', ['type' => $type, 'id' => $id]);

            if ($id <= 0) {
                return ['_ok' => false, '_why' => 'A specific task ID (e.g., #123) is required for this action.'];
            }

            $taskExists = Task::where('project_id', $project->id)->where('id', $id)->exists();
            Log::debug('[CommandProcessingService] task exists check', ['taskId' => $id, 'projectId' => $project->id, 'exists' => $taskExists]);

            if (! $taskExists) {
                return ['_ok' => false, '_why' => "Task #{$id} was not found in this project."];
            }
            if ($type === 'task_update' && empty($plan['changes'])) {
                return ['_ok' => false, '_why' => 'Please specify what to change (e.g., "set priority to high").'];
            }
        }

        if (in_array($type, ['bulk_update', 'bulk_assign', 'bulk_delete'])) {
            $filters = $plan['filters'] ?? [];
            if (empty($filters)) {
                return ['_ok' => false, '_why' => 'Please specify which tasks to affect (e.g., "all overdue tasks").'];
            }
            $affected = !empty($filters['all']) ? Task::where('project_id', $project->id)->count() : $this->contextService->countAffected($project, $filters);
            if ($affected <= 0) {
                return ['_ok' => false, '_why' => 'No tasks match the specified filters.'];
            }
            if ($type === 'bulk_update' && empty($plan['updates'])) {
                return ['_ok' => false, '_why' => 'Please specify what to update (e.g., "move to done").'];
            }
            if ($type === 'bulk_assign' && empty($plan['assignee'])) {
                return ['_ok' => false, '_why' => 'Please specify who to assign the tasks to.'];
            }
        }

        if ($type === 'bulk_delete_overdue') {
            $count = $this->countOverdue($project);
            if ($count <= 0) {
                return ['_ok' => false, '_why' => 'No overdue tasks found.'];
            }
        }

        if ($type === 'bulk_delete_all') {
            $count = Task::where('project_id', $project->id)->count();
            if ($count <= 0) {
                return ['_ok' => false, '_why' => 'No tasks to delete.'];
            }
        }

        if ($type === 'create_task' && empty(trim($plan['payload']['title'] ?? ''))) {
            return ['_ok' => false, '_why' => 'A title is required to create a task.'];
        }

        if ($type === 'bulk_task_generation') {
            $count = (int) ($plan['count'] ?? 0);
            if ($count <= 0 || $count > 10) {
                return ['_ok' => false, '_why' => 'Task generation count must be between 1 and 10.'];
            }
        }

        Log::debug('[CommandProcessingService] validation passed', ['type' => $type]);

        return ['_ok' => true, '_why' => ''];
    }

    private function preview(Project $project, array $plan, string $methodology): string
    {
        $type = $this->normalizeType($plan['type'] ?? '');
        Log::debug('[CommandProcessingService] preview', ['type' => $type, 'plan' => $plan]);

        switch ($type) {
            case 'create_task':
                $title = htmlspecialchars($plan['payload']['title'] ?? 'Untitled');
                $statusLabel = $this->prettyPhase($methodology, 'todo');

                return "✅ Create a new task \"{$title}\" in \"{$statusLabel}\".";

            case 'task_delete':
                $taskId = $plan['selector']['id'] ?? 'unknown';

                return "🗑️ Permanently delete task #{$taskId}.";

            case 'task_update':
                $taskId = $plan['selector']['id'] ?? 'unknown';
                $what = $this->updatesHuman($plan['changes'] ?? [], $methodology);

                return "✏️ On task #{$taskId}, {$what}.";

            case 'bulk_update':
                $count = $this->contextService->countAffected($project, $plan['filters'] ?? []);
                $scope = $this->filtersHuman($plan['filters'] ?? [], $methodology);
                $s = $count === 1 ? '' : 's';
                $what = $this->updatesHuman($plan['updates'] ?? [], $methodology);

                return "⚡ This will affect {$count} task{$s} {$scope} and update them: {$what}.";

            case 'bulk_assign':
                $count = $this->contextService->countAffected($project, $plan['filters'] ?? []);
                $scope = $this->filtersHuman($plan['filters'] ?? [], $methodology);
                $s = $count === 1 ? '' : 's';
                $assignee = htmlspecialchars($plan['assignee'] ?? '');

                return "⚡ This will affect {$count} task{$s} {$scope} and assign them to \"{$assignee}\".";

            case 'bulk_delete':
                $count = $this->contextService->countAffected($project, $plan['filters'] ?? []);
                $scope = $this->filtersHuman($plan['filters'] ?? [], $methodology);
                $s = $count === 1 ? '' : 's';

                return "⚡ This will affect {$count} task{$s} {$scope} and permanently delete them.";

            case 'bulk_delete_overdue':
                $count = $this->countOverdue($project);

                return "🗑️ This will permanently delete {$count} overdue task(s).";

            case 'bulk_delete_all':
                $count = Task::where('project_id', $project->id)->count();

                return "⚠️ This will permanently delete ALL {$count} task(s) in this project.";

            case 'bulk_task_generation':
                $count = (int) ($plan['count'] ?? 3);
                $context = ! empty($plan['context']) ? " for \"{$plan['context']}\"" : '';

                return "✨ This will generate {$count} AI-powered task(s){$context} using advanced project analysis.";

            default:
                Log::warning('[CommandProcessingService] Unknown command type in preview', ['type' => $type, 'plan' => $plan]);

                return 'An unknown action is planned.';
        }
    }

    private function updatesHuman(array $updates, string $methodology): string
    {
        $pieces = [];
        if (isset($updates['status'])) {
            $pieces[] = 'set status to "'.$this->prettyPhase($methodology, $updates['status']).'"';
        }
        if (isset($updates['priority'])) {
            $pieces[] = 'set priority to '.$updates['priority'];
        }
        if (isset($updates['assignee_hint'])) {
            $pieces[] = 'assign to "'.$updates['assignee_hint'].'"';
        }

        return empty($pieces) ? 'make changes' : implode(', ', $pieces);
    }

    private function filtersHuman(array $filters, string $methodology): string
    {
        $parts = [];
        if (! empty($filters['all'])) {
            return 'on ALL tasks';
        }
        if (! empty($filters['status'])) {
            $parts[] = 'in "'.$this->prettyPhase($methodology, $filters['status']).'"';
        }
        if (! empty($filters['priority'])) {
            $parts[] = 'with '.$filters['priority'].' priority';
        }
        if (! empty($filters['overdue'])) {
            $parts[] = 'that are overdue';
        }
        if (! empty($filters['unassigned'])) {
            $parts[] = 'that are unassigned';
        }
        if (! empty($filters['assigned_to_hint'])) {
            $parts[] = 'assigned to "'.$filters['assigned_to_hint'].'"';
        }

        return empty($parts) ? '' : '('.implode(' and ', $parts).')';
    }

    private function normalizeLLMPlan(Project $project, array $plan): array
    {
        $normStatus = fn (?string $s) => $s ? $this->resolveStatusToken($project, $s) : null;
        $normPrio = fn (?string $p) => $p ? $this->resolvePriorityToken($p) : null;

        foreach (['changes', 'payload', 'updates', 'filters'] as $key) {
            if (isset($plan[$key]) && is_array($plan[$key])) {
                if (isset($plan[$key]['status'])) {
                    $plan[$key]['status'] = $normStatus($plan[$key]['status']);
                }
                if (isset($plan[$key]['priority'])) {
                    $plan[$key]['priority'] = $normPrio($plan[$key]['priority']);
                }
            }
        }
        if (! empty($plan['filters']['assigned_to_hint'])) {
            unset($plan['filters']['all']);
        }

        $plan['type'] = $this->normalizeType($plan['type'] ?? null);

        return $plan;
    }

    private function normalizeType(?string $type): ?string
    {
        if (! $type) {
            return null;
        }
        $t = str_replace(['-', '_'], '', strtolower(trim($type)));
        Log::debug('[CommandProcessingService] normalizeType', ['original' => $type, 'normalized' => $t]);

        $map = [
            'createtask' => 'create_task', 'newtask' => 'create_task',
            'updatetask' => 'task_update', 'edittask' => 'task_update', 'movetask' => 'task_update',
            'deletetask' => 'task_delete', 'removetask' => 'task_delete', 'delete' => 'task_delete',
            'bulkupdate' => 'bulk_update', 'massupdate' => 'bulk_update',
            'bulkassign' => 'bulk_assign', 'assignall' => 'bulk_assign',
            'bulkdelete' => 'bulk_delete', 'deletefiltered' => 'bulk_delete', 'deleteall' => 'bulk_delete',
        ];

        $result = $map[$t] ?? $type;
        Log::debug('[CommandProcessingService] normalizeType result', ['result' => $result]);

        return $result;
    }

    private function resolveStatusToken(Project $project, string $token): ?string
    {
        $t = $this->norm($token);
        if ($t === 'in progress') { $t = 'inprogress'; }
        // Direct canonical match
        if (in_array($t, self::SERVER_STATUSES, true)) return $t;

        // Try new alias normalization (cross-methodology)
        if (method_exists($this->contextService, 'normalizeStatusAlias')) {
            $alias = $this->contextService->normalizeStatusAlias($t, $this->contextService->getCurrentMethodology($project));
            if ($alias) return $alias;
        }

        // Fallback to methodology map
        $map = $this->contextService->methodPhaseToServer($this->contextService->getCurrentMethodology($project));
        return $map[$t] ?? null;
    }

    private function resolvePriorityToken(string $token): ?string
    {
        $t = $this->norm($token);
        if (in_array($t, self::PRIORITIES)) {
            return $t;
        }
        $map = ['p3' => 'low', 'p2' => 'medium', 'p1' => 'high', 'p0' => 'urgent', 'critical' => 'urgent', 'blocker' => 'urgent'];

        return $map[$t] ?? null;
    }

    private function prettyPhase(string $method, string $serverStatus): string
    {
        $map = $this->contextService->serverToMethodPhase($method);

        return $map[$serverStatus] ?? $serverStatus;
    }

    private function nthStageToStatus(string $ordinal): ?string
    {
        return match ($ordinal) {
            'first' => 'todo', 'second' => 'inprogress', 'third' => 'review', 'fourth' => 'done', default => null
        };
    }

    private function parseOrdinalWindow(string $mLow): ?array
    {
        if (preg_match('/\b(first|last|top)\s+(one|two|three|four|five|\d+)\b/i', $mLow, $mm)) {
            $wordsToNum = ['one' => 1, 'two' => 2, 'three' => 3, 'four' => 4, 'five' => 5];
            $nRaw = strtolower($mm[2]);
            $n = ctype_digit($nRaw) ? (int) $nRaw : ($wordsToNum[$nRaw] ?? null);
            if ($n > 0) {
                return ['limit' => $n, 'order' => ($mm[1] === 'last') ? 'desc' : 'asc'];
            }
        }

        return null;
    }

    private function parseDate(string $text): ?Carbon
    {
        try {
            return Carbon::parse($text);
        } catch (Throwable $e) {
            return null;
        }
    }

    /**
     * Parse simple relative date expressions used in task update commands.
     * Supports: today, tomorrow, next week, next <weekday>, this <weekday>, next <n> days, +N days, +N weeks, Friday, next Friday, etc.
     */
    private function parseRelativeDate(string $raw): ?Carbon
    {
        $t = strtolower(trim($raw));
        $now = Carbon::now();

        if ($t === 'today') return $now->copy();
        if ($t === 'tomorrow') return $now->copy()->addDay();
        if ($t === 'next week') return $now->copy()->addWeek();
        if ($t === 'this week') return $now->copy();

        // +N days / +N weeks
        if (preg_match('/^\+?(\d+)\s+day(s)?$/', $t, $m)) {
            return $now->copy()->addDays((int) $m[1]);
        }
        if (preg_match('/^\+?(\d+)\s+week(s)?$/', $t, $m)) {
            return $now->copy()->addWeeks((int) $m[1]);
        }

        // next N days (alias for +N days)
        if (preg_match('/^next\s+(\d+)\s+day(s)?$/', $t, $m)) {
            return $now->copy()->addDays((int) $m[1]);
        }

        // Weekday names (this <weekday>, next <weekday>)
        $weekdays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        foreach ($weekdays as $idx => $wd) {
            if ($t === $wd || $t === 'this '.$wd) {
                $candidate = $now->copy()->nextOrSame(ucfirst($wd));
                return $candidate;
            }
            if ($t === 'next '.$wd) {
                $candidate = $now->copy()->next(ucfirst($wd));
                return $candidate;
            }
        }

        // Try natural parse fallback (may handle explicit dates)
        return $this->parseDate($raw);
    }

    private function norm(string $text): string
    {
        return trim(preg_replace('/\s+/', ' ', str_replace(['_', '-'], ' ', strtolower($text))));
    }

    private function countOverdue(Project $project): int
    {
        $count = 0;
        $q = Task::where('project_id', $project->id)->whereIn('status', ['todo', 'inprogress', 'review'])->whereNotNull('end_date');
        foreach ($q->get() as $task) {
            try {
                if (Carbon::parse($task->end_date)->isPast()) {
                    $count++;
                }
            } catch (\Throwable $e) {
                Log::warning('[CommandProcessingService] Failed to parse date for task', ['task_id' => $task->id, 'end_date' => $task->end_date]);
            }
        }

        return $count;
    }

    /**
     * Enhanced LLM synthesis with better context and prompting
     */
    private function enhancedLLMSynthesis(Project $project, string $message, array $history): array
    {
        try {
            $method = $this->contextService->getCurrentMethodology($project);
            $labels = $this->contextService->serverToMethodPhase($method);

            // Get recent task context for better ID resolution
            $recentTasks = Task::where('project_id', $project->id)
                ->orderBy('updated_at', 'desc')
                ->limit(20)
                ->get(['id', 'title', 'status', 'priority'])
                ->map(fn ($t) => "#{$t->id}: {$t->title} ({$t->status}, {$t->priority})")
                ->implode("\n");

            $enhancedPrompt = $this->buildLLMSystemPrompt($method, $labels)."\n\n";
            $enhancedPrompt .= "RECENT TASKS FOR CONTEXT:\n{$recentTasks}\n\n";
            $enhancedPrompt .= 'Parse this user command and return the appropriate JSON action:';

            $msgs = [
                ['role' => 'system', 'content' => $enhancedPrompt],
                ['role' => 'user', 'content' => $message],
            ];

            Log::debug('[CommandProcessingService] Enhanced LLM synthesis', ['message' => $message]);

            $plan = $this->openAIService->chatJson($msgs, 0.1);
            $normalized = $this->normalizeLLMPlan($project, is_array($plan) ? $plan : []);

            Log::debug('[CommandProcessingService] LLM plan result', ['normalized' => $normalized]);

            return $normalized;
        } catch (Throwable $e) {
            Log::error('[CommandProcessingService] Enhanced LLM synthesis failed', ['error' => $e->getMessage()]);

            return ['type' => null];
        }
    }

    /**
     * Check if the command is for bulk task creation
     */
    private function isBulkTaskCreationCommand(string $message): bool
    {
        $patterns = [
            '/\b(?:create|generate|make|add)\s+(\d+|several|multiple|some)\s+tasks?\b/i',
            '/\b(?:create|generate|make|add)\s+(?:a\s+)?(?:bunch\s+of|lot\s+of|few)\s+tasks?\b/i',
            '/\b(?:create|generate|make)\s+tasks?\s+for\b/i',
            '/\b(?:generate|create)\s+(?:new\s+)?tasks?\s*$/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $message)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Parse bulk task creation command
     */
    private function parseBulkTaskCreationCommand(Project $project, string $message): array
    {
        Log::debug('[CommandProcessingService] Parsing bulk task creation', ['message' => $message]);

        // Extract number of tasks
        $count = 3; // default
        if (preg_match('/\b(\d+)\s+tasks?\b/i', $message, $matches)) {
            $count = min(10, max(1, (int) $matches[1])); // limit between 1-10
        } elseif (preg_match('/\b(several|few)\s+tasks?\b/i', $message)) {
            $count = 3;
        } elseif (preg_match('/\b(multiple|some)\s+tasks?\b/i', $message)) {
            $count = 4;
        }

        // Extract context/domain from the message
        $context = '';
        if (preg_match('/\bfor\s+(.+?)(?:\s|$)/i', $message, $matches)) {
            $context = trim($matches[1]);
        } elseif (preg_match('/\babout\s+(.+?)(?:\s|$)/i', $message, $matches)) {
            $context = trim($matches[1]);
        } elseif (preg_match('/\btasks?\s+(.+?)(?:\s|$)/i', $message, $matches)) {
            $context = trim($matches[1]);
        }

        return [
            'type' => 'bulk_task_generation',
            'count' => $count,
            'context' => $context,
            'full_message' => $message,
        ];
    }

    private function createTaskPlan(string $title): array
    {
        return ['type' => 'create_task', 'payload' => ['title' => $title, 'status' => 'todo', 'priority' => 'medium']];
    }

    private function createTaskUpdatePlan(int $id, array $ch): array
    {
        return ['type' => 'task_update', 'selector' => ['id' => $id], 'changes' => $ch];
    }

    private function createBulkUpdatePlan(array $f, array $u): array
    {
        return ['type' => 'bulk_update', 'filters' => $f, 'updates' => $u];
    }
}
