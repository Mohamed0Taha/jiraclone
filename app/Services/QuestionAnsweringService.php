<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
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
            // Check if this needs conversation context (follow-up questions)
            $needsContext = $this->requiresConversationContext($originalMessage, $history);
            
            // For context-dependent queries, try LLM first if available
            if ($needsContext && env('OPENAI_API_KEY')) {
                try {
                    $llmAnswer = $this->questionAnswerWithOpenAI($project, $originalMessage, $history, $rephrasedQuestion);
                    if ($llmAnswer) return $llmAnswer;
                } catch (Throwable $e) {
                    Log::error('[QnA] Context-aware LLM answer failed', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            }
            
            // Try deterministic answer
            $deterministicAnswer = $this->answerQuestionEnhanced($project, $originalMessage, $history);
            if ($deterministicAnswer) return $deterministicAnswer['message'];

            // Fall back to LLM if not already tried
            if (!$needsContext && env('OPENAI_API_KEY')) {
                try {
                    $llmAnswer = $this->questionAnswerWithOpenAI($project, $originalMessage, $history, $rephrasedQuestion);
                    if ($llmAnswer) return $llmAnswer;
                } catch (Throwable $e) {
                    Log::error('[QnA] Fallback LLM answer failed', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            }

            return $this->provideHelp($project)['message'];
            
        } catch (Throwable $e) {
            Log::error('[QnA] Answer method failed', [
                'error' => $e->getMessage(),
                'message' => $originalMessage,
                'trace' => $e->getTraceAsString()
            ]);
            return $this->provideHelp($project)['message'];
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
                'it', 'its', 'that', 'this'
            ];
            
            // Check if message contains contextual references without specific identifiers
            foreach ($contextualPhrases as $phrase) {
                if (strpos($m, $phrase) !== false && !preg_match('/#\d+/', $m)) {
                    return true;
                }
            }
            
            // Check for context-dependent questions
            if (preg_match('/^(who|whom|whose|assigned to|belong|responsible|owns)/i', $m) && !preg_match('/(owner|team|member)/i', $m)) {
                return true;
            }
            
            // Very short questions often need context
            if (strlen($m) < 20 && !empty($history)) {
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

    private function questionAnswerWithOpenAI(Project $project, string $original, array $history, ?string $rephrased): ?string
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
                if (isset($msg['role']) && isset($msg['content']) && !empty($msg['content'])) {
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
                $questionWithContext = "[Follow-up question referring to previous context] " . $currentQuestion;
                $questionWithContext .= "\n[Remember to check the PROJECT_DATA for actual task IDs and details]";
            }
            
            $msgs[] = ['role' => 'user', 'content' => $questionWithContext];
            
            // Log the request for debugging
            Log::info('[QnA] Sending to OpenAI', [
                'question' => $currentQuestion,
                'task_count' => count($context['tasks'] ?? []),
                'has_context' => !empty($context),
                'history_count' => count($recentHistory)
            ]);

            $text = $this->openAIService->chatText($msgs, 0.2);
            
            if (trim($text)) {
                Log::info('[QnA] OpenAI response received', ['response_length' => strlen($text)]);
                return $this->sanitizeAnswer($text);
            }
            
            return null;
            
        } catch (Throwable $e) {
            Log::error('[QnA] OpenAI call failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }
    
    /**
     * Create a human-readable summary of the context for the system prompt
     */
    private function createContextSummary(array $context): string
    {
        $summary = "";
        
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

    private function answerQuestionEnhanced(Project $project, string $message, array $history = []): ?array
    {
        try {
            $m = strtolower(trim($message));

            // Handle queries about task IDs or listings - including follow-ups
            if (preg_match('/\b(task|tasks)\b.*\b(id|ids|list|show|what|which|detail|info)\b/i', $m) || 
                preg_match('/\b(what|which|show|list)\b.*\b(task|tasks|id|ids)\b/i', $m) ||
                preg_match('/\b(their|these|those)\s+(id|ids|task|tasks)\b/i', $m) ||
                (preg_match('/\b(id|ids)\b/i', $m) && $this->wasDiscussingTasks($history))) {
                return $this->getTaskDetails($project, $m);
            }

            // Handle "assigned to who?" type questions - check context
            if ((preg_match('/\bassigned\s+to\s+(who|whom)\b/i', $m) || 
                 preg_match('/^(who|whom)\b/i', $m)) && 
                $this->wasDiscussingTasks($history)) {
                return $this->getTaskAssignments($project);
            }

            // Handle specific task ID queries
            if (preg_match('/#?(\d+)/', $m)) {
                return $this->getSpecificTaskInfo($project, $m);
            }

            // Handle owner queries
            if (preg_match('/\bwho\b.*\b(owner|owns|created)\b/i', $m)) {
                $owner = $this->contextService->getProjectOwner($project);
                $info = $owner ? "Project owner: {$owner->name} ({$owner->email})" : "Project owner not found.";
                return $this->createResponse($info);
            }

            // Handle team/member queries
            if (preg_match('/\b(member|team)\b/i', $m)) {
                $members = $this->contextService->getProjectMembers($project);
                if (preg_match('/\bhow\s+many\b|\bcount\b/i', $m)) {
                    return $this->createResponse("There are ".$members->count()." project members.");
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
            if (preg_match('/\ball\s+tasks?\b/i', $m) && !preg_match('/\b(create|update|delete|move|assign)\b/i', $m)) {
                return $this->getAllTasksSummary($project);
            }

            return null;
            
        } catch (Throwable $e) {
            Log::error('[QnA] Deterministic answer failed', [
                'error' => $e->getMessage(),
                'message' => $message,
                'trace' => $e->getTraceAsString()
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
                return $this->createResponse("No tasks found in this project.");
            }
            
            $response = "Task assignments:\n\n";
            foreach ($tasks as $task) {
                $assignee = $task->assignee ? $task->assignee->name : "Unassigned";
                $response .= "• **Task #{$task->id}** ({$task->title}): {$assignee}\n";
            }
            
            return $this->createResponse($response);
        } catch (Throwable $e) {
            Log::error('[QnA] Task assignments failed', ['error' => $e->getMessage()]);
            return $this->createResponse("Unable to retrieve task assignments.");
        }
    }

    private function getTaskDetails(Project $project, string $message): array
    {
        try {
            $m = strtolower($message);
            $filters = [];
            
            // Check for status filters
            if (preg_match('/\b(todo|in\s?progress|review|done)\b/i', $m, $matches)) {
                $status = str_replace(' ', '', strtolower($matches[1]));
                $filters['status'] = $status;
            }
            
            // Check for priority filters
            if (preg_match('/\b(low|medium|high|urgent)\b/i', $m, $matches)) {
                $filters['priority'] = strtolower($matches[1]);
            }
            
            // Check for overdue filter
            if (strpos($m, 'overdue') !== false) {
                $filters['overdue'] = true;
            }
            
            // Check for unassigned filter
            if (strpos($m, 'unassigned') !== false) {
                $filters['unassigned'] = true;
            }

            // Build query and get tasks
            $query = $this->contextService->buildTaskQuery($project, $filters);
            $tasks = $query->with(['assignee', 'creator'])->get();

            if ($tasks->isEmpty()) {
                return $this->createResponse("No tasks found matching your criteria.");
            }

            // Format the response
            $response = $this->formatTaskList($tasks, $project);
            return $this->createResponse($response);
            
        } catch (Throwable $e) {
            Log::error('[QnA] Get task details failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->createResponse("Unable to retrieve task details.");
        }
    }

    private function getSpecificTaskInfo(Project $project, string $message): ?array
    {
        try {
            if (!preg_match('/#?(\d+)/', $message, $matches)) {
                return null;
            }
            
            $taskId = (int)$matches[1];
            $task = Task::where('project_id', $project->id)
                       ->where('id', $taskId)
                       ->with(['assignee', 'creator'])
                       ->first();
            
            if (!$task) {
                return $this->createResponse("Task #{$taskId} not found in this project.");
            }
            
            $methodology = $this->contextService->getCurrentMethodology($project);
            $labels = $this->contextService->serverToMethodPhase($methodology);
            
            $info = "**Task #{$task->id}**: {$task->title}\n";
            $info .= "• Status: {$labels[$task->status]}\n";
            $info .= "• Priority: {$task->priority}\n";
            
            if ($task->assignee) {
                $info .= "• Assigned to: {$task->assignee->name}\n";
            } else {
                $info .= "• Assigned to: Unassigned\n";
            }
            
            if ($task->end_date) {
                $info .= "• Due: {$task->end_date->format('Y-m-d')}";
                if ($task->end_date->isPast() && $task->status !== 'done') {
                    $info .= " (OVERDUE)";
                }
                $info .= "\n";
            }
            
            if ($task->description) {
                $info .= "• Description: {$task->description}\n";
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
                return $this->createResponse("No tasks found in this project.");
            }
            
            $response = $this->formatTaskList($tasks, $project);
            return $this->createResponse($response);
            
        } catch (Throwable $e) {
            Log::error('[QnA] Get all tasks failed', ['error' => $e->getMessage()]);
            return $this->createResponse("Unable to retrieve tasks.");
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
                    $response .= "• **Task #{$task->id}**: {$task->title}";
                    $response .= " ({$labels[$task->status]}, {$task->priority} priority";
                    
                    if ($task->assignee) {
                        $response .= ", assigned to {$task->assignee->name}";
                    } else {
                        $response .= ", unassigned";
                    }
                    
                    if ($task->end_date && $task->end_date->isPast() && $task->status !== 'done') {
                        $response .= ", **OVERDUE**";
                    }
                    
                    $response .= ")\n";
                }
            } else {
                // For many tasks, provide a summary with IDs
                $response = "Found {$count} {$taskWord}. Task IDs: ";
                $ids = $tasks->pluck('id')->sort()->values()->toArray();
                $response .= implode(', ', array_map(fn($id) => "#{$id}", $ids));
                
                // Add status breakdown
                $response .= "\n\nStatus breakdown:\n";
                $statusCounts = $tasks->groupBy('status')->map->count();
                foreach ($statusCounts as $status => $statusCount) {
                    if (isset($labels[$status])) {
                        $response .= "• {$labels[$status]}: {$statusCount}\n";
                    }
                }
            }
            
            return $response;
            
        } catch (Throwable $e) {
            Log::error('[QnA] Format task list failed', ['error' => $e->getMessage()]);
            return "Unable to format task list.";
        }
    }

    private function handleCountingQuery(Project $project, string $message): array
    {
        try {
            $snapshot = $this->contextService->buildSnapshot($project);
            $m = strtolower($message);

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
            return $this->createResponse("Unable to count tasks.");
        }
    }
    
    private function getProjectOverview(Project $project): array
    {
        try {
            $snap = $this->contextService->buildSnapshot($project);
            $labels = $this->contextService->serverToMethodPhase($this->contextService->getCurrentMethodology($project));
            
            $overview = "📊 **Project Overview**\n";
            $overview .= "Total Tasks: {$snap['tasks']['total']}\n\n";
            $overview .= "By Status:\n";
            $overview .= "• {$labels['todo']}: {$snap['tasks']['by_status']['todo']}\n";
            $overview .= "• {$labels['inprogress']}: {$snap['tasks']['by_status']['inprogress']}\n";
            $overview .= "• {$labels['review']}: {$snap['tasks']['by_status']['review']}\n";
            $overview .= "• {$labels['done']}: {$snap['tasks']['by_status']['done']}\n";
            
            // Add priority breakdown
            $overview .= "\nBy Priority:\n";
            $overview .= "• Low: {$snap['tasks']['by_priority']['low']}\n";
            $overview .= "• Medium: {$snap['tasks']['by_priority']['medium']}\n";
            $overview .= "• High: {$snap['tasks']['by_priority']['high']}\n";
            $overview .= "• Urgent: {$snap['tasks']['by_priority']['urgent']}\n";
            
            if ($snap['tasks']['overdue'] > 0) {
                $overview .= "\n⚠️ Overdue Tasks: {$snap['tasks']['overdue']}";
            }
            
            return $this->createResponse($overview);
            
        } catch (Throwable $e) {
            Log::error('[QnA] Project overview failed', ['error' => $e->getMessage()]);
            return $this->createResponse("Unable to generate project overview.");
        }
    }
    
    public function provideHelp(Project $project): array
    {
        $message = "I can help you with questions and commands. Try:\n\n";
        $message .= "**Questions:**\n";
        $message .= "• 'How many tasks are done?'\n";
        $message .= "• 'What are the task IDs?'\n";
        $message .= "• 'Show all tasks'\n";
        $message .= "• 'List overdue tasks'\n";
        $message .= "• 'Who is the owner?'\n";
        $message .= "• 'Show project overview'\n\n";
        $message .= "**Commands:**\n";
        $message .= "• 'Create task \"Fix login bug\"'\n";
        $message .= "• 'Move #42 to done'\n";
        $message .= "• 'Assign #42 to Alex'";
        return $this->createResponse($message);
    }

    private function sanitizeAnswer(string $text): string
    {
        $t = trim(preg_replace('/```[\s\S]*?```/m', '', $text));
        $t = preg_replace('/\s+/', ' ', $t);
        return mb_strlen($t) > 800 ? mb_substr($t, 0, 800) . '…' : $t;
    }

    private function createResponse(string $message): array
    {
        return ['type' => 'information', 'message' => $message, 'requires_confirmation' => false];
    }
}