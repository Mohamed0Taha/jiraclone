<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * QuestionAnsweringService
 *
 * Answers user questions about a project using LLM or deterministic methods.
 */
class QuestionAnsweringService
{
    private OpenAIService $openAIService;

    private ProjectContextService $contextService;

    public function __construct(OpenAIService $openAIService, ProjectContextService $contextService)
    {
        $this->openAIService = $openAIService;
        $this->contextService = $contextService;
    }

    public function answer(Project $project, string $originalMessage, array $history, ?string $rephrasedQuestion): string
    {
        try {
            // 1. Normalize message early
            $normalized = trim($originalMessage);
            if ($normalized === '') {
                return "Please enter a question (e.g. 'Show project overview' or 'List overdue tasks').";
            }

            // 2. Quick ambiguity detection BEFORE any expensive work
            if ($this->isAmbiguous($normalized, $history)) {
                return $this->clarifyAmbiguous($normalized, $history);
            }

            // 3. Classify intent (lightweight heuristic). This helps route logic + improves LLM prompting
            $intent = $this->classifyIntent($normalized, $history);

            // 3b. If explanation requested, generate rationale from recent context
            if ($intent === 'explanation') {
                return $this->generateExplanation($history) ?: 'I can explain a previous numeric/statistical answer if you first ask something like "How many tasks are done?" then ask "Why?"';
            }

            // Check if this needs conversation context (follow-up questions)
            $needsContext = $this->requiresConversationContext($normalized, $history);

            // For context-dependent queries, try LLM first if available
            $envKey = env('OPENAI_API_KEY');
            $runtimeKey = getenv('OPENAI_API_KEY') ?: '';
            $configKey = config('openai.api_key');
            $apiKey = trim((string) ($runtimeKey ?: $envKey ?: $configKey));
            $hasLLM = $apiKey !== '';
            // In the testing environment we default to deterministic mode unless explicitly opted in
            if (app()->environment('testing') && ! env('ENABLE_LLM_IN_TESTS')) {
                $hasLLM = false;
            }
            if ($needsContext && $hasLLM) {
                try {
                    $llmAnswer = $this->questionAnswerWithOpenAI($project, $normalized, $history, $rephrasedQuestion, true);
                    if ($llmAnswer) {
                        return $llmAnswer;
                    }
                } catch (Throwable $e) {
                    Log::error('[QnA] Context-aware LLM answer failed', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                }
            }

            // Try deterministic answer
            $deterministicAnswer = $this->answerQuestionEnhanced($project, $normalized, $history, $intent);
            if ($deterministicAnswer) {
                return $deterministicAnswer['message'];
            }

            // Fall back to LLM if not already tried
            if (! $needsContext && $hasLLM) {
                try {
                    $llmAnswer = $this->questionAnswerWithOpenAI($project, $normalized, $history, $rephrasedQuestion, true);
                    if ($llmAnswer) {
                        return $llmAnswer;
                    }
                } catch (Throwable $e) {
                    Log::error('[QnA] Fallback LLM answer failed', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                }
            }

            // Provide adaptive help referencing intent if we classified something general
            return $this->adaptiveHelp($project, $intent)['message'];

        } catch (Throwable $e) {
            Log::error('[QnA] Answer method failed', [
                'error' => $e->getMessage(),
                'message' => $normalized ?? $originalMessage,
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->adaptiveHelp($project, 'error')['message'];
        }
    }

    /**
     * Check if the message requires conversation context to answer properly
     */
    private function requiresConversationContext(string $message, array $history): bool
    {
        try {
            $m = strtolower(trim($message));

            // Pronouns and references that need context
            $contextualPhrases = [
                'they', 'them', 'their', 'those', 'these',
                'it', 'its', 'that', 'this',
            ];

            // Check if message contains contextual references without specific identifiers
            foreach ($contextualPhrases as $phrase) {
                if (strpos($m, $phrase) !== false && ! preg_match('/#\d+/', $m)) {
                    return true;
                }
            }

            // Check for context-dependent questions
            if (preg_match('/^(who|whom|whose|assigned to|belong|responsible|owns)/i', $m) && ! preg_match('/(owner|team|member)/i', $m)) {
                return true;
            }

            // Very short questions often need context
            if (strlen($m) < 20 && ! empty($history)) {
                return true;
            }

            // Questions starting with certain words often refer to previous context
            if (preg_match('/^(and|also|what about|how about)/i', $m)) {
                return true;
            }

            return false;
        } catch (Throwable $e) {
            Log::error('[QnA] Context check failed', ['error' => $e->getMessage()]);

            return false;
        }
    }

    private function questionAnswerWithOpenAI(Project $project, string $original, array $history, ?string $rephrased, bool $useAssistantModel = false): ?string
    {
        try {
            // Get comprehensive context including ALL project and task details
            $context = $this->contextService->getSanitizedContextForLLM($project, [
                'include_tasks' => true,
                'include_comments' => false,
                'task_limit' => null, // Get ALL tasks, no limit
            ]);

            // Create a detailed context summary for better understanding
            $contextSummary = $this->createContextSummary($context);

            $system = <<<SYS
You are a helpful project assistant with COMPLETE access to all project and task data.

IMPORTANT CONTEXT INFORMATION:
{$contextSummary}

YOUR CAPABILITIES:
- You have FULL access to ALL project data and ALL task details
- You can see task IDs, titles, assignees, statuses, priorities, due dates, and descriptions
- You can track the conversation history to understand follow-up questions
- When users ask "their ids" or "assigned to who" after mentioning tasks, you understand they're referring to those tasks

CONVERSATION RULES:
1. ALWAYS use the actual data from the context provided - check the PROJECT_DATA section
2. When asked about task IDs, list the actual IDs from the data
3. When asked about assignments, show who each task is assigned to
4. For follow-up questions, refer back to what was just discussed
5. Be specific and include actual IDs, names, and details
6. Never say you don't have access to information that's in the context

RESPONSE FORMAT:
- List tasks with their actual IDs (e.g., "Task #123: Fix login bug")
- Include relevant details (assignee name, status, priority)
- For "assigned to who?" questions, list each task with its assignee
- Keep responses clear and concise
SYS;

            // Build messages array - ensure context is always visible
            $msgs = [
                ['role' => 'system', 'content' => $system],
            ];

            // Add the complete project data as a system message so it's always available
            $projectDataMsg = "PROJECT_DATA (This is the complete current state of the project and all tasks):\n";
            $projectDataMsg .= json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            $msgs[] = ['role' => 'system', 'content' => $projectDataMsg];

            // Add conversation history to maintain context
            $recentHistory = array_slice($history, -10);
            foreach ($recentHistory as $msg) {
                if (isset($msg['role']) && isset($msg['content']) && ! empty($msg['content'])) {
                    $role = ($msg['role'] === 'assistant') ? 'assistant' : 'user';
                    // Don't add system messages from history
                    if ($role !== 'system') {
                        $msgs[] = ['role' => $role, 'content' => $msg['content']];
                    }
                }
            }

            // Add the current question with context reminder
            $currentQuestion = $rephrased ?: $original;
            $questionWithContext = $currentQuestion;

            // If it's a follow-up question, add context
            if ($this->requiresConversationContext($original, $history)) {
                $questionWithContext = '[Follow-up question referring to previous context] '.$currentQuestion;
                $questionWithContext .= "\n[Remember to check the PROJECT_DATA for actual task IDs and details]";
            }

            $msgs[] = ['role' => 'user', 'content' => $questionWithContext];

            // Log the request for debugging
            Log::info('[QnA] Sending to OpenAI', [
                'question' => $currentQuestion,
                'task_count' => count($context['tasks'] ?? []),
                'has_context' => ! empty($context),
                'history_count' => count($recentHistory),
            ]);

            $text = $this->openAIService->chatText($msgs, 0.2, $useAssistantModel);

            if (trim($text)) {
                Log::info('[QnA] OpenAI response received', ['response_length' => strlen($text)]);

                return $this->sanitizeAnswer($text);
            }

            return null;

        } catch (Throwable $e) {
            Log::error('[QnA] OpenAI call failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return null;
        }
    }

    /**
     * Create a human-readable summary of the context for the system prompt
     */
    private function createContextSummary(array $context): string
    {
        $summary = '';

        // Project info
        if (isset($context['project'])) {
            $p = $context['project'];
            $summary .= "Project: {$p['name']} (ID: {$p['id']})\n";

            if (isset($p['owner'])) {
                $summary .= "Owner: {$p['owner']['name']} ({$p['owner']['email']})\n";
            }

            if (isset($p['statistics']['total'])) {
                $summary .= "Total Tasks: {$p['statistics']['total']}\n";
            }
        }

        // Task list summary
        if (isset($context['tasks']) && is_array($context['tasks'])) {
            $taskCount = count($context['tasks']);
            $summary .= "\nYou have access to {$taskCount} tasks with full details including:\n";

            // List first few tasks as examples
            $maxExamples = min(3, $taskCount);
            for ($i = 0; $i < $maxExamples; $i++) {
                $task = $context['tasks'][$i];
                $assignee = isset($task['assignee']) ? $task['assignee']['name'] : 'Unassigned';
                $summary .= "- Task #{$task['id']}: \"{$task['title']}\" (assigned to: {$assignee})\n";
            }

            if ($taskCount > $maxExamples) {
                $remaining = $taskCount - $maxExamples;
                $summary .= "- ... and {$remaining} more tasks\n";
            }
        }

        return $summary;
    }

    private function answerQuestionEnhanced(Project $project, string $message, array $history = [], string $intent = 'unknown'): ?array
    {
        try {
            $m = strtolower(trim($message));

            // Lightweight keyword / fuzzy search: "search login bug" or "find auth error"
            if (preg_match('/^(search|find)\s+(.{3,})$/i', $m, $km)) {
                $needle = trim($km[2]);
                $res = $this->keywordSearchTasks($project, $needle);

                return $this->createResponse($res ?: "No tasks matched keyword: {$needle}");
            }

            // Intent short-circuits (faster routing & fewer regex passes)
            switch ($intent) {
                case 'task_assignments':
                    return $this->getTaskAssignments($project);
                case 'task_overview':
                case 'overview':
                    return $this->getProjectOverview($project);
                case 'task_list':
                case 'task_ids':
                    return $this->getTaskDetails($project, $m);
                case 'task_specific':
                    if (preg_match('/#?\d+/', $m)) {
                        return $this->getSpecificTaskInfo($project, $m);
                    }
                    break; // fall through to legacy heuristics if not matched
                case 'team_info':
                    // will be handled below by existing regex
                    break;
                case 'count_query':
                    return $this->handleCountingQuery($project, $m);
                case 'ambiguous':
                    return $this->createResponse($this->clarifyAmbiguous($message, $history));
                case 'weekly_progress':
                    return $this->getWeeklyProgressReport($project);
            }

            // Owner queries should resolve before generic 'who' task assignment logic
            if (preg_match('/\bwho\b.*\b(project\s+)?owner(s|ship)?\b/i', $m) || preg_match('/\bwho\s+owns\b/i', $m)) {
                $owner = $this->contextService->getProjectOwner($project);
                $info = $owner ? "Project owner: {$owner->name} (".($owner->email ?? 'no email').')' : 'Project owner not found.';

                return $this->createResponse($info);
            }

            // Handle queries about task IDs or listings - including follow-ups
            if (preg_match('/\b(task|tasks)\b.*\b(id|ids|list|show|what|which|detail|info)\b/i', $m) ||
                preg_match('/\b(what|which|show|list)\b.*\b(task|tasks|id|ids)\b/i', $m) ||
                preg_match('/\b(their|these|those)\s+(id|ids|task|tasks)\b/i', $m) ||
                (preg_match('/\b(id|ids)\b/i', $m) && $this->wasDiscussingTasks($history))) {
                return $this->getTaskDetails($project, $m);
            }

            // Handle "assigned to who?" type questions - only if clearly about tasks and not about owner
            if ((preg_match('/\bassigned\s+to\s+(who|whom)\b/i', $m) || preg_match('/^(who|whom)\b/i', $m)) && $this->wasDiscussingTasks($history)) {
                return $this->getTaskAssignments($project);
            }

            // Handle specific task ID queries
            if (preg_match('/#?(\d+)/', $m)) {
                return $this->getSpecificTaskInfo($project, $m);
            }

            // Handle owner queries
            if (preg_match('/\bwho\b.*\b(owner|owns|created)\b/i', $m)) {
                $owner = $this->contextService->getProjectOwner($project);
                $info = $owner ? "Project owner: {$owner->name} ({$owner->email})" : 'Project owner not found.';

                return $this->createResponse($info);
            }

            // Handle team/member queries
            if (preg_match('/\b(member|team)\b/i', $m)) {
                $members = $this->contextService->getProjectMembers($project);
                if (preg_match('/\bhow\s+many\b|\bcount\b/i', $m)) {
                    return $this->createResponse('There are '.$members->count().' project members.');
                }
                $names = $members->pluck('name')->implode(', ');

                return $this->createResponse($members->isEmpty() ? 'No team members found.' : 'Team members: '.$names);
            }

            // Handle counting queries
            if (preg_match('/\b(todo|in\s?progress|review|done|overdue|low|medium|high|urgent)\b/i', $m) ||
                preg_match('/\bhow\s+many\b/i', $m)) {
                return $this->handleCountingQuery($project, $m);
            }

            // Handle overview/summary queries
            if (preg_match('/\b(overview|snapshot|summary)\b/i', $m)) {
                return $this->getProjectOverview($project);
            }

            // Handle "all tasks" queries
            if (preg_match('/\ball\s+tasks?\b/i', $m) && ! preg_match('/\b(create|update|delete|move|assign)\b/i', $m)) {
                return $this->getAllTasksSummary($project);
            }

            return null;

        } catch (Throwable $e) {
            Log::error('[QnA] Deterministic answer failed', [
                'error' => $e->getMessage(),
                'message' => $message,
                'trace' => $e->getTraceAsString(),
            ]);

            return null;
        }
    }

    /**
     * Check if recent conversation was about tasks
     */
    private function wasDiscussingTasks(array $history): bool
    {
        $recent = array_slice($history, -4);
        foreach ($recent as $msg) {
            $content = strtolower($msg['content'] ?? '');
            if (strpos($content, 'task') !== false ||
                preg_match('/\bhow\s+many\b/i', $content) ||
                preg_match('/#\d+/', $content)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get task assignments for all tasks
     */
    private function getTaskAssignments(Project $project): array
    {
        try {
            $tasks = Task::where('project_id', $project->id)->with('assignee')->get();

            if ($tasks->isEmpty()) {
                return $this->createResponse('No tasks found in this project.');
            }

            $methodology = $this->contextService->getCurrentMethodology($project);
            $labels = $this->contextService->serverToMethodPhase($methodology);

            $response = "Task assignments:\n\n";
            foreach ($tasks as $task) {
                $assignee = $task->assignee ? $task->assignee->name : 'Unassigned';
                $statusLabel = $labels[$task->status] ?? ucfirst($task->status);
                $segments = [
                    $statusLabel,
                    ($task->priority ? strtolower($task->priority).' priority' : null),
                    $assignee ? 'assigned to '.$assignee : null,
                ];

                $line = sprintf('• Task #%d — %s', $task->id, $task->title);
                $details = array_filter($segments);
                if (! empty($details)) {
                    $line .= ' ('.implode(' · ', $details).')';
                }

                $response .= $line."\n";
            }

            return $this->createResponse($response);
        } catch (Throwable $e) {
            Log::error('[QnA] Task assignments failed', ['error' => $e->getMessage()]);

            return $this->createResponse('Unable to retrieve task assignments.');
        }
    }

    private function getTaskDetails(Project $project, string $message): array
    {
        try {
            $m = strtolower($message);
            $filters = [];
            $ordinalSingle = null; // single position (second task)
            $ordinalLimit = null;  // limit for phrases like first 3 tasks
            $ordinalOrder = 'asc';
            $ordinalMapping = [
                'first' => 1,
                'second' => 2,
                'third' => 3,
                'fourth' => 4,
                'fifth' => 5,
            ];

            // Detect "my tasks" / "owner's tasks"
            if (preg_match('/\bmy\s+tasks?\b/', $m)) {
                $filters['assignee_special'] = '__OWNER__'; // treat current user as owner for now
            } elseif (preg_match("/owner'?s\s+tasks?/", $m)) {
                $filters['assignee_special'] = '__OWNER__';
            }

            // Ordinal patterns
            if (preg_match('/\b(first|second|third|fourth|fifth)\s+task\b/', $m, $om)) {
                $ordinalSingle = $ordinalMapping[$om[1]] ?? 1;
            } elseif (preg_match('/\b(last|latest)\s+task\b/', $m)) {
                $ordinalSingle = 1; // after ordering desc
                $ordinalOrder = 'desc';
            }
            // first 2 / first two / last 3 tasks
            if (preg_match('/\b(first|last|latest)\s+(\d+|one|two|three|four|five)\s+tasks?\b/', $m, $lm)) {
                $wordToNum = ['one' => 1, 'two' => 2, 'three' => 3, 'four' => 4, 'five' => 5];
                $nRaw = strtolower($lm[2]);
                $ordinalLimit = ctype_digit($nRaw) ? (int) $nRaw : ($wordToNum[$nRaw] ?? null);
                $ordinalOrder = in_array($lm[1], ['last', 'latest']) ? 'desc' : 'asc';
            }

            // Natural language relative due date filters
            $now = now();
            if (preg_match('/\btoday\b/', $m)) {
                $filters['due_between'] = [$now->copy()->startOfDay(), $now->copy()->endOfDay()];
            } elseif (preg_match('/\btomorrow\b/', $m)) {
                $filters['due_between'] = [$now->copy()->addDay()->startOfDay(), $now->copy()->addDay()->endOfDay()];
            } elseif (preg_match('/\bthis\s+week\b/', $m)) {
                $filters['due_between'] = [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()];
            } elseif (preg_match('/\bnext\s+week\b/', $m)) {
                $filters['due_between'] = [$now->copy()->addWeek()->startOfWeek(), $now->copy()->addWeek()->endOfWeek()];
            } elseif (preg_match('/\b(due\s+soon|soon)\b/', $m)) {
                $filters['due_between'] = [$now, $now->copy()->addDays(3)->endOfDay()];
            }

            // Check for status filters
            if (preg_match('/\b(todo|in\s?progress|review|done)\b/i', $m, $matches)) {
                $status = str_replace(' ', '', strtolower($matches[1]));
                $filters['status'] = $status;
            }

            // Check for priority filters
            if (preg_match('/\b(low|medium|high|urgent|critical)\b/i', $m, $matches)) {
                $p = strtolower($matches[1]);
                if ($p === 'critical') {
                    $p = 'urgent';
                }
                $filters['priority'] = $p;
            }

            // Check for overdue filter
            if (strpos($m, 'overdue') !== false) {
                $filters['overdue'] = true;
            }

            // Check for unassigned filter
            if (strpos($m, 'unassigned') !== false) {
                $filters['unassigned'] = true;
            }

            // Assignee filter ("assigned to Alex" or "Alex's tasks")
            if (preg_match('/assigned\s+to\s+([a-z0-9_\- ]{2,40})/i', $m, $am)) {
                $filters['assignee_name'] = trim($am[1]);
            } elseif (preg_match("/([a-z][a-z0-9_\-]{1,30})'s\s+tasks/i", $m, $am2)) {
                $filters['assignee_name'] = trim($am2[1]);
            }

            // Build query and get tasks
            $query = $this->contextService->buildTaskQuery($project, $filters);

            // Apply special assignee filter
            if (isset($filters['assignee_special']) && $filters['assignee_special'] === '__OWNER__') {
                $owner = $this->contextService->getProjectOwner($project);
                if ($owner) {
                    $query->where('assignee_id', $owner->id);
                } else {
                    $query->whereRaw('1=0'); // no owner
                }
            }

            // Apply assignee name filter manually if present
            if (isset($filters['assignee_name'])) {
                $name = strtolower($filters['assignee_name']);
                $query->whereHas('assignee', function ($q) use ($name) {
                    $q->whereRaw('LOWER(name) LIKE ?', ['%'.$name.'%']);
                });
            }

            // Apply due date range filter
            if (isset($filters['due_between'])) {
                [$start, $end] = $filters['due_between'];
                $query->whereBetween('end_date', [$start->format('Y-m-d'), $end->format('Y-m-d')]);
            }
            // Ordering for ordinal queries (fallback to created_at if available)
            if ($ordinalSingle || $ordinalLimit || $ordinalOrder === 'desc') {
                if (Schema::hasColumn('tasks', 'created_at')) {
                    $query->orderBy('created_at', $ordinalOrder);
                } else {
                    $query->orderBy('id', $ordinalOrder);
                }
            }
            $tasks = $query->with(['assignee', 'creator'])->get();

            // Apply ordinal slicing AFTER retrieval to respect other filters
            if ($ordinalSingle && $tasks->isNotEmpty()) {
                $index = max(0, $ordinalSingle - 1);
                $sel = $tasks->slice($index, 1);
                if ($sel->isEmpty()) {
                    return $this->createResponse('No task found at that ordinal position.');
                }
                $tasks = $sel->values();
            } elseif ($ordinalLimit && $tasks->isNotEmpty()) {
                $tasks = $tasks->slice(0, $ordinalLimit)->values();
            }

            if ($tasks->isEmpty()) {
                // If a temporal (due date) filter caused zero matches, gracefully fall back to unfiltered list
                if (isset($filters['due_between'])) {
                    $fallbackTasks = Task::where('project_id', $project->id)->with(['assignee', 'creator'])->get();
                    if ($fallbackTasks->isNotEmpty()) {
                        $msg = 'No tasks matched the specified due date window – showing all tasks instead.\n\n';

                        return $this->createResponse($msg.$this->formatTaskList($fallbackTasks, $project));
                    }
                }

                return $this->createResponse('No tasks found matching your criteria.');
            }

            // Format the response
            $response = $this->formatTaskList($tasks, $project);

            return $this->createResponse($response);

        } catch (Throwable $e) {
            Log::error('[QnA] Get task details failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->createResponse('Unable to retrieve task details.');
        }
    }

    private function getSpecificTaskInfo(Project $project, string $message): ?array
    {
        try {
            if (! preg_match('/#?(\d+)/', $message, $matches)) {
                return null;
            }

            $taskId = (int) $matches[1];
            $task = Task::where('project_id', $project->id)
                ->where('id', $taskId)
                ->with(['assignee', 'creator'])
                ->first();

            if (! $task) {
                return $this->createResponse("Task #{$taskId} not found in this project.");
            }

            $methodology = $this->contextService->getCurrentMethodology($project);
            $labels = $this->contextService->serverToMethodPhase($methodology);

            $info = "Task #{$task->id} — {$task->title}\n";
            $info .= "- Status: {$labels[$task->status]}\n";
            $info .= "- Priority: {$task->priority}\n";

            if ($task->assignee) {
                $info .= "- Assigned to: {$task->assignee->name}\n";
            } else {
                $info .= "- Assigned to: Unassigned\n";
            }

            if ($task->end_date) {
                $info .= "- Due: {$task->end_date->format('Y-m-d')}";
                if ($task->end_date->isPast() && $task->status !== 'done') {
                    $info .= ' (overdue)';
                }
                $info .= "\n";
            }

            if ($task->description) {
                $info .= "- Description: {$task->description}\n";
            }

            return $this->createResponse($info);

        } catch (Throwable $e) {
            Log::error('[QnA] Get specific task failed', ['error' => $e->getMessage()]);

            return null;
        }
    }

    private function getAllTasksSummary(Project $project): array
    {
        try {
            $tasks = Task::where('project_id', $project->id)
                ->with(['assignee', 'creator'])
                ->get();

            if ($tasks->isEmpty()) {
                return $this->createResponse('No tasks found in this project.');
            }

            $response = $this->formatTaskList($tasks, $project);

            return $this->createResponse($response);

        } catch (Throwable $e) {
            Log::error('[QnA] Get all tasks failed', ['error' => $e->getMessage()]);

            return $this->createResponse('Unable to retrieve tasks.');
        }
    }

    private function formatTaskList($tasks, Project $project): string
    {
        try {
            $methodology = $this->contextService->getCurrentMethodology($project);
            $labels = $this->contextService->serverToMethodPhase($methodology);

            $count = $tasks->count();
            $taskWord = $count === 1 ? 'task' : 'tasks';

            // For reasonable number of tasks, list them with details
            if ($count <= 10) {
                $response = "Found {$count} {$taskWord}:\n\n";
                foreach ($tasks as $task) {
                    $response .= "• Task #{$task->id} — {$task->title}";
                    $response .= " ({$labels[$task->status]}, {$task->priority} priority";

                    if ($task->assignee) {
                        $response .= ", assigned to {$task->assignee->name}";
                    } else {
                        $response .= ', unassigned';
                    }

                    if ($task->end_date && $task->end_date->isPast() && $task->status !== 'done') {
                        $response .= ', overdue';
                    }

                    $response .= ")\n";
                }
            } else {
                // For many tasks, provide a summary with IDs
                $response = "Found {$count} {$taskWord}. Task IDs: ";
                $ids = $tasks->pluck('id')->sort()->values()->toArray();
                $response .= implode(', ', array_map(fn ($id) => "#{$id}", $ids));

                // Add status breakdown
                $response .= "\n\nStatus breakdown:\n";
                $statusCounts = $tasks->groupBy('status')->map->count();
                foreach ($statusCounts as $status => $statusCount) {
                    if (isset($labels[$status])) {
                        $response .= "- {$labels[$status]}: {$statusCount}\n";
                    }
                }
            }

            return $response;

        } catch (Throwable $e) {
            Log::error('[QnA] Format task list failed', ['error' => $e->getMessage()]);

            return 'Unable to format task list.';
        }
    }

    private function handleCountingQuery(Project $project, string $message): array
    {
        try {
            $snapshot = $this->getSnapshotCached($project);
            $m = strtolower($message);
            // Attempt cross-methodology status alias resolution for counting queries
            if (method_exists($this->contextService, 'extractStatusFromText')) {
                $aliasStatus = $this->contextService->extractStatusFromText($m, $this->contextService->getCurrentMethodology($project));
                if ($aliasStatus && isset($snapshot['tasks']['by_status'][$aliasStatus])) {
                    $labels = $this->contextService->serverToMethodPhase($this->contextService->getCurrentMethodology($project));
                    $count = $snapshot['tasks']['by_status'][$aliasStatus] ?? 0;

                    return $this->createResponse("There are {$count} task(s) in {$labels[$aliasStatus]}.");
                }
            }
            // Priority alias resolution
            if (method_exists($this->contextService, 'extractPriorityFromText')) {
                $aliasPriority = $this->contextService->extractPriorityFromText($m);
                if ($aliasPriority && isset($snapshot['tasks']['by_priority'][$aliasPriority])) {
                    $count = $snapshot['tasks']['by_priority'][$aliasPriority] ?? 0;

                    return $this->createResponse("There are {$count} {$aliasPriority} priority task(s).");
                }
            }

            // Comparison first so single status tokens don't early-return
            if (preg_match('/(done|todo|in\s?progress|review)\s+vs\s+(done|todo|in\s?progress|review)/', $m, $cm)) {
                $a = str_replace(' ', '', $cm[1]);
                $b = str_replace(' ', '', $cm[2]);
                $labels = $this->contextService->serverToMethodPhase($this->contextService->getCurrentMethodology($project));
                $aCount = $snapshot['tasks']['by_status'][$a] ?? 0;
                $bCount = $snapshot['tasks']['by_status'][$b] ?? 0;

                return $this->createResponse("Comparison: {$labels[$a]} = {$aCount}; {$labels[$b]} = {$bCount} (difference: ".($aCount - $bCount).')');
            }

            // Check for priority counts
            foreach (['low', 'medium', 'high', 'urgent'] as $priority) {
                if (strpos($m, $priority) !== false) {
                    $count = $snapshot['tasks']['by_priority'][$priority] ?? 0;

                    return $this->createResponse("There are {$count} {$priority} priority task(s).");
                }
            }

            // Check for status counts
            foreach (['todo', 'inprogress', 'review', 'done'] as $status) {
                if (strpos($m, str_replace(' ', '', $status)) !== false) {
                    $count = $snapshot['tasks']['by_status'][$status] ?? 0;
                    $methodology = $this->contextService->getCurrentMethodology($project);
                    $labels = $this->contextService->serverToMethodPhase($methodology);

                    return $this->createResponse("There are {$count} task(s) in {$labels[$status]}.");
                }
            }

            if (strpos($m, 'overdue') !== false) {
                return $this->createResponse("There are {$snapshot['tasks']['overdue']} overdue task(s).");
            }

            $count = $snapshot['tasks']['total'] ?? 0;

            return $this->createResponse("There are a total of {$count} tasks in the project.");

        } catch (Throwable $e) {
            Log::error('[QnA] Counting query failed', ['error' => $e->getMessage()]);

            return $this->createResponse('Unable to count tasks.');
        }
    }

    private function getWeeklyProgressReport(Project $project): array
    {
        try {
            $now = now();
            $weekStart = $now->copy()->startOfWeek();
            $weekEnd = $now->copy()->endOfWeek();
            $tasks = Task::where('project_id', $project->id)->get();
            $created = $tasks->whereBetween('created_at', [$weekStart, $weekEnd])->count();
            $completed = $tasks->where('status', 'done')->whereBetween('updated_at', [$weekStart, $weekEnd])->count();
            $inProgress = $tasks->where('status', 'inprogress')->count();
            $overdue = $tasks->filter(fn ($t) => $t->end_date && $t->status !== 'done' && $t->end_date->isPast())->count();
            $summary = "🗓 Weekly Progress Report\n";
            $summary .= 'Week: '.$weekStart->format('Y-m-d').' to '.$weekEnd->format('Y-m-d')."\n";
            $summary .= "Tasks created this week: {$created}\n";
            $summary .= "Tasks completed this week: {$completed}\n";
            $summary .= "Currently in progress: {$inProgress}\n";
            $summary .= "Overdue (not done): {$overdue}";

            return $this->createResponse($summary);
        } catch (Throwable $e) {
            Log::error('[QnA] Weekly progress failed', ['error' => $e->getMessage()]);

            return $this->createResponse('Unable to generate weekly progress report.');
        }
    }

    private function getProjectOverview(Project $project): array
    {
        try {
            $snap = $this->getSnapshotCached($project);
            $labels = $this->contextService->serverToMethodPhase($this->contextService->getCurrentMethodology($project));

            $overview = "📊 Project overview\n";
            $overview .= "Total tasks: {$snap['tasks']['total']}\n\n";
            $overview .= "By status:\n";
            $overview .= "- {$labels['todo']}: {$snap['tasks']['by_status']['todo']}\n";
            $overview .= "- {$labels['inprogress']}: {$snap['tasks']['by_status']['inprogress']}\n";
            $overview .= "- {$labels['review']}: {$snap['tasks']['by_status']['review']}\n";
            $overview .= "- {$labels['done']}: {$snap['tasks']['by_status']['done']}\n";

            // Add priority breakdown
            $overview .= "\nBy priority:\n";
            $overview .= "- Low: {$snap['tasks']['by_priority']['low']}\n";
            $overview .= "- Medium: {$snap['tasks']['by_priority']['medium']}\n";
            $overview .= "- High: {$snap['tasks']['by_priority']['high']}\n";
            $overview .= "- Urgent: {$snap['tasks']['by_priority']['urgent']}\n";

            if ($snap['tasks']['overdue'] > 0) {
                $overview .= "\n⚠️ Overdue tasks: {$snap['tasks']['overdue']}";
            }

            return $this->createResponse($overview);

        } catch (Throwable $e) {
            Log::error('[QnA] Project overview failed', ['error' => $e->getMessage()]);

            return $this->createResponse('Unable to generate project overview.');
        }
    }

    public function provideHelp(Project $project): array
    {
        $message = "I can help you with questions and commands. Try:\n\n";
        $message .= "Questions:\n";
        $message .= "- 'How many tasks are done?'\n";
        $message .= "- 'What are the task IDs?'\n";
        $message .= "- 'Show all tasks'\n";
        $message .= "- 'List overdue tasks'\n";
        $message .= "- 'Who is the owner?'\n";
        $message .= "- 'Show project overview'\n\n";
        $message .= "Commands:\n";
        $message .= "- 'Create task \"Fix login bug\"'\n";
        $message .= "- 'Move #42 to done'\n";
        $message .= "- 'Assign #42 to Alex'";

        return $this->createResponse($message);
    }

    private function sanitizeAnswer(string $text): string
    {
        // Remove fenced code blocks but preserve line breaks & bullet formatting
        $t = preg_replace('/```[\s\S]*?```/m', '', $text);
        // Normalize Windows line endings
        $t = str_replace("\r", '', $t);
        // Collapse >2 consecutive blank lines to a maximum of one
        $t = preg_replace("/\n{3,}/", "\n\n", $t);
        $t = trim($t);
        if (mb_strlen($t) > 1200) {
            $t = mb_substr($t, 0, 1200).'…';
        }

        return $t;
    }

    private function createResponse(string $message): array
    {
        return ['type' => 'information', 'message' => $message, 'requires_confirmation' => false];
    }

    /* =============================================================
     * New Enhancement Methods (Intent Classification & Ambiguity)
     * ===========================================================*/

    /**
     * Lightweight heuristic intent classifier (fast & no external calls)
     */
    private function classifyIntent(string $message, array $history): string
    {
        $m = strtolower($message);
        // Specific task pattern first (#123)
        if (preg_match('/#\d+/', $m)) {
            return 'task_specific';
        }
        if (preg_match('/\b(overview|snapshot|summary)\b/', $m)) {
            return 'overview';
        }
        if (preg_match('/\bhow\s+many\b|\bcount\b/', $m)) {
            return 'count_query';
        }
        if (preg_match('/\bassigned\s+to\s+(who|whom)\b/', $m)) {
            return 'task_assignments';
        }
        if (preg_match('/\b(team|member|members)\b/', $m)) {
            return 'team_info';
        }
        if (preg_match('/\b(task|tasks)\b.*\b(id|ids|list|show)\b/', $m)) {
            return 'task_list';
        }
        if (preg_match('/\b(ids?)\b/', $m) && $this->wasDiscussingTasks($history)) {
            return 'task_ids';
        }
        if (preg_match('/\b(weekly|progress)\b.*\b(report|summary)\b/', $m) || preg_match('/\bweekly\s+progress\b/', $m)) {
            return 'weekly_progress';
        }
        if (preg_match('/\b(why|how\s+did\s+you|explain)\b/', $m)) {
            return 'explanation';
        }
        // Potentially ambiguous pronoun referencing prior tasks
        if ($this->isAmbiguous($message, $history)) {
            return 'ambiguous';
        }

        return 'unknown';
    }

    /**
     * Detect if a query is ambiguous (pronouns + lack of anchor keywords)
     */
    private function isAmbiguous(string $message, array $history): bool
    {
        $m = strtolower(trim($message));
        // If explicitly references a task (#id) it's not ambiguous
        if (preg_match('/#\d+/', $m)) {
            return false;
        }

        $pronouns = ['it', 'they', 'them', 'that', 'this', 'those', 'these'];
        $hasPronoun = false;
        foreach ($pronouns as $p) {
            if (preg_match('/\b'.$p.'\b/', $m)) {
                $hasPronoun = true;
                break;
            }
        }
        if (! $hasPronoun) {
            return false;
        }

        // If contains domain anchors, not considered ambiguous
        if (preg_match('/\b(task|tasks|project|owner|team|member|id|ids|overview)\b/', $m)) {
            return false;
        }

        // Needs some prior history referencing tasks to treat as ambiguous follow-up
        if ($this->wasDiscussingTasks($history)) {
            return true;
        }

        return true; // pronoun without anchors
    }

    /**
     * Generate a clarifying prompt tailored to recent discussion
     */
    private function clarifyAmbiguous(string $message, array $history): string
    {
        $recentTasksMentioned = [];
        foreach (array_reverse($history) as $h) {
            if (preg_match_all('/#(\d+)/', $h['content'] ?? '', $m)) {
                foreach ($m[1] as $id) {
                    $recentTasksMentioned[$id] = true;
                }
            }
            if (count($recentTasksMentioned) >= 5) {
                break;
            } // cap
        }
        $ids = array_slice(array_keys($recentTasksMentioned), 0, 5);
        $idHint = empty($ids) ? '' : ' Recently referenced task IDs: '.implode(', ', array_map(fn ($i) => '#'.$i, $ids)).'.';

        return "I want to be precise. Could you specify which task or detail you mean? You can say things like: 'Show #42', 'List overdue tasks', or 'Who is assigned to #42'.".$idHint;
    }

    /**
     * Provide adaptive help referencing the inferred intent (if any)
     */
    private function adaptiveHelp(Project $project, string $intent = 'unknown'): array
    {
        if (in_array($intent, ['task_list', 'task_ids', 'task_specific', 'task_assignments', 'count_query', 'overview'])) {
            return $this->createResponse("I couldn't confidently answer that, but you can try a more specific phrasing. Examples: 'List all tasks', 'Show #12', 'How many tasks are done?', 'Project overview'.");
        }
        if ($intent === 'ambiguous') {
            return $this->createResponse($this->clarifyAmbiguous('[ambiguous]', []));
        }
        if ($intent === 'error') {
            return $this->createResponse('Something went wrong internally. Please retry or rephrase.');
        }

        return $this->provideHelp($project); // default comprehensive help
    }

    /* =============================================================
     * Caching & Explanation Helpers
     * ===========================================================*/

    private function getSnapshotCached(Project $project): array
    {
        $key = 'project_snapshot_v1_'.$project->id;

        return Cache::remember($key, 5, function () use ($project) {
            return $this->contextService->buildSnapshot($project);
        });
    }

    private function generateExplanation(array $history): ?string
    {
        // Look backwards for a counting response we produced (contains patterns like "There are" or "Comparison:")
        for ($i = count($history) - 1; $i >= 0; $i--) {
            $content = strtolower($history[$i]['content'] ?? '');
            if (str_contains($content, 'there are') || str_contains($content, 'comparison:')) {
                // Provide a generic rationale since we don't currently store raw computation steps
                return "Those numbers come from the current project snapshot in memory: we group tasks by status and priority, then count each group. You can refine by asking things like 'List high priority tasks' or 'done vs in progress'.";
            }
        }

        return null;
    }

    /* =============================================================
     * Keyword / Fuzzy Task Search
     * ===========================================================*/
    private function keywordSearchTasks(Project $project, string $needle): ?string
    {
        $needle = trim($needle);
        if ($needle === '') {
            return null;
        }

        $words = array_filter(preg_split('/\s+/', $needle));
        if (empty($words)) {
            return null;
        }

        $query = Task::where('project_id', $project->id);
        $query->where(function ($q) use ($words) {
            foreach ($words as $w) {
                $like = '%'.str_replace(['%', '_'], '', $w).'%';
                $q->where(function ($qq) use ($like) {
                    $qq->where('title', 'like', $like)
                        ->orWhere('description', 'like', $like);
                });
            }
        });
        $tasks = $query->limit(10)->get();
        if ($tasks->isEmpty()) {
            return null;
        }
        $out = 'Matched '.$tasks->count()." task(s):\n\n";
        foreach ($tasks as $t) {
            $out .= "• #{$t->id}: {$t->title} ({$t->status}, {$t->priority})\n";
        }
        if ($tasks->count() === 10) {
            $out .= '(Showing first 10 results)';
        }

        return $out;
    }
}
