<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * ProjectAssistantService
 *
 * What's new in this version (highlights):
 * - 🔎 LLM Router: Every user message is first sent to a lightweight OpenAI-based router
 *   that classifies it as a QUESTION or COMMAND. This fixes simple Q/A like
 *   “how many members?” and “members” by delegating to a Q&A mode with project context.
 * - 🧠 LLM Q&A Mode: If it's a question, we resubmit the question to OpenAI with a rich,
 *   sanitized project snapshot (owner, members, task stats) and constrained response rules
 *   (formatting, length, no secrets, no code), then return the answer to the user.
 * - 🛠️ LLM Command Mode: If it's a command, we ask OpenAI to output a *strict JSON plan*
 *   (type, filters, updates, etc.). We normalize/validate and then generate a preview.
 *   If the plan is invalid, we fall back to our deterministic parser + scaffolding.
 * - ✂️ “to review” ≠ assignment: Fixed a bug where “move 222 to review” incorrectly
 *   added an assignee “review”. We now only set assignee when the verb “assign” appears.
 * - ↔️ “second stage” understanding: Added ordinal-stage parsing so commands like
 *   “move tasks to second stage” map to the correct status based on the workflow order.
 * - 👥 NEW: Assignee-scoped filters everywhere. Understand “Alice’s tasks”, “for Alex”,
 *   “@marco”, “my tasks”, and “owner’s tasks” as filters (not assignment ops).
 * - 🧯 Safer errors: We never show raw exceptions; everything is logged server-side.
 * - 🧾 Creator ID fix: New tasks always set creator_id to the current user (fallback owner).
 *
 * NOTE: This file builds on the previous implementation; nothing critical was removed.
 */
class ProjectAssistantService
{
    // Canonical server-side statuses and priorities
    private const SERVER_STATUSES = ['todo', 'inprogress', 'review', 'done'];

    private const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    // Supported methodologies
    private const METH_KANBAN = 'kanban';

    private const METH_SCRUM = 'scrum';

    private const METH_AGILE = 'agile';

    private const METH_WATERFALL = 'waterfall';

    private const METH_LEAN = 'lean';

    // Regex helpers (still used as deterministic fallback)
    private const ACTION_PATTERNS = [
        'create' => [
            '/\b(?:create|add|new|make)\s+(?:a\s+)?(?:new\s+)?task\b/i',
            '/\btask:\s*(.+)$/i',
            '/\b(?:add|create)\s+"([^"]+)"\s+(?:as\s+)?task/i',
        ],
        'update' => [
            '/\b(?:update|change|modify|edit|set)\b/i',
            '/\b(?:move|transfer|shift)\s+(?:task|#?\d+)\b/i',
            '/\b(?:mark|set)\s+(?:task|#?\d+)\s+(?:as|to)\b/i',
        ],
        'delete' => [
            '/\b(?:delete|remove|destroy|purge|clear|erase)\b/i',
            '/\b(?:drop|trash|discard)\s+(?:task|#?\d+)\b/i',
        ],
        'assign' => [
            '/\b(?:assign|delegate|give|allocate)\s+(?:task|#?\d+)?\s*(?:to)?\b/i',
            '/\b(?:reassign|transfer\s+ownership)\b/i',
        ],
    ];

    private const QUESTION_PATTERNS = [
        '/^(?:what|which|who|where|when|how|why|is|are|do|does|can|could|will|would|should)\b/i',
        '/\?$/',
        '/\b(?:show|list|display|get|find|tell)\s+(?:me\s+)?(?:all\s+)?(?:the\s+)?/i',
        '/\b(?:how\s+many|count|total|number\s+of)\b/i',
        '/\b(?:status|state|progress|info|information|details?)\s+(?:of|about|for)?\b/i',
    ];

    /**
     * Entry point.
     * 1) Security check
     * 2) Route via LLM (question vs command)
     * 3) If QUESTION → LLM Q&A with project context
     * 4) If COMMAND → use LLM plan, then validate/preview; fallback to deterministic parser
     */
    public function processMessage(Project $project, string $message, array $conversationHistory = []): array
    {
        try {
            $message = trim((string) $message);
            if ($message === '') {
                return $this->createResponse('information', 'Please type a request.', false);
            }

            if ($this->looksLikeSecrets($message)) {
                return $this->createResponse(
                    'error',
                    "I can't process content that looks like secrets or credentials. Please remove any passwords or tokens.",
                    false
                );
            }

            // ---- 1) Try LLM router first (user requested this behavior) ----
            $route = $this->llmRoute($message, $conversationHistory);

            if (($route['kind'] ?? '') === 'question') {
                // LLM Q&A with project snapshot (owner, members, tasks, etc.)
                $answer = $this->questionAnswerWithOpenAI($project, $message, $conversationHistory, $route['question'] ?? null);
                if ($answer !== null) {
                    return $this->createResponse('information', $answer, false);
                }

                // Fallback to heuristic Q/A if LLM unavailable
                $heur = $this->answerQuestionEnhanced($project, $message);
                if ($heur !== null) {
                    return $heur;
                }

                // Last resort, guidance
                return $this->provideHelp($project);
            }

            if (($route['kind'] ?? '') === 'command') {
                // Prefer LLM-generated plan if valid; otherwise fall back
                $llmPlan = $this->normalizeLLMPlan($project, (array) ($route['plan'] ?? []));
                if (! empty($llmPlan['type'])) {
                    $llmPlan['type'] = $this->normalizeType($llmPlan['type']);
                    $val = $this->validatePlan($project, $llmPlan);
                    if ($val['_ok'] === true) {
                        $preview = $this->preview($project, $llmPlan, $this->currentMethodology($project));

                        return [
                            'type' => 'command',
                            'message' => $preview,
                            'command_data' => $llmPlan,
                            'requires_confirmation' => true,
                        ];
                    }
                }
            }

            // ---- 2) Deterministic parser/scaffolding (existing logic) ----
            $intent = $this->classifyIntentEnhanced($message);
            if ($intent === 'question') {
                $answer = $this->answerQuestionEnhanced($project, $message);
                if ($answer !== null) {
                    return $answer;
                }

                return $this->provideHelp($project);
            }

            $plan = $this->compileActionPlanEnhanced($project, $message, $conversationHistory);
            if (! empty($plan['_error'])) {
                return $this->createResponse('information', $plan['_error'], false);
            }

            if (! empty($plan['type'])) {
                $plan['type'] = $this->normalizeType($plan['type']);
            } else {
                $plan = $this->scaffoldedPlanSynthesis($project, $message, $conversationHistory);
            }

            if (empty($plan['type'])) {
                return $this->provideSuggestions($project, $message);
            }

            $validate = $this->validatePlan($project, $plan);
            if ($validate['_ok'] === false) {
                $repaired = $this->llmRepairPlan($project, $message, $conversationHistory, $plan, $validate['_why'] ?? '');
                if (! empty($repaired['type'])) {
                    $plan = $repaired;
                    $validate = $this->validatePlan($project, $plan);
                }
            }

            if ($validate['_ok'] === false) {
                return $this->createResponse('information', $validate['_why'], false);
            }

            $preview = $this->preview($project, $plan, $this->currentMethodology($project));

            return [
                'type' => 'command',
                'message' => $preview,
                'command_data' => $plan,
                'requires_confirmation' => true,
            ];
        } catch (Throwable $e) {
            $this->logException($e, [
                'where' => 'processMessage',
                'message' => $message,
                'project_id' => $project->id ?? null,
            ]);

            return $this->createResponse('error', 'Something went wrong. Please adjust and try again.', false);
        }
    }

    // -------------------------------------------------------------------------
    // LLM ROUTER + Q&A
    // -------------------------------------------------------------------------

    /**
     * Call OpenAI to classify message as { kind: 'question'|'command', question?, plan? }
     */
    private function llmRoute(string $message, array $history = []): array
    {
        $apiKey = (string) env('OPENAI_API_KEY', '');
        if ($apiKey === '') {
            // No API key → fallback to heuristics
            return [
                'kind' => $this->classifyIntentEnhanced($message) === 'question' ? 'question' : 'command',
            ];
        }

        $system = <<<'SYS'
You are a routing and parsing controller. Classify the user's last message as either:
- "question": The user is asking for information (counts, who/what/when, members, owner, list, status summary, etc.)
- "command": The user wants to change state (create/move/assign/delete/update tasks).

ALWAYS return a single JSON object with ONLY these keys:
{
  "kind": "question" | "command",
  "question": "<rephrased question, concise>",   // required if kind is "question"
  "plan": {
     "type": "create_task|task_update|task_delete|bulk_update|bulk_assign|bulk_delete|bulk_delete_overdue|bulk_delete_all",
     "selector": {"id": <int>},
     "payload": {"title": "...", "status": "todo|inprogress|review|done", "priority": "low|medium|high|urgent"},
     "changes": {"status": "...", "priority": "...", "assignee_hint": "...", "end_date": "YYYY-MM-DD", "title": "..."},
     "filters": {
        "all": true,
        "ids": [..],
        "status": "...",
        "priority": "...",
        "overdue": true,
        "unassigned": true,
        "assigned_to_hint": "name or email",
        "limit": 2,
        "order_by": "created_at",
        "order": "asc|desc"
     },
     "updates": {"status": "...", "priority": "..."},
     "assignee": "name or email"
  }
}

Normalization rules:
- Status must be one of: todo, inprogress, review, done (use "inprogress" for variants like "in progress").
- Priority must be one of: low, medium, high, urgent.
- If the user says "move tasks to second/third/fourth stage", map to: 1→todo, 2→inprogress, 3→review, 4→done.
- If the user mentions a person (e.g., "Alice's tasks", "for Alice", "@alice"), set filters.assigned_to_hint accordingly.
- If filters.assigned_to_hint is present, do NOT set filters.all unless the user explicitly says "all".
- For ambiguous inputs, pick your best guess; do not ask questions.
- NEVER include any text outside the single JSON object.
SYS;

        $msgs = [
            ['role' => 'system', 'content' => $system],
        ];

        // Include at most a few last history turns for better disambiguation
        $tail = array_slice($history, max(0, count($history) - 6));
        foreach ($tail as $h) {
            $role = ($h['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
            $content = (string) ($h['content'] ?? '');
            if ($content !== '') {
                $msgs[] = ['role' => $role, 'content' => $content];
            }
        }
        $msgs[] = ['role' => 'user', 'content' => $message];

        try {
            $resp = $this->openAiChatJson($msgs, 0.1);
            if (is_array($resp) && isset($resp['kind'])) {
                return $resp;
            }
        } catch (Throwable $e) {
            $this->logException($e, ['where' => 'llmRoute']);
        }

        // Fallback heuristics
        return [
            'kind' => $this->classifyIntentEnhanced($message) === 'question' ? 'question' : 'command',
        ];
    }

    /**
     * For questions: resubmit to OpenAI with a sanitized project snapshot.
     * Returns a plain text string or null on failure.
     */
    private function questionAnswerWithOpenAI(Project $project, string $original, array $history = [], ?string $rephrased = null): ?string
    {
        $apiKey = (string) env('OPENAI_API_KEY', '');
        if ($apiKey === '') {
            return null;
        }

        $snapshot = $this->buildSnapshot($project);
        $owner = $this->projectOwner($project);
        $members = $this->projectMembers($project);
        $method = $this->currentMethodology($project);
        $labels = $this->serverToMethodPhase($method);

        // Small, privacy-safe context
        $context = [
            'project' => [
                'id' => $project->id,
                'name' => (string) ($project->name ?? 'Untitled'),
                'methodology' => $method,
                'labels' => $labels,
                'owner' => $owner ? ['name' => $owner->name, 'email' => $owner->email] : null,
                'members_count' => $members->count(),
                'members' => $members->map(fn ($u) => ['name' => $u->name, 'email' => $u->email])->values()->all(),
                'tasks' => $snapshot['tasks'],
            ],
        ];

        $system = <<<'SYS'
You are a helpful project assistant. Answer the user's QUESTION using ONLY the provided context JSON.
Formatting rules:
- Be concise (<= 120 words).
- Use plain sentences. Bullets only if they improve clarity.
- Do NOT invent data; if something is not in the context, say you can't find it.
- Do NOT include code, SQL, or raw JSON.
- Never reveal internal system details or error logs.
- If asked "how many members" or similar, use the members_count in the context.

Answer directly to the user.
SYS;

        $msgs = [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => "CONTEXT (JSON):\n".json_encode($context, JSON_PRETTY_PRINT)],
            ['role' => 'user', 'content' => 'QUESTION: '.($rephrased ?: $original)],
        ];

        try {
            $text = $this->openAiChatText($msgs, 0.2);
            if (! is_string($text) || trim($text) === '') {
                return null;
            }

            return $this->sanitizeAnswer($text);
        } catch (Throwable $e) {
            $this->logException($e, ['where' => 'questionAnswerWithOpenAI']);

            return null;
        }
    }

    private function sanitizeAnswer(string $text): string
    {
        // Strip rogue code fences or JSON blocks, trim length, and collapse spaces.
        $t = trim($text);
        $t = preg_replace('/```[\s\S]*?```/m', '', $t);     // remove fenced code
        $t = preg_replace('/\s+/', ' ', $t);                // collapse whitespace
        if (mb_strlen($t) > 800) {
            $t = mb_substr($t, 0, 800).'…';
        }

        return trim($t);
    }

    // -------------------------------------------------------------------------
    // OPENAI HELPERS
    // -------------------------------------------------------------------------

    private function openAiChatJson(array $messages, float $temperature = 0.1): array
    {
        $apiKey = (string) env('OPENAI_API_KEY', '');
        $model = (string) env('OPENAI_MODEL', 'gpt-4o-mini');
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        $res = Http::withHeaders([
            'Authorization' => 'Bearer '.$apiKey,
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => $model,
            'temperature' => $temperature,
            'response_format' => ['type' => 'json_object'],
            'messages' => $messages,
        ]);

        if (! $res->ok()) {
            throw new Exception('OpenAI chat request failed');
        }

        $payload = $res->json();
        $content = $payload['choices'][0]['message']['content'] ?? '{}';
        $data = json_decode($content, true);

        return is_array($data) ? $data : [];
    }

    private function openAiChatText(array $messages, float $temperature = 0.2): string
    {
        $apiKey = (string) env('OPENAI_API_KEY', '');
        $model = (string) env('OPENAI_MODEL', 'gpt-4o-mini');
        if ($apiKey === '') {
            throw new Exception('OpenAI API key missing');
        }

        $res = Http::withHeaders([
            'Authorization' => 'Bearer '.$apiKey,
            'Content-Type' => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => $model,
            'temperature' => $temperature,
            'messages' => $messages,
        ]);

        if (! $res->ok()) {
            throw new Exception('OpenAI chat request failed');
        }

        $payload = $res->json();
        $text = $payload['choices'][0]['message']['content'] ?? '';

        return (string) $text;
    }

    // -------------------------------------------------------------------------
    // DETERMINISTIC INTENT & PARSING (existing, refined)
    // -------------------------------------------------------------------------

    private function classifyIntentEnhanced(string $message): string
    {
        $m = strtolower(trim($message));

        foreach (self::QUESTION_PATTERNS as $pattern) {
            if (preg_match($pattern, $m)) {
                if (! $this->hasStrongActionVerb($m)) {
                    return 'question';
                }
            }
        }

        foreach (self::ACTION_PATTERNS as $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $m)) {
                    return 'action';
                }
            }
        }

        if ($this->isLikelyQuestion($m)) {
            return 'question';
        }

        return 'action';
    }

    private function hasStrongActionVerb(string $message): bool
    {
        $verbs = ['create', 'add', 'delete', 'remove', 'update', 'change', 'modify', 'move', 'assign', 'set', 'mark', 'make', 'clear', 'purge'];
        foreach ($verbs as $verb) {
            if (preg_match('/\b'.$verb.'\b/i', $message)) {
                return true;
            }
        }

        return false;
    }

    private function isLikelyQuestion(string $message): bool
    {
        $indicators = ['how many', 'what is', 'what are', 'who is', 'members', 'member', 'overview', 'summary', 'report', 'statistics'];
        foreach ($indicators as $i) {
            if (strpos($message, $i) !== false) {
                return true;
            }
        }

        return false;
    }

    private function answerQuestionEnhanced(Project $project, string $message): ?array
    {
        $m = strtolower(trim($message));
        $method = $this->currentMethodology($project);

        // Common Qs: owner
        if (preg_match('/\bwho\b.*\b(owner|owns|created|manages?)\b/i', $m)) {
            return $this->getProjectOwnerInfo($project);
        }

        // Members / member count (handle typos like "memebrs")
        if (preg_match('/\b(member|memebr|memebrs|members)\b/i', $m) || preg_match('/\bteam\b/i', $m)) {
            $members = $this->projectMembers($project);
            if (preg_match('/\bhow\s+many\b|\bnumber\b|\bcount\b/i', $m)) {
                return $this->createResponse('information', 'Project members: '.$members->count(), false);
            }
            if ($members->isEmpty()) {
                return $this->createResponse('information', 'No team members found.', false);
            }
            $names = $members->pluck('name')->all();

            return $this->createResponse('information', 'Team members: '.implode(', ', $names), false);
        }

        // “How many tasks are done?”
        if (preg_match('/\b(todo|in\s?progress|review|done)\b/i', $m) || preg_match('/\bhow\s+many\b/i', $m)) {
            return $this->handleCountingQuery($project, $m, $method);
        }

        // Overview
        if ($this->wantsOverview($message)) {
            return $this->getProjectOverview($project);
        }

        return null;
    }

    /**
     * Infer a plan from conversation history when the user references a previous action
     * or uses contextual refinements without specifying the full command.
     */
    private function inferPlanFromHistory(Project $project, array $history): array
    {
        // Look through recent history for actionable commands
        $recentHistory = array_slice($history, -10); // Look at last 10 messages

        foreach (array_reverse($recentHistory) as $entry) {
            $role = $entry['role'] ?? '';
            $content = $entry['content'] ?? '';

            // Skip assistant messages
            if ($role === 'assistant') {
                continue;
            }

            $contentLower = strtolower(trim($content));

            // Check if this was a command that could be referenced
            if ($this->looksLikeCommand($contentLower)) {
                // Try to extract the command type and context
                $inferredPlan = $this->extractPlanFromMessage($project, $content);
                if (! empty($inferredPlan['type'])) {
                    return $inferredPlan;
                }
            }

            // Check for recent mentions of bulk operations
            if (preg_match('/\b(move|update|assign|delete)\s+(all|tasks?)\b/i', $contentLower)) {
                // Try to build a plan from this reference
                $plan = $this->compileActionPlanEnhanced($project, $content, []);
                if (! empty($plan['type'])) {
                    return $plan;
                }
            }
        }

        // Look for implicit context from the last user message
        if (! empty($recentHistory)) {
            $lastUserMessage = null;
            foreach (array_reverse($recentHistory) as $entry) {
                if (($entry['role'] ?? '') !== 'assistant') {
                    $lastUserMessage = $entry['content'] ?? '';
                    break;
                }
            }

            if ($lastUserMessage) {
                // Check for status mentions that might imply a move operation
                if (preg_match('/\b(todo|inprogress|in progress|review|done)\b/i', $lastUserMessage, $matches)) {
                    $status = $this->resolveStatusToken($project, $matches[1]);
                    if ($status) {
                        return [
                            'type' => 'bulk_update',
                            'filters' => ['all' => true],
                            'updates' => ['status' => $status],
                        ];
                    }
                }

                // Check for priority mentions that might imply a priority update
                if (preg_match('/\b(low|medium|high|urgent)\s*(?:priority)?\b/i', $lastUserMessage, $matches)) {
                    $priority = $this->resolvePriorityToken($matches[1]);
                    if ($priority) {
                        return [
                            'type' => 'bulk_update',
                            'filters' => ['all' => true],
                            'updates' => ['priority' => $priority],
                        ];
                    }
                }
            }
        }

        // No clear plan could be inferred
        return [];
    }

    /**
     * Helper to check if a message looks like a command
     */
    private function looksLikeCommand(string $message): bool
    {
        $commandIndicators = [
            'create', 'add', 'new', 'make',
            'update', 'change', 'modify', 'edit', 'set',
            'move', 'transfer', 'shift',
            'delete', 'remove', 'destroy', 'purge', 'clear',
            'assign', 'delegate', 'give', 'allocate',
            'mark',
        ];

        foreach ($commandIndicators as $indicator) {
            if (preg_match('/\b'.$indicator.'\b/i', $message)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract a plan from a message that looks like a command
     */
    private function extractPlanFromMessage(Project $project, string $message): array
    {
        $messageLower = strtolower(trim($message));

        // Move/status change commands
        if (preg_match('/\bmove\s+(?:all\s+)?(?:tasks?\s+)?(?:to|into)\s+([a-z\- ]+)/i', $message, $matches)) {
            $status = $this->resolveStatusToken($project, $matches[1]);
            if ($status) {
                return [
                    'type' => 'bulk_update',
                    'filters' => ['all' => true],
                    'updates' => ['status' => $status],
                ];
            }
        }

        // Assign commands
        if (preg_match('/\bassign\s+(?:all\s+)?(?:tasks?\s+)?(?:to)\s+([a-z0-9._@\- ]+)/i', $message, $matches)) {
            return [
                'type' => 'bulk_assign',
                'filters' => ['all' => true],
                'assignee' => trim($matches[1]),
            ];
        }

        // Delete commands
        if (preg_match('/\bdelete\s+(?:all\s+)?(?:tasks?\s+)?/i', $message)) {
            if (strpos($messageLower, 'all') !== false) {
                return ['type' => 'bulk_delete_all'];
            }
            if (strpos($messageLower, 'overdue') !== false) {
                return ['type' => 'bulk_delete_overdue'];
            }

            return [
                'type' => 'bulk_delete',
                'filters' => ['all' => true],
            ];
        }

        // Priority update commands
        if (preg_match('/\b(?:set|change|update)\s+(?:all\s+)?priority\s+(?:to|as)\s+(low|medium|high|urgent)\b/i', $message, $matches)) {
            $priority = $this->resolvePriorityToken($matches[1]);
            if ($priority) {
                return [
                    'type' => 'bulk_update',
                    'filters' => ['all' => true],
                    'updates' => ['priority' => $priority],
                ];
            }
        }

        // Create task commands
        if (preg_match('/\b(?:create|add|new|make)\s+(?:a\s+)?(?:new\s+)?task\b/i', $message)) {
            // For create, we can't infer much without the title
            return [];
        }

        return [];
    }

    private function compileActionPlanEnhanced(Project $project, string $message, array $history = []): array
    {
        $m = trim($message);
        $mLow = strtolower($m);

        // Ordinal refinement like "only the first two"
        $ordinal = $this->parseOrdinalWindow($mLow);
        if ($ordinal) {
            $ctxPlan = $this->inferPlanFromHistory($project, $history);
            if (! empty($ctxPlan)) {
                if (in_array($ctxPlan['type'], ['bulk_update', 'bulk_assign', 'bulk_delete'], true)) {
                    $ctxPlan['filters'] = array_merge($ctxPlan['filters'] ?? [], $ordinal);
                } elseif ($ctxPlan['type'] === 'task_update' && ! empty($ordinal['limit']) && $ordinal['limit'] > 1) {
                    $filters = $this->parseFiltersEnhanced($project, 'all tasks');
                    $ctxPlan = $this->createBulkUpdatePlan($filters, $ctxPlan['changes'] ?? []);
                    $ctxPlan['filters'] = array_merge($ctxPlan['filters'], $ordinal);
                } else {
                    $guessed = $this->parseBulkUpdates($project, $mLow);
                    if (empty($guessed)) {
                        $guessed = $ctxPlan['updates'] ?? $ctxPlan['changes'] ?? [];
                    }
                    if (! empty($guessed)) {
                        $ctxPlan = $this->createBulkUpdatePlan(['all' => true], $guessed);
                        $ctxPlan['filters'] = array_merge($ctxPlan['filters'], $ordinal);
                    }
                }

                return $ctxPlan;
            }
            $updates = $this->parseBulkUpdates($project, $mLow);
            if (! empty($updates)) {
                $plan = $this->createBulkUpdatePlan(['all' => true], $updates);
                $plan['filters'] = array_merge($plan['filters'], $ordinal);

                return $plan;
            }
        }

        // Move tasks to Nth stage/column
        if (preg_match('/\bmove\s+(?:all\s+)?tasks?\s+(?:to|into)\s+(?:the\s+)?(first|second|third|fourth)\s+(?:stage|column|phase)\b/i', $mLow, $mm)) {
            $status = $this->nthStageToStatus($project, strtolower($mm[1]));
            if ($status) {
                return $this->createBulkUpdatePlan(['all' => true], ['status' => $status]);
            }
        }

        // Create task "Title"
        if (preg_match('/\b(?:create|add|new|make)\s+(?:a\s+)?(?:new\s+)?task\s+(?:called\s+|named\s+|titled\s+)?["\']?(.+?)["\']?$/i', $m, $matches)) {
            $title = trim($matches[1]);
            if ($title !== '') {
                return $this->createTaskPlan($title);
            }
        }

        // "Task: Title"
        if (preg_match('/^task:\s*(.+)$/i', $m, $matches)) {
            $potentialTitle = trim($matches[1]);
            if (strlen($potentialTitle) > 2) {
                return $this->createTaskPlan($potentialTitle);
            }
        }

        // Delete patterns
        if (preg_match('/\b(?:delete|remove|destroy|purge|drop)\b/i', $m)) {
            return $this->parseDeleteCommand($project, $m);
        }

        // UPDATE specific task by id
        if (preg_match('/#?(\d+)/', $m, $idMatch)) {
            $taskId = (int) $idMatch[1];
            $updates = $this->parseTaskUpdates($project, $m, $taskId);
            if (! empty($updates)) {
                return $this->createTaskUpdatePlan($taskId, $updates);
            }
        }

        // BULK operations (filters + updates)
        $filters = $this->parseFiltersEnhanced($project, $m);
        $updates = $this->parseBulkUpdates($project, $m);

        if (! empty($updates)) {
            if (empty($filters)) {
                $filters = ['all' => true];
            }
            if ($ordinal) {
                $filters = array_merge($filters, $ordinal);
            }

            return $this->createBulkUpdatePlan($filters, $updates);
        }

        // ASSIGN
        if (preg_match('/\bassign\b.*?\bto\s+([a-z0-9._@\- ]+)/i', $m, $matches)) {
            $plan = $this->parseAssignCommand($project, $m, $matches[1]);
            if ($ordinal) {
                $plan['filters'] = array_merge($plan['filters'] ?? [], $ordinal);
            }

            return $plan;
        }

        // STATUS change shorthand (just status word)
        $status = $this->resolveStatusToken($project, $m);
        if ($status) {
            $plan = $this->createBulkUpdatePlan(['all' => true], ['status' => $status]);
            if ($ordinal) {
                $plan['filters'] = array_merge($plan['filters'], $ordinal);
            }

            return $plan;
        }

        // LLM synthesis fallback
        return $this->synthesizeWithLLMEnhanced($project, $message, $history);
    }

    private function parseTaskUpdates(Project $project, string $message, int $taskId): array
    {
        $updates = [];
        $m = strtolower($message);

        // Priority
        if (preg_match('/\bpriority\b/i', $m) && preg_match('/\b(low|medium|high|urgent|critical|blocker|p[0-3])\b/i', $m, $matches)) {
            $priority = $this->resolvePriorityToken($matches[1]);
            if ($priority) {
                $updates['priority'] = $priority;
            }
        }

        // Status (to/in <status>)
        if (preg_match('/\b(?:move|set|mark|status)\b.*?\b(?:to|in|as)\s+([a-z\- ]+)\b/i', $m, $matches)) {
            $status = $this->resolveStatusToken($project, $matches[1]);
            if ($status) {
                $updates['status'] = $status;
            }
        }

        // Assignment (ONLY if the verb "assign" is present; prevents "to review" confusion)
        if (preg_match('/\bassign\b.*?\bto\s+([a-z0-9._@\- ]+)/i', $m, $matches)) {
            $updates['assignee_hint'] = trim($matches[1]);
        }

        // Due date
        if (preg_match('/\b(?:due|deadline)\s+(?:on|by|at)?\s*(.+?)(?:\s|$)/i', $m, $matches)) {
            $date = $this->parseDate($matches[1]);
            if ($date) {
                $updates['end_date'] = $date->toDateString();
            }
        }

        // Title rename
        if (preg_match('/\b(?:title|rename|set\s+title)\b.*?"([^"]+)"/i', $m, $matches)) {
            $updates['title'] = trim($matches[1]);
        }

        return $updates;
    }

    private function parseBulkUpdates(Project $project, string $message): array
    {
        $updates = [];
        $m = strtolower($message);

        // Move … to <status>
        if (preg_match('/\bmove\s+(?:all\s+)?(?:tasks?\s+)?(?:from\s+)?([a-z\- ]+)?\s*(?:to|into)\s+([a-z\- ]+)/i', $m, $matches)) {
            $toStatus = $this->resolveStatusToken($project, $matches[2]);
            if ($toStatus) {
                $updates['status'] = $toStatus;
            }
        }

        // Set all to <status>
        if (preg_match('/\b(?:set|change|update)\s+(?:all\s+)?(?:tasks?\s+)?(?:to|as)\s+([a-z\- ]+)/i', $m, $matches)) {
            $status = $this->resolveStatusToken($project, $matches[1]);
            if ($status) {
                $updates['status'] = $status;
            }
        }

        // Bulk priority
        if (preg_match('/\b(?:set|change|update)\s+(?:all\s+)?priority\s+(?:to|as)\s+(low|medium|high|urgent)\b/i', $m, $matches)) {
            $priority = $this->resolvePriorityToken($matches[1]);
            if ($priority) {
                $updates['priority'] = $priority;
            }
        }

        // "…to second/third stage"
        if (preg_match('/\b(?:to|into)\s+(?:the\s+)?(first|second|third|fourth)\s+(?:stage|column|phase)\b/i', $m, $mm)) {
            $status = $this->nthStageToStatus($project, strtolower($mm[1]));
            if ($status) {
                $updates['status'] = $status;
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

        if (preg_match('/\b(?:in|from|with\s+status)\s+([a-z\- ]+)/i', $m, $matches)) {
            $status = $this->resolveStatusToken($project, $matches[1]);
            if ($status) {
                $filters['status'] = $status;
            }
        }

        if (preg_match('/\b(low|medium|high|urgent)\s+(?:priority\s+)?tasks?\b/i', $m, $matches)) {
            $priority = $this->resolvePriorityToken($matches[1]);
            if ($priority) {
                $filters['priority'] = $priority;
            }
        }

        if (strpos($m, 'overdue') !== false) {
            $filters['overdue'] = true;
        }
        if (preg_match('/\b(?:unassigned|not\s+assigned|no\s+assignee)\b/i', $m)) {
            $filters['unassigned'] = true;
        }

        // Existing basic "assigned to X" phrasing
        if (preg_match('/\bassigned\s+to\s+([a-z0-9._@\- ]+)/i', $m, $matches)) {
            $filters['assigned_to_hint'] = trim($matches[1]);
        }

        // --- Assignee scoping (expanded coverage) ---

        // 2.1 Phrases like "for Alice", "to Alice" (as filter scope)
        if (empty($filters['assigned_to_hint']) && preg_match('/\b(?:for|to)\s+(@?[a-z0-9._\-]+(?:\s+[a-z0-9._\-]+)*)\b/i', $m, $mm)) {
            $filters['assigned_to_hint'] = ltrim(trim($mm[1]), '@');
        }

        // 2.2 Possessive: "Alice's tasks"
        if (empty($filters['assigned_to_hint']) && preg_match("/\b([A-Za-z][A-Za-z.'\-]+(?:\s+[A-Za-z][A-Za-z.'\-]+)?)'?s\s+tasks?\b/u", $message, $mm)) {
            $filters['assigned_to_hint'] = trim($mm[1]);
        }

        // 2.3 Any email in the message
        if (empty($filters['assigned_to_hint']) && preg_match('/\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/i', $message, $mm)) {
            $filters['assigned_to_hint'] = strtolower($mm[0]);
        }

        // 2.4 Pronouns: "my tasks", "for me"
        if (empty($filters['assigned_to_hint']) && preg_match('/\b(my|me|mine)\b/i', $m)) {
            $filters['assigned_to_hint'] = '__ME__';
        }

        // 2.5 Owner: "owner's tasks", "for the owner"
        if (empty($filters['assigned_to_hint']) && (preg_match("/\bowner(?:'s)?\s+tasks?\b/i", $m) || preg_match('/\bfor\s+the\s+owner\b/i', $m))) {
            $filters['assigned_to_hint'] = '__OWNER__';
        }

        if (preg_match('/\ball\s+tasks?\b/i', $m)) {
            $filters['all'] = true;
        }

        $ordinal = $this->parseOrdinalWindow($m);
        if ($ordinal) {
            $filters = array_merge($filters, $ordinal);
        }

        return $filters;
    }

    private function synthesizeWithLLMEnhanced(Project $project, string $message, array $history = []): array
    {
        $apiKey = (string) env('OPENAI_API_KEY', '');
        if ($apiKey === '') {
            return ['type' => null];
        }

        $method = $this->currentMethodology($project);
        $labels = $this->serverToMethodPhase($method);

        $systemPrompt = $this->buildLLMSystemPrompt($method, $labels);
        $msgs = [['role' => 'system', 'content' => $systemPrompt]];

        foreach ($history as $h) {
            $role = ($h['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
            $content = (string) ($h['content'] ?? '');
            if ($content !== '') {
                $msgs[] = ['role' => $role, 'content' => $content];
            }
        }
        $msgs[] = ['role' => 'user', 'content' => $message];

        try {
            $res = $this->openAiChatJson($msgs, 0.1);
            $plan = is_array($res) ? $res : [];
            if (! is_array($plan) || empty($plan['type'])) {
                return ['type' => null];
            }

            $plan = $this->normalizeLLMPlan($project, $plan);
            if (! empty($plan['type'])) {
                $plan['type'] = $this->normalizeType($plan['type']);
            }
            $validate = $this->validatePlan($project, $plan);
            if ($validate['_ok'] === false) {
                return ['type' => null];
            }

            return $plan;
        } catch (Throwable $e) {
            $this->logException($e, ['where' => 'synthesizeWithLLMEnhanced']);

            return ['type' => null];
        }
    }

    private function scaffoldedPlanSynthesis(Project $project, string $message, array $history): array
    {
        $initial = $this->synthesizeWithLLMEnhanced($project, $message, $history);
        if (! empty($initial['type'])) {
            $val = $this->validatePlan($project, $initial);
            if ($val['_ok']) {
                return $initial;
            }
        }

        $why = 'Unclear or incomplete action. Provide explicit type, filters/selectors, and updates/payload.';
        $repaired = $this->llmRepairPlan($project, $message, $history, $initial ?: [], $why);

        if (! empty($repaired['type'])) {
            $val2 = $this->validatePlan($project, $repaired);
            if ($val2['_ok']) {
                return $repaired;
            }
        }

        return ['type' => null];
    }

    private function llmRepairPlan(Project $project, string $message, array $history, array $badPlan, string $why): array
    {
        $apiKey = (string) env('OPENAI_API_KEY', '');
        if ($apiKey === '') {
            return ['type' => null];
        }

        $method = $this->currentMethodology($project);
        $labels = $this->serverToMethodPhase($method);

        $system = $this->buildLLMSystemPrompt($method, $labels)."\nIMPORTANT: The previous plan was invalid because: ".$why."\nRepair it.";

        $msgs = [
            ['role' => 'system', 'content' => $system],
        ];

        foreach ($history as $h) {
            $role = ($h['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
            $content = (string) ($h['content'] ?? '');
            if ($content !== '') {
                $msgs[] = ['role' => $role, 'content' => $content];
            }
        }

        $msgs[] = ['role' => 'assistant', 'content' => json_encode($badPlan)];
        $msgs[] = ['role' => 'user', 'content' => $message];

        try {
            $res = $this->openAiChatJson($msgs, 0.1);
            $plan = is_array($res) ? $res : [];
            if (! is_array($plan) || empty($plan['type'])) {
                return ['type' => null];
            }

            $plan = $this->normalizeLLMPlan($project, $plan);
            $plan['type'] = $this->normalizeType($plan['type']);

            return $plan;
        } catch (Throwable $e) {
            $this->logException($e, ['where' => 'llmRepairPlan']);

            return ['type' => null];
        }
    }

    private function buildLLMSystemPrompt(string $method, array $labels): string
    {
        return implode("\n", [
            'You are a strict command planner for a Laravel task management system.',
            "Current methodology: {$method}",
            "Status mapping: todo={$labels['todo']}, inprogress={$labels['inprogress']}, review={$labels['review']}, done={$labels['done']}",
            '',
            'Return ONLY a valid JSON object with this structure:',
            '{',
            '  "type": "create_task|task_update|task_delete|bulk_update|bulk_assign|bulk_delete|bulk_delete_overdue|bulk_delete_all",',
            '  "selector": {"id": <task_id>},',
            '  "payload": {"title": "...", "status": "todo", "priority": "medium"},',
            '  "changes": {"status": "...", "priority": "...", "assignee_hint": "...", "end_date": "YYYY-MM-DD", "title":"..."},',
            '  "filters": {"all": true, "ids": [], "status": "...", "priority": "...", "overdue": true, "unassigned": true, "assigned_to_hint":"name or email", "limit": 2, "order_by": "created_at", "order": "asc|desc"},',
            '  "updates": {"status": "...", "priority": "..."},',
            '  "assignee": "name or email"',
            '}',
            '',
            'Rules:',
            '1. Normalize statuses to: todo, inprogress, review, done.',
            '2. Normalize priorities to: low, medium, high, urgent.',
            "3. Recognize assignee scoping like \"Alice's tasks\", \"for Alice\", \"@alice\" and set filters.assigned_to_hint. Do NOT set filters.all if this is present unless the user says \"all\".",
            "4. Recognize ordinal refinements like 'first two', 'last 3', 'top 5' and set filters.limit + order.",
            "5. Map 'first/second/third/fourth stage' to: 1→todo, 2→inprogress, 3→review, 4→done.",
            '6. For unclear input, return an empty object {}.',
        ]);
    }

    // -------------------------------------------------------------------------
    // RESPONSES & PLAN HELPERS
    // -------------------------------------------------------------------------

    private function createResponse(string $type, string $message, bool $requiresConfirmation, array $data = []): array
    {
        $response = [
            'type' => $type,
            'message' => $message,
            'requires_confirmation' => $requiresConfirmation,
        ];
        if (! empty($data)) {
            $response['data'] = $data;
        }
        if ($type === 'information') {
            $response['ui'] = ['show_snapshot' => ! empty($data)];
        }

        return $response;
    }

    private function createTaskPlan(string $title): array
    {
        return [
            'type' => 'create_task',
            'payload' => [
                'title' => $title,
                'status' => 'todo',
                'priority' => 'medium',
            ],
        ];
    }

    private function createTaskUpdatePlan(int $taskId, array $changes): array
    {
        return [
            'type' => 'task_update',
            'selector' => ['id' => $taskId],
            'changes' => $changes,
        ];
    }

    private function createBulkUpdatePlan(array $filters, array $updates): array
    {
        return [
            'type' => 'bulk_update',
            'filters' => $filters,
            'updates' => $updates,
        ];
    }

    private function parseDeleteCommand(Project $project, string $message): array
    {
        $m = strtolower($message);

        if (preg_match('/#?(\d+)/', $message, $matches)) {
            $taskId = (int) $matches[1];
            $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();
            if (! $task) {
                return ['_error' => "Task #{$taskId} not found in this project."];
            }

            return ['type' => 'task_delete', 'selector' => ['id' => $taskId]];
        }

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

        return ['_error' => 'Please specify which tasks to delete.'];
    }

    private function parseAssignCommand(Project $project, string $message, string $assignee): array
    {
        $assignee = trim($assignee);

        if (preg_match('/#?(\d+)/', $message, $matches)) {
            $taskId = (int) $matches[1];

            return $this->createTaskUpdatePlan($taskId, ['assignee_hint' => $assignee]);
        }

        $filters = $this->parseFiltersEnhanced($project, $message);
        if (empty($filters)) {
            $filters = ['all' => true];
        }

        return [
            'type' => 'bulk_assign',
            'filters' => $filters,
            'assignee' => $assignee,
        ];
    }

    private function getProjectOwnerInfo(Project $project): array
    {
        $owner = $this->projectOwner($project);
        $name = $owner ? $owner->name : 'Unknown';
        $email = $owner ? $owner->email : '';
        $message = "Project owner: {$name}".($email ? " ({$email})" : '');

        return $this->createResponse('information', $message, false);
    }

    private function handleCountingQuery(Project $project, string $message, string $method): array
    {
        $m = strtolower($message);

        if (preg_match('/\b(todo|in\s?progress|review|done)\b/i', $m, $sm)) {
            $status = $this->resolveStatusToken($project, $sm[1]);
            if ($status) {
                $count = Task::where('project_id', $project->id)->where('status', $status)->count();
                $phase = $this->prettyPhase($method, $status);
                $message = 'There '.($count === 1 ? 'is' : 'are')." {$count} task".($count === 1 ? '' : 's')." in {$phase}.";

                return $this->createResponse('information', $message, false);
            }
        }

        if (strpos($m, 'overdue') !== false) {
            $count = $this->countOverdue($project);
            $message = 'There '.($count === 1 ? 'is' : 'are')." {$count} overdue task".($count === 1 ? '' : 's').'.';

            return $this->createResponse('information', $message, false);
        }

        if (preg_match('/\b(low|medium|high|urgent)\b/i', $m, $matches)) {
            $priority = $this->resolvePriorityToken($matches[1]);
            if ($priority) {
                $count = Task::where('project_id', $project->id)->where('priority', $priority)->count();
                $message = 'There '.($count === 1 ? 'is' : 'are')." {$count} {$priority} priority task".($count === 1 ? '' : 's').'.';

                return $this->createResponse('information', $message, false);
            }
        }

        $count = Task::where('project_id', $project->id)->count();
        $message = "Total tasks in project: {$count}";

        return $this->createResponse('information', $message, false);
    }

    private function getProjectOverview(Project $project): array
    {
        $snap = $this->buildSnapshot($project);
        $labels = $this->labelsFor($project);
        $method = $this->currentMethodology($project);

        $message = "📊 Project Overview\n\n";
        $message .= 'Methodology: '.ucfirst($method)."\n";
        $message .= "Total Tasks: {$snap['tasks']['total']}\n\n";
        $message .= "By Status:\n";
        $message .= "• {$labels['todo']}: {$snap['tasks']['by_status']['todo']}\n";
        $message .= "• {$labels['inprogress']}: {$snap['tasks']['by_status']['inprogress']}\n";
        $message .= "• {$labels['review']}: {$snap['tasks']['by_status']['review']}\n";
        $message .= "• {$labels['done']}: {$snap['tasks']['by_status']['done']}\n\n";
        if ($snap['tasks']['overdue'] > 0) {
            $message .= "⚠️ Overdue Tasks: {$snap['tasks']['overdue']}\n";
        }

        $priorities = $this->getTasksByPriority($project);
        $message .= "\nBy Priority:\n";
        foreach ($priorities as $priority => $count) {
            if ($count > 0) {
                $message .= '• '.ucfirst($priority).": {$count}\n";
            }
        }

        return $this->createResponse('information', $message, false, $snap);
    }

    private function wantsOverview(string $message): bool
    {
        $m = strtolower($message);
        $patterns = ['/\\boverview\\b/', '/\\bsnapshot\\b/', '/\\bsummary\\b/', '/\\bproject\\s+overview\\b/', '/\\bproject\\s+summary\\b/'];
        foreach ($patterns as $p) {
            if (preg_match($p, $m)) {
                return true;
            }
        }

        return false;
    }

    private function getTasksByPriority(Project $project): array
    {
        return [
            'urgent' => Task::where('project_id', $project->id)->where('priority', 'urgent')->count(),
            'high' => Task::where('project_id', $project->id)->where('priority', 'high')->count(),
            'medium' => Task::where('project_id', $project->id)->where('priority', 'medium')->count(),
            'low' => Task::where('project_id', $project->id)->where('priority', 'low')->count(),
        ];
    }

    // -------------------------------------------------------------------------
    // EXECUTION LAYER
    // -------------------------------------------------------------------------

    public function executeCommand(Project $project, array $plan): array
    {
        try {
            $type = $this->normalizeType($plan['type'] ?? null);
            if (! $type) {
                throw new Exception('Invalid command payload.');
            }

            switch ($type) {
                case 'create_task':
                    $res = $this->execCreateTask($project, $plan['payload'] ?? []);
                    break;
                case 'task_update':
                    $res = $this->execTaskUpdate($project, $plan['selector'] ?? [], $plan['changes'] ?? []);
                    break;
                case 'task_delete':
                    $res = $this->execTaskDelete($project, $plan['selector'] ?? []);
                    break;
                case 'bulk_update':
                    $res = $this->execBulkUpdate($project, $plan['filters'] ?? [], $plan['updates'] ?? []);
                    break;
                case 'bulk_assign':
                    $res = $this->execBulkAssign($project, $plan['filters'] ?? [], (string) ($plan['assignee'] ?? ''));
                    break;
                case 'bulk_delete_overdue':
                    $res = $this->execBulkDeleteOverdue($project);
                    break;
                case 'bulk_delete_all':
                    $res = $this->execBulkDeleteAll($project);
                    break;
                case 'bulk_delete':
                    $res = $this->execBulkDelete($project, $plan['filters'] ?? []);
                    break;
                default:
                    throw new Exception('Unknown command type.');
            }

            $snap = $this->buildSnapshot($project);

            return [
                'type' => 'information',
                'message' => $res['message'] ?? 'Done.',
                'data' => $snap,
                'requires_confirmation' => false,
                'ui' => ['show_snapshot' => true],
            ];
        } catch (Throwable $e) {
            $this->logException($e, [
                'where' => 'executeCommand',
                'plan' => $plan ?? null,
                'project_id' => $project->id ?? null,
            ]);

            return [
                'type' => 'error',
                'message' => 'Something went wrong. Please adjust and try again.',
                'requires_confirmation' => false,
            ];
        }
    }

    private function execCreateTask(Project $project, array $payload): array
    {
        $title = trim((string) ($payload['title'] ?? ''));
        if ($title === '') {
            throw new Exception('Task title is required.');
        }

        $task = new Task;
        $task->project_id = $project->id;
        $task->creator_id = $this->currentUserId($project); // ensure creator_id is always set
        $task->title = $title;
        $task->description = (string) ($payload['description'] ?? '');
        $task->status = in_array(($payload['status'] ?? 'todo'), self::SERVER_STATUSES, true) ? $payload['status'] : 'todo';
        $task->priority = in_array(($payload['priority'] ?? 'medium'), self::PRIORITIES, true) ? $payload['priority'] : 'medium';
        $task->start_date = $payload['start_date'] ?? null;
        $task->end_date = $payload['end_date'] ?? null;
        $task->save();

        return ['message' => "✅ Task \"{$task->title}\" created successfully."];
    }

    private function execTaskUpdate(Project $project, array $selector, array $changes): array
    {
        $taskId = (int) ($selector['id'] ?? 0);
        if ($taskId <= 0) {
            throw new Exception('Task selector is required.');
        }
        $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();
        if (! $task) {
            throw new Exception("Task #{$taskId} not found in this project.");
        }

        $this->applyUpdatesToTask($project, $task, $changes);
        $task->save();

        return ['message' => "✏️ Task #{$task->id} updated successfully."];
    }

    private function execTaskDelete(Project $project, array $selector): array
    {
        $taskId = (int) ($selector['id'] ?? 0);
        if ($taskId <= 0) {
            throw new Exception('Task selector is required.');
        }
        $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();
        if (! $task) {
            throw new Exception("Task #{$taskId} not found in this project.");
        }
        $title = (string) $task->title;
        $task->delete();

        return ['message' => "🗑️ Task #{$taskId} \"{$title}\" deleted successfully."];
    }

    private function execBulkUpdate(Project $project, array $filters, array $updates): array
    {
        $q = $this->buildTaskQuery($project, $filters);
        $tasks = $q->get();
        $count = 0;

        $wantsRename = isset($updates['title']);
        if ($wantsRename && count($tasks) !== 1) {
            throw new Exception('Rename requires exactly one task selection.');
        }

        foreach ($tasks as $t) {
            $applied = $this->applyUpdatesToTask($project, $t, $updates);
            if ($applied) {
                $t->save();
                $count++;
            }
        }

        return ['message' => $count > 0 ? "⚡ Updated {$count} task(s) successfully." : 'No changes applied.'];
    }

    private function execBulkAssign(Project $project, array $filters, string $assigneeHint): array
    {
        $assigneeId = $this->resolveAssigneeId($project, $assigneeHint);
        if (! $assigneeId) {
            throw new Exception("Assignee '{$assigneeHint}' could not be determined.");
        }

        $q = $this->buildTaskQuery($project, $filters);
        $tasks = $q->get();
        $count = 0;

        foreach ($tasks as $t) {
            $t->assignee_id = $assigneeId;
            $t->save();
            $count++;
        }

        $user = User::find($assigneeId);
        $name = $user ? $user->name : $assigneeHint;

        return ['message' => "👤 Assigned {$count} task(s) to {$name}."];
    }

    private function execBulkDeleteOverdue(Project $project): array
    {
        $q = Task::where('project_id', $project->id)
            ->whereIn('status', ['todo', 'inprogress', 'review'])
            ->whereNotNull('end_date');

        $count = 0;
        foreach ($q->get() as $t) {
            try {
                if (Carbon::parse($t->end_date)->isPast()) {
                    $t->delete();
                    $count++;
                }
            } catch (\Throwable $e) {
            }
        }

        return ['message' => "🗑️ Deleted {$count} overdue task(s)."];
    }

    private function execBulkDeleteAll(Project $project): array
    {
        $tasks = Task::where('project_id', $project->id)->get();
        $count = 0;
        foreach ($tasks as $t) {
            $t->delete();
            $count++;
        }

        return ['message' => "⚠️ Deleted ALL {$count} task(s) in this project."];
    }

    private function execBulkDelete(Project $project, array $filters): array
    {
        $q = $this->buildTaskQuery($project, $filters);
        $tasks = $q->get();
        $count = 0;
        foreach ($tasks as $t) {
            $t->delete();
            $count++;
        }

        return ['message' => "🗑️ Deleted {$count} task(s)."];
    }

    private function applyUpdatesToTask(Project $project, Task $task, array $updates): bool
    {
        $changed = false;

        if (isset($updates['status']) && in_array($updates['status'], self::SERVER_STATUSES, true)) {
            if ($task->status !== $updates['status']) {
                $task->status = $updates['status'];
                $changed = true;
            }
        }

        if (isset($updates['priority'])) {
            $prio = $this->resolvePriorityToken($updates['priority']);
            if ($prio && $task->priority !== $prio) {
                $task->priority = $prio;
                $changed = true;
            }
        }

        if (isset($updates['assignee_hint'])) {
            $assigneeId = $this->resolveAssigneeId($project, $updates['assignee_hint']);
            if (! $assigneeId) {
                throw new Exception("Assignee '{$updates['assignee_hint']}' could not be determined.");
            }
            if ((int) $task->assignee_id !== (int) $assigneeId) {
                $task->assignee_id = $assigneeId;
                $changed = true;
            }
        }

        if (isset($updates['end_date'])) {
            $new = $updates['end_date'];
            if ($task->end_date !== $new) {
                $task->end_date = $new;
                $changed = true;
            }
        }

        if (isset($updates['start_date'])) {
            $new = $updates['start_date'];
            if ($task->start_date !== $new) {
                $task->start_date = $new;
                $changed = true;
            }
        }

        if (array_key_exists('description', $updates)) {
            $text = (string) $updates['description'];
            if (($updates['_mode'] ?? 'replace_desc') === 'append_desc') {
                $existing = (string) ($task->description ?? '');
                $new = trim($existing === '' ? $text : ($existing."\n\n".$text));
                if ($new !== (string) $task->description) {
                    $task->description = $new;
                    $changed = true;
                }
            } else {
                if ($text !== (string) $task->description) {
                    $task->description = $text;
                    $changed = true;
                }
            }
        }

        if (isset($updates['title'])) {
            $newTitle = trim((string) $updates['title']);
            if ($newTitle !== '' && $newTitle !== (string) $task->title) {
                $task->title = $newTitle;
                $changed = true;
            }
        }

        return $changed;
    }

    // -------------------------------------------------------------------------
    // QUERY / COUNT / SNAPSHOT
    // -------------------------------------------------------------------------

    private function buildTaskQuery(Project $project, array $filters)
    {
        $q = Task::where('project_id', $project->id);

        if (! empty($filters['title_hints']) && is_array($filters['title_hints'])) {
            $idsFromTitles = $this->resolveTaskIdsByTitles($project, $filters['title_hints']);
            if (empty($idsFromTitles)) {
                $q->whereRaw('1=0');

                return $q;
            }
            $q->whereIn('id', $idsFromTitles);
        }

        if (! empty($filters['ids']) && is_array($filters['ids'])) {
            $q->whereIn('id', array_map('intval', $filters['ids']));
        }

        if (! empty($filters['title_contains']) && is_array($filters['title_contains'])) {
            $q->where(function ($sub) use ($filters) {
                foreach ($filters['title_contains'] as $needle) {
                    $sub->orWhere('title', 'LIKE', '%'.$needle.'%');
                }
            });
        }

        if (! empty($filters['description_contains']) && is_array($filters['description_contains'])) {
            $q->where(function ($sub) use ($filters) {
                foreach ($filters['description_contains'] as $needle) {
                    $sub->orWhere('description', 'LIKE', '%'.$needle.'%');
                }
            });
        }

        if (! empty($filters['status']) && in_array($filters['status'], self::SERVER_STATUSES, true)) {
            $q->where('status', $filters['status']);
        }

        if (! empty($filters['priority'])) {
            $prio = $this->resolvePriorityToken($filters['priority']);
            if ($prio) {
                $q->where('priority', $prio);
            }
        }

        if (! empty($filters['overdue'])) {
            $q->whereNotNull('end_date')->whereIn('status', ['todo', 'inprogress', 'review'])->whereDate('end_date', '<', Carbon::now()->toDateString());
        }

        if (! empty($filters['unassigned'])) {
            $q->whereNull('assignee_id');
        }

        if (! empty($filters['assigned_to_hint'])) {
            $assigneeId = $this->resolveAssigneeId($project, $filters['assigned_to_hint']);
            $q->where('assignee_id', $assigneeId ?? -1);
        }

        if (! empty($filters['due_before'])) {
            $q->whereDate('end_date', '<=', $filters['due_before']);
        }
        if (! empty($filters['due_after'])) {
            $q->whereDate('end_date', '>=', $filters['due_after']);
        }
        if (! empty($filters['due_on'])) {
            $q->whereDate('end_date', '=', $filters['due_on']);
        }

        if (! empty($filters['created_before'])) {
            $q->whereDate('created_at', '<=', $filters['created_before']);
        }
        if (! empty($filters['created_after'])) {
            $q->whereDate('created_at', '>=', $filters['created_after']);
        }

        $orderBy = $filters['order_by'] ?? 'created_at';
        $order = strtolower($filters['order'] ?? 'asc');
        if (! in_array($orderBy, ['created_at', 'updated_at', 'end_date', 'priority', 'id', 'status', 'title'], true)) {
            $orderBy = 'created_at';
        }
        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'asc';
        }
        $q->orderBy($orderBy, $order);

        if (! empty($filters['limit'])) {
            $q->limit(max(1, (int) $filters['limit']));
        }

        return $q;
    }

    private function countAffected(Project $project, array $filters): int
    {
        $filtersForCount = $filters;
        unset($filtersForCount['limit'], $filtersForCount['order'], $filtersForCount['order_by']);
        $base = (int) $this->buildTaskQuery($project, $filtersForCount)->count();

        if (! empty($filters['limit'])) {
            return min($base, max(1, (int) $filters['limit']));
        }

        return $base;
    }

    private function countOverdue(Project $project): int
    {
        $count = 0;
        $q = Task::where('project_id', $project->id)->whereIn('status', ['todo', 'inprogress', 'review'])->whereNotNull('end_date');
        foreach ($q->get() as $t) {
            try {
                if (Carbon::parse($t->end_date)->isPast()) {
                    $count++;
                }
            } catch (\Throwable $e) {
            }
        }

        return $count;
    }

    private function buildSnapshot(Project $project): array
    {
        $project->loadMissing(['tasks']);
        $byStatus = ['todo' => 0, 'inprogress' => 0, 'review' => 0, 'done' => 0];
        $overdue = 0;

        foreach ($project->tasks as $t) {
            $s = in_array($t->status, self::SERVER_STATUSES, true) ? $t->status : 'todo';
            $byStatus[$s] = ($byStatus[$s] ?? 0) + 1;
            if (! empty($t->end_date)) {
                try {
                    if (Carbon::parse($t->end_date)->isPast() && $s !== 'done') {
                        $overdue++;
                    }
                } catch (\Throwable $e) {
                }
            }
        }

        return [
            'tasks' => [
                'total' => array_sum($byStatus),
                'by_status' => $byStatus,
                'overdue' => $overdue,
            ],
        ];
    }

    private function resolveTaskIdsByTitles(Project $project, array $titleHints): array
    {
        $titleHints = array_values(array_filter(array_map('trim', $titleHints), fn ($s) => $s !== ''));
        if (empty($titleHints)) {
            return [];
        }

        $project->loadMissing(['tasks:id,project_id,title']);
        $tasks = $project->tasks;

        $ids = [];
        foreach ($titleHints as $hint) {
            $hintLower = mb_strtolower($hint);

            $exact = $tasks->first(fn ($t) => mb_strtolower((string) $t->title) === $hintLower);
            if ($exact) {
                $ids[] = (int) $exact->id;

                continue;
            }

            $contains = $tasks->first(fn ($t) => mb_strpos(mb_strtolower((string) $t->title), $hintLower) !== false);
            if ($contains) {
                $ids[] = (int) $contains->id;

                continue;
            }

            $bestId = null;
            $bestScore = 0.0;
            foreach ($tasks as $t) {
                $score = $this->similarityScore((string) $t->title, $hintLower);
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestId = (int) $t->id;
                }
            }
            if ($bestId !== null && $bestScore >= 0.55) {
                $ids[] = $bestId;
            }
        }

        return array_values(array_unique($ids));
    }

    private function similarityScore(string $a, string $b): float
    {
        $a = mb_strtolower(trim($a));
        $b = mb_strtolower(trim($b));
        if ($a === $b) {
            return 1.0;
        }
        $len = max(mb_strlen($a), mb_strlen($b));
        if ($len === 0) {
            return 0.0;
        }
        $dist = levenshtein($a, $b);
        $score = 1.0 - min(1.0, $dist / (float) $len);
        if (mb_strpos($a, $b) !== false) {
            $score = max($score, min(1.0, (mb_strlen($b) / (float) $len)));
        }

        return $score;
    }

    // -------------------------------------------------------------------------
    // METHODOLOGY & STATUS MAPPING
    // -------------------------------------------------------------------------

    public function labelsFor(Project $project): array
    {
        $method = $this->currentMethodology($project);

        return $this->serverToMethodPhase($method);
    }

    private function currentMethodology(Project $project): string
    {
        try {
            $meta = $project->meta ?? null;
            if (is_array($meta) && ! empty($meta['methodology'])) {
                $m = strtolower((string) $meta['methodology']);
                if (in_array($m, [self::METH_KANBAN, self::METH_SCRUM, self::METH_AGILE, self::METH_WATERFALL, self::METH_LEAN], true)) {
                    return $m;
                }
            }
        } catch (\Throwable $e) {
        }

        return self::METH_KANBAN;
    }

    private function serverToMethodPhase(string $method): array
    {
        switch ($method) {
            case self::METH_SCRUM:
            case self::METH_AGILE:
                return ['todo' => 'todo', 'inprogress' => 'inprogress', 'review' => 'review', 'done' => 'done'];
            case self::METH_WATERFALL:
                return ['todo' => 'requirements', 'inprogress' => 'design', 'review' => 'verification', 'done' => 'maintenance'];
            case self::METH_LEAN:
                return ['todo' => 'backlog', 'inprogress' => 'todo', 'review' => 'testing', 'done' => 'done'];
            case self::METH_KANBAN:
            default:
                return ['todo' => 'todo', 'inprogress' => 'inprogress', 'review' => 'review', 'done' => 'done'];
        }
    }

    private function methodPhaseToServer(string $method): array
    {
        // Inverse mapping for lookup: phase names → canonical server statuses
        switch ($method) {
            case self::METH_WATERFALL:
                return [
                    'requirements' => 'todo', 'specification' => 'todo', 'analysis' => 'todo',
                    'design' => 'inprogress', 'implementation' => 'inprogress', 'construction' => 'inprogress',
                    'verification' => 'review', 'validation' => 'review', 'testing phase' => 'review',
                    'maintenance' => 'done', 'done' => 'done', 'complete' => 'done',
                ];
            case self::METH_LEAN:
                return [
                    'backlog' => 'todo', 'kanban backlog' => 'todo',
                    'todo' => 'inprogress', 'value stream' => 'inprogress',
                    'testing' => 'review', 'qa' => 'review',
                    'done' => 'done', 'complete' => 'done',
                ];
            case self::METH_SCRUM:
            case self::METH_AGILE:
                return [
                    'product backlog' => 'todo', 'sprint backlog' => 'todo', 'backlog' => 'todo', 'todo' => 'todo',
                    'inprogress' => 'inprogress', 'in progress' => 'inprogress', 'doing' => 'inprogress', 'wip' => 'inprogress',
                    'review' => 'review', 'code review' => 'review', 'qa' => 'review', 'testing' => 'review',
                    'done' => 'done', 'complete' => 'done', 'finished' => 'done',
                ];
            case self::METH_KANBAN:
            default:
                return [
                    'todo' => 'todo', 'to do' => 'todo', 'backlog' => 'todo',
                    'inprogress' => 'inprogress', 'in progress' => 'inprogress', 'doing' => 'inprogress', 'wip' => 'inprogress',
                    'review' => 'review', 'code review' => 'review', 'qa' => 'review', 'testing' => 'review',
                    'done' => 'done', 'complete' => 'done', 'finished' => 'done',
                ];
        }
    }

    private function resolveStatusToken(Project $project, string $token): ?string
    {
        $method = $this->currentMethodology($project);
        $t = $this->norm($token);
        if ($t === '') {
            return null;
        }

        if (in_array($t, self::SERVER_STATUSES, true)) {
            return $t;
        }

        if (in_array($t, ['first', 'first stage', 'first column', 'left', 'leftmost', 'start', 'begin', 'beginning'])) {
            return 'todo';
        }
        if (in_array($t, ['last', 'last stage', 'last column', 'final', 'end', 'right', 'rightmost'])) {
            return 'done';
        }

        $phaseToServer = $this->methodPhaseToServer($method);
        if (array_key_exists($t, $phaseToServer)) {
            return $phaseToServer[$t];
        }

        // "in progress" variants
        if ($t === 'in progress') {
            return 'inprogress';
        }

        return null;
    }

    private function nthStageToStatus(Project $project, string $ordinal): ?string
    {
        // Order: 1→todo, 2→inprogress, 3→review, 4→done
        $map = ['first' => 1, 'second' => 2, 'third' => 3, 'fourth' => 4];
        $n = $map[$ordinal] ?? null;
        if (! $n) {
            return null;
        }
        switch ($n) {
            case 1: return 'todo';
            case 2: return 'inprogress';
            case 3: return 'review';
            case 4: return 'done';
        }

        return null;
    }

    private function prettyPhase(string $method, string $serverStatus): string
    {
        $map = $this->serverToMethodPhase($method);

        return $map[$serverStatus] ?? $serverStatus;
    }

    private function resolvePriorityToken(string $token): ?string
    {
        $t = $this->norm($token);
        if (in_array($t, self::PRIORITIES, true)) {
            return $t;
        }

        $map = [
            'lowest' => 'low', 'normal' => 'medium', 'medium priority' => 'medium', 'moderate' => 'medium',
            'higher' => 'high', 'highest' => 'urgent', 'critical' => 'urgent', 'blocker' => 'urgent',
            'p3' => 'low', 'prio 3' => 'low', 'p2' => 'medium', 'prio 2' => 'medium', 'p1' => 'high', 'prio 1' => 'high', 'p0' => 'urgent', 'prio 0' => 'urgent',
        ];
        if (isset($map[$t])) {
            return $map[$t];
        }

        if (preg_match('/^(low|medium|high|urgent)\s+priority$/', $t, $m)) {
            return $m[1];
        }

        return null;
    }

    private function projectStatusAliasMap(Project $project, string $methodology): array
    {
        $generic = [
            'to do' => 'todo', 'not started' => 'todo', 'open' => 'todo', 'new' => 'todo',
            'queue' => 'todo', 'triage' => 'todo', 'backlog' => 'todo', 'ready' => 'todo',
            'first' => 'todo', 'first stage' => 'todo', 'first column' => 'todo', 'left' => 'todo', 'leftmost' => 'todo', 'start' => 'todo', 'begin' => 'todo',
            'incoming' => 'todo', 'icebox' => 'todo',
            'doing' => 'inprogress', 'started' => 'inprogress', 'working' => 'inprogress', 'active' => 'inprogress',
            'in progress' => 'inprogress', 'progress' => 'inprogress', 'wip' => 'inprogress', 'ip' => 'inprogress',
            'code review' => 'review', 'in review' => 'review', 'qa' => 'review', 'test' => 'review', 'testing' => 'review', 'verify' => 'review', 'verification' => 'review', 'validation' => 'review',
            'finished' => 'done', 'complete' => 'done', 'completed' => 'done', 'closed' => 'done', 'resolved' => 'done',
            'last' => 'done', 'last stage' => 'done', 'last column' => 'done', 'final' => 'done', 'end' => 'done', 'right' => 'done', 'rightmost' => 'done',
        ];

        $waterfall = [
            'requirements' => 'todo', 'specification' => 'todo', 'analysis' => 'todo',
            'design' => 'inprogress', 'implementation' => 'inprogress', 'construction' => 'inprogress',
            'verification' => 'review', 'validation' => 'review', 'testing phase' => 'review',
            'maintenance' => 'done',
        ];
        $scrum = ['product backlog' => 'todo', 'sprint backlog' => 'todo'];
        $agile = ['refinement' => 'todo', 'sprint backlog' => 'todo'];
        $lean = ['kanban backlog' => 'todo', 'value stream' => 'inprogress'];

        $map = [];
        foreach ($generic as $k => $v) {
            $map[$this->norm($k)] = $v;
        }

        $methodMap = [];
        switch ($methodology) {
            case self::METH_SCRUM: $methodMap = $scrum;
                break;
            case self::METH_AGILE: $methodMap = $agile;
                break;
            case self::METH_WATERFALL: $methodMap = $waterfall;
                break;
            case self::METH_LEAN: $methodMap = $lean;
                break;
            default: $methodMap = [];
        }
        foreach ($methodMap as $k => $v) {
            $map[$this->norm($k)] = $v;
        }

        try {
            $meta = $project->meta ?? null;
            if (is_array($meta) && ! empty($meta['status_aliases']) && is_array($meta['status_aliases'])) {
                $phaseToServer = $this->methodPhaseToServer($methodology);
                foreach ($meta['status_aliases'] as $alias => $value) {
                    $aliasNorm = $this->norm((string) $alias);
                    $valNorm = $this->norm((string) $value);
                    $server = null;

                    if (in_array($valNorm, self::SERVER_STATUSES, true)) {
                        $server = $valNorm;
                    } elseif (isset($phaseToServer[$valNorm])) {
                        $server = $phaseToServer[$valNorm];
                    } elseif (isset($map[$valNorm])) {
                        $server = $map[$valNorm];
                    }

                    if ($server) {
                        $map[$aliasNorm] = $server;
                    }
                }
            }
        } catch (\Throwable $e) {
        }

        return $map;
    }

    private function allMethodAliasMap(Project $project): array
    {
        $all = [];
        foreach ([self::METH_KANBAN, self::METH_SCRUM, self::METH_AGILE, self::METH_WATERFALL, self::METH_LEAN] as $m) {
            $map = $this->projectStatusAliasMap($project, $m);
            foreach ($map as $k => $v) {
                $all[$k] = $v;
            }
        }

        return $all;
    }

    // -------------------------------------------------------------------------
    // VALIDATION & PREVIEW
    // -------------------------------------------------------------------------

    private function validatePlan(Project $project, array $plan): array
    {
        $type = $this->normalizeType($plan['type'] ?? null);
        if (! $type) {
            return ['_ok' => false, '_why' => 'Invalid command.'];
        }

        $onlyAllowed = ['create_task', 'task_update', 'task_delete', 'bulk_update', 'bulk_assign', 'bulk_delete_overdue', 'bulk_delete_all', 'bulk_delete'];
        if (! in_array($type, $onlyAllowed, true)) {
            return ['_ok' => false, '_why' => 'Unsupported command type.'];
        }

        if ($type === 'task_update') {
            $id = (int) ($plan['selector']['id'] ?? 0);
            if ($id <= 0) {
                return ['_ok' => false, '_why' => 'A specific task id is required.'];
            }
            $exists = Task::where('project_id', $project->id)->where('id', $id)->exists();
            if (! $exists) {
                return ['_ok' => false, '_why' => "Task #{$id} not found in this project."];
            }
            $chg = $plan['changes'] ?? [];
            if (empty($chg)) {
                return ['_ok' => false, '_why' => 'No changes specified.'];
            }
        }

        if ($type === 'task_delete') {
            $id = (int) ($plan['selector']['id'] ?? 0);
            if ($id <= 0) {
                return ['_ok' => false, '_why' => 'A specific task id is required.'];
            }
            $exists = Task::where('project_id', $project->id)->where('id', $id)->exists();
            if (! $exists) {
                return ['_ok' => false, '_why' => "Task #{$id} not found in this project."];
            }
        }

        if ($type === 'bulk_update') {
            $filters = $plan['filters'] ?? [];
            $updates = $plan['updates'] ?? [];
            if (empty($updates)) {
                return ['_ok' => false, '_why' => 'No updates specified.'];
            }
            $count = $this->countAffected($project, $filters);
            if ($count <= 0) {
                return ['_ok' => false, '_why' => 'No tasks match these filters.'];
            }
        }

        if ($type === 'bulk_assign') {
            $filters = $plan['filters'] ?? [];
            $assignee = (string) ($plan['assignee'] ?? '');
            if ($assignee === '') {
                return ['_ok' => false, '_why' => 'Assignee is required.'];
            }
            $count = $this->countAffected($project, $filters);
            if ($count <= 0) {
                if (! empty($filters['unassigned'])) {
                    return ['_ok' => false, '_why' => 'No unassigned tasks found.'];
                }

                return ['_ok' => false, '_why' => 'No tasks match these filters.'];
            }
        }

        if ($type === 'bulk_delete') {
            $filters = $plan['filters'] ?? [];
            $count = $this->countAffected($project, $filters);
            if ($count <= 0) {
                return ['_ok' => false, '_why' => 'No tasks match these filters.'];
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

        if ($type === 'create_task') {
            $title = trim((string) ($plan['payload']['title'] ?? ''));
            if ($title === '') {
                return ['_ok' => false, '_why' => 'Task title is required.'];
            }
        }

        return ['_ok' => true, '_why' => ''];
    }

    private function preview(Project $project, array $plan, string $methodology): string
    {
        $type = $this->normalizeType($plan['type'] ?? '');

        switch ($type) {
            case 'create_task':
                $title = $plan['payload']['title'] ?? 'Untitled';
                $toLbl = $this->prettyPhase($methodology, 'todo');

                return "✅ This will create a new task \"{$title}\" in \"{$toLbl}\".";

            case 'task_delete':
                $id = $plan['selector']['id'] ?? 0;
                $task = Task::where('project_id', $project->id)->where('id', $id)->first();
                $title = $task ? " \"{$task->title}\"" : '';

                return "🗑️ This will permanently delete task #{$id}{$title}.";

            case 'task_update':
                $sel = $plan['selector'] ?? [];
                $chg = $plan['changes'] ?? [];
                $what = $this->updatesHuman($chg, $methodology);
                $idTxt = isset($sel['id']) ? "#{$sel['id']}" : 'the selected task';

                return "✏️ This will {$what} on task {$idTxt}.";

            case 'bulk_update':
                $count = $this->countAffected($project, $plan['filters']);
                $what = $this->updatesHuman($plan['updates'], $methodology);
                if (! empty($plan['filters']['all'])) {
                    if (! empty($plan['filters']['limit'])) {
                        $dir = (! empty($plan['filters']['order']) && strtolower($plan['filters']['order']) === 'desc') ? 'last' : 'first';

                        return "⚡ This will apply to the {$dir} {$count} task(s): {$what}.";
                    }

                    return "⚡ This will apply to ALL {$count} task(s): {$what}.";
                }
                $scope = $this->filtersHuman($project, $plan['filters'], $methodology);

                return "⚡ This will apply to {$count} task(s) {$scope}: {$what}.";

            case 'bulk_assign':
                $count = $this->countAffected($project, $plan['filters']);
                $to = $plan['assignee'] ?? 'the target user';
                $scope = $this->filtersHuman($project, $plan['filters'], $methodology);

                return "👤 This will assign {$count} task(s) {$scope} to \"{$to}\".";

            case 'bulk_delete_overdue':
                $count = $this->countOverdue($project);

                return "🗑️ This will permanently delete {$count} overdue task(s).";

            case 'bulk_delete_all':
                $count = Task::where('project_id', $project->id)->count();

                return "⚠️ This will permanently delete ALL {$count} task(s) in this project.";

            case 'bulk_delete':
                $count = $this->countAffected($project, $plan['filters']);
                $scope = $this->filtersHuman($project, $plan['filters'], $methodology);

                return "🗑️ This will permanently delete {$count} task(s) {$scope}.";
        }

        return 'Unknown action type: '.($plan['type'] ?? 'null');
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
        if (isset($updates['end_date'])) {
            $pieces[] = 'set due date to '.$updates['end_date'];
        }
        if (isset($updates['start_date'])) {
            $pieces[] = 'set start date to '.$updates['start_date'];
        }
        if (isset($updates['description'])) {
            $pieces[] = (($updates['_mode'] ?? 'replace_desc') === 'append_desc') ? 'append to description' : 'replace description';
        }
        if (isset($updates['title'])) {
            $pieces[] = 'rename title';
        }

        return empty($pieces) ? 'update tasks' : implode(', ', $pieces);
    }

    private function filtersHuman(Project $project, array $filters, string $methodology): string
    {
        $parts = [];
        if (! empty($filters['ids'])) {
            $parts[] = 'with ids '.implode(', ', array_map('intval', $filters['ids']));
        }
        if (! empty($filters['title_hints'])) {
            $parts[] = 'titled like "'.implode('", "', $filters['title_hints']).'"';
        }
        if (! empty($filters['title_contains'])) {
            $parts[] = 'title contains "'.implode('", "', $filters['title_contains']).'"';
        }
        if (! empty($filters['description_contains'])) {
            $parts[] = 'description contains "'.implode('", "', $filters['description_contains']).'"';
        }
        if (! empty($filters['status'])) {
            $parts[] = 'in "'.$this->prettyPhase($methodology, $filters['status']).'"';
        }
        if (! empty($filters['priority'])) {
            $parts[] = 'with priority '.$filters['priority'];
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
        if (! empty($filters['due_before'])) {
            $parts[] = 'due before '.$filters['due_before'];
        }
        if (! empty($filters['due_after'])) {
            $parts[] = 'due after '.$filters['due_after'];
        }
        if (! empty($filters['due_on'])) {
            $parts[] = 'due on '.$filters['due_on'];
        }
        if (! empty($filters['created_before'])) {
            $parts[] = 'created before '.$filters['created_before'];
        }
        if (! empty($filters['created_after'])) {
            $parts[] = 'created after '.$filters['created_after'];
        }
        if (! empty($filters['limit'])) {
            $dir = (! empty($filters['order']) && strtolower($filters['order']) === 'desc') ? 'last' : 'first';
            $parts[] = "{$dir} ".(int) $filters['limit'].' task(s)';
        }
        if (empty($parts)) {
            return 'in this project';
        }

        return '('.implode(' and ', $parts).')';
    }

    // -------------------------------------------------------------------------
    // UTILS
    // -------------------------------------------------------------------------

    private function norm(string $text): string
    {
        $t = strtolower(trim($text));
        $t = str_replace(['_', '-'], ' ', $t);
        $t = preg_replace('/\b(status|column|phase|stage)\b/', '', $t);
        $t = preg_replace('/\s+/', ' ', $t);

        return trim($t);
    }

    private function parseOrdinalWindow(string $mLow): ?array
    {
        $wordsToNum = ['one' => 1, 'two' => 2, 'three' => 3, 'four' => 4, 'five' => 5, 'six' => 6, 'seven' => 7, 'eight' => 8, 'nine' => 9, 'ten' => 10];

        if (preg_match('/\b(?:only\s+)?(?:the\s+)?(first|last|top)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i', $mLow, $mm)) {
            $kind = strtolower($mm[1]);
            $nRaw = strtolower($mm[2]);
            $n = ctype_digit($nRaw) ? (int) $nRaw : ($wordsToNum[$nRaw] ?? null);
            if ($n && $n > 0) {
                $order = ($kind === 'last') ? 'desc' : 'asc';

                return ['limit' => $n, 'order_by' => 'created_at', 'order' => $order];
            }
        }

        if (preg_match('/\b(first|last)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i', $mLow, $mm)) {
            $kind = strtolower($mm[1]);
            $nRaw = strtolower($mm[2]);
            $n = ctype_digit($nRaw) ? (int) $nRaw : ($wordsToNum[$nRaw] ?? null);
            if ($n && $n > 0) {
                $order = ($kind === 'last') ? 'desc' : 'asc';

                return ['limit' => $n, 'order_by' => 'created_at', 'order' => $order];
            }
        }

        return null;
    }

    private function projectOwner(Project $project): ?User
    {
        try {
            return $project->user ?? User::find($project->user_id);
        } catch (\Throwable $e) {
            return User::find($project->user_id);
        }
    }

    private function projectMembers(Project $project)
    {
        try {
            if (method_exists($project, 'members')) {
                return $project->members()->get(['users.id', 'users.name', 'users.email']);
            }
        } catch (\Throwable $e) {
        }

        return collect();
    }

    private function resolveAssigneeId(Project $project, string $hint): ?int
    {
        $hint = trim($hint);
        if ($hint === '') {
            return null;
        }

        // Normalize: @handle and possessive "'s"
        $hint = ltrim($hint, '@');
        $hint = preg_replace("/'s$/u", '', $hint);

        // Pronouns → current user
        if (in_array(mb_strtolower($hint), ['me', 'myself', '__me__'], true)) {
            $me = $this->currentUserId($project);

            return $me ?: null;
        }

        // Owner references
        if (in_array(mb_strtolower($hint), ['owner', 'project owner', '__owner__'], true)) {
            $owner = $this->projectOwner($project);

            return $owner?->id ?: null;
        }

        // numeric id
        if (ctype_digit($hint)) {
            $user = User::find((int) $hint);
            if ($user && $this->userIsProjectMember($project, $user)) {
                return $user->id;
            }

            return null;
        }

        // email
        if (filter_var($hint, FILTER_VALIDATE_EMAIL)) {
            $user = User::where('email', $hint)->first();
            if ($user && $this->userIsProjectMember($project, $user)) {
                return $user->id;
            }

            return null;
        }

        // Search owner + members by exact/partial name
        $candidates = collect();
        $owner = $this->projectOwner($project);
        if ($owner) {
            $candidates->push($owner);
        }
        $members = $this->projectMembers($project);
        $candidates = $candidates->merge($members)->unique('id');

        $match = $candidates->first(function ($u) use ($hint) {
            return mb_strtolower($u->name) === mb_strtolower($hint);
        });
        if ($match) {
            return (int) $match->id;
        }

        $match = $candidates->first(function ($u) use ($hint) {
            return Str::contains(mb_strtolower($u->name), mb_strtolower($hint));
        });
        if ($match) {
            return (int) $match->id;
        }

        return null;
    }

    private function userIsProjectMember(Project $project, User $user): bool
    {
        if ((int) $project->user_id === (int) $user->id) {
            return true;
        }
        try {
            if (method_exists($project, 'members')) {
                return $project->members()->where('users.id', $user->id)->exists();
            }
        } catch (\Throwable $e) {
        }

        return false;
    }

    private function currentUserId(Project $project): ?int
    {
        try {
            $id = Auth::id();
            if ($id) {
                return (int) $id;
            }
        } catch (Throwable $e) {
        }

        return $project->user_id ?? null;
    }

    private function looksLikeSecrets(string $text): bool
    {
        $needles = [
            'api_key', 'api-key', 'apikey', 'secret=', 'password=', 'pwd=', 'token=', 'bearer ', 'ghp_',
            '-----BEGIN ', 'PRIVATE KEY', 'aws_access_key_id', 'aws_secret_access_key',
        ];
        $low = strtolower($text);
        foreach ($needles as $n) {
            if (strpos($low, strtolower($n)) !== false) {
                return true;
            }
        }

        return false;
    }

    private function parseDate(string $text): ?Carbon
    {
        $text = trim($text);
        if ($text === '') {
            return null;
        }
        try {
            return Carbon::parse($text);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function normalizeLLMPlan(Project $project, array $plan): array
    {
        $normStatus = function (?string $s) use ($project) {
            if (! $s) {
                return null;
            }
            $st = $this->resolveStatusToken($project, $s);

            return $st ?: null;
        };
        $normPrio = function (?string $p) {
            if (! $p) {
                return null;
            }
            $pp = $this->resolvePriorityToken($p);

            return $pp ?: null;
        };

        if (isset($plan['changes']) && is_array($plan['changes'])) {
            if (isset($plan['changes']['status'])) {
                $st = $normStatus($plan['changes']['status']);
                if ($st) {
                    $plan['changes']['status'] = $st;
                } else {
                    unset($plan['changes']['status']);
                }
            }
            if (isset($plan['changes']['priority'])) {
                $pr = $normPrio($plan['changes']['priority']);
                if ($pr) {
                    $plan['changes']['priority'] = $pr;
                } else {
                    unset($plan['changes']['priority']);
                }
            }
        }
        if (isset($plan['payload']) && is_array($plan['payload'])) {
            if (isset($plan['payload']['status'])) {
                $st = $normStatus($plan['payload']['status']);
                $plan['payload']['status'] = $st ?: 'todo';
            }
            if (isset($plan['payload']['priority'])) {
                $pr = $normPrio($plan['payload']['priority']);
                $plan['payload']['priority'] = $pr ?: 'medium';
            }
        }
        if (isset($plan['filters']) && is_array($plan['filters'])) {
            if (isset($plan['filters']['status'])) {
                $st = $normStatus($plan['filters']['status']);
                if ($st) {
                    $plan['filters']['status'] = $st;
                } else {
                    unset($plan['filters']['status']);
                }
            }
            if (isset($plan['filters']['priority'])) {
                $pr = $normPrio($plan['filters']['priority']);
                if ($pr) {
                    $plan['filters']['priority'] = $pr;
                } else {
                    unset($plan['filters']['priority']);
                }
            }
            if (isset($plan['filters']['limit'])) {
                $plan['filters']['limit'] = max(1, (int) $plan['filters']['limit']);
            }
            if (isset($plan['filters']['order']) && ! in_array(strtolower($plan['filters']['order']), ['asc', 'desc'], true)) {
                unset($plan['filters']['order']);
            }
            // If assignee scope is present, prefer it over "all"
            if (! empty($plan['filters']['assigned_to_hint']) && ! empty($plan['filters']['all'])) {
                unset($plan['filters']['all']);
            }
        }

        return $plan;
    }

    private function normalizeType(?string $type): ?string
    {
        if (! $type) {
            return null;
        }
        $t = strtolower(trim($type));

        $map = [
            'create' => 'create_task', 'create-task' => 'create_task', 'new_task' => 'create_task', 'new-task' => 'create_task',
            'update' => 'task_update', 'update_task' => 'task_update', 'update-task' => 'task_update', 'edit_task' => 'task_update', 'edit-task' => 'task_update', 'move_task' => 'task_update', 'move-task' => 'task_update',
            'delete' => 'task_delete', 'delete_task' => 'task_delete', 'delete-task' => 'task_delete', 'remove_task' => 'task_delete', 'remove-task' => 'task_delete',
            'bulkupdate' => 'bulk_update', 'bulk-update' => 'bulk_update', 'mass_update' => 'bulk_update', 'mass-update' => 'bulk_update',
            'assign' => 'bulk_assign', 'bulk_assign' => 'bulk_assign', 'bulk-assign' => 'bulk_assign', 'assign_all' => 'bulk_assign', 'assign-all' => 'bulk_assign',
            'bulk-delete' => 'bulk_delete', 'bulkdelete' => 'bulk_delete', 'delete_filtered' => 'bulk_delete', 'delete-filtered' => 'bulk_delete',
            'delete_overdue' => 'bulk_delete_overdue', 'delete-overdue' => 'bulk_delete_overdue', 'bulk_delete_overdue' => 'bulk_delete_overdue', 'bulk-delete-overdue' => 'bulk_delete_overdue',
            'delete_all' => 'bulk_delete_all', 'delete-all' => 'bulk_delete_all', 'clear_all' => 'bulk_delete_all', 'clear-all' => 'bulk_delete_all', 'bulk_delete_all' => 'bulk_delete_all', 'bulk-delete-all' => 'bulk_delete_all',
        ];

        return $map[$t] ?? $t;
    }

    private function getProjectStatistics(Project $project): array
    {
        $tasks = Task::where('project_id', $project->id)->get();

        $stats = [
            'total' => $tasks->count(),
            'completed' => $tasks->where('status', 'done')->count(),
            'in_progress' => $tasks->whereIn('status', ['inprogress', 'review'])->count(),
            'assigned' => $tasks->whereNotNull('assignee_id')->count(),
            'unassigned' => $tasks->whereNull('assignee_id')->count(),
            'priorities' => [
                'urgent' => $tasks->where('priority', 'urgent')->count(),
                'high' => $tasks->where('priority', 'high')->count(),
                'medium' => $tasks->where('priority', 'medium')->count(),
                'low' => $tasks->where('priority', 'low')->count(),
            ],
            'completion_rate' => 0,
        ];

        if ($stats['total'] > 0) {
            $stats['completion_rate'] = round(($stats['completed'] / $stats['total']) * 100, 1);
        }

        return $stats;
    }

    private function getTeamMembersInfo(Project $project): array
    {
        $members = $this->projectMembers($project);
        $names = $members->pluck('name')->all();

        if (empty($names)) {
            return $this->createResponse('information', 'No team members found.', false);
        }

        $message = 'Team members: '.implode(', ', $names);
        $data = ['members' => $members->map->only(['id', 'name', 'email'])->all()];

        return $this->createResponse('information', $message, false, $data);
    }

    private function getTaskStatus(Project $project, int $taskId, string $method): array
    {
        $task = Task::where('project_id', $project->id)->where('id', $taskId)->first();

        if (! $task) {
            return $this->createResponse('information', "Task #{$taskId} not found in this project.", false);
        }

        $phase = $this->prettyPhase($method, $task->status);
        $assignee = $task->assignee_id ? User::find($task->assignee_id)?->name : 'Unassigned';
        $due = $task->end_date ? Carbon::parse($task->end_date)->format('M d, Y') : 'No due date';

        $message = "Task #{$task->id}: {$task->title}\n";
        $message .= "• Status: {$phase}\n";
        $message .= "• Priority: {$task->priority}\n";
        $message .= "• Assignee: {$assignee}\n";
        $message .= "• Due: {$due}";

        if ($task->description) {
            $message .= "\n• Description: ".Str::limit($task->description, 100);
        }

        return $this->createResponse('information', $message, false);
    }

    private function handleDueDateQuery(Project $project, string $message): array
    {
        $m = strtolower($message);
        $window = 'today';

        if (strpos($m, 'today') !== false) {
            $window = 'today';
        } elseif (strpos($m, 'tomorrow') !== false) {
            $window = 'tomorrow';
        } elseif (strpos($m, 'this week') !== false) {
            $window = 'this week';
        } elseif (strpos($m, 'next week') !== false) {
            $window = 'next week';
        } elseif (strpos($m, 'overdue') !== false) {
            $window = 'overdue';
        }

        if ($window === 'overdue') {
            $tasks = Task::where('project_id', $project->id)
                ->whereNotNull('end_date')
                ->whereDate('end_date', '<', Carbon::now())
                ->whereIn('status', ['todo', 'inprogress', 'review'])
                ->orderBy('end_date')
                ->get(['id', 'title', 'end_date', 'status']);
        } else {
            [$start, $end, $label] = $this->dateWindow($window);
            $tasks = Task::where('project_id', $project->id)
                ->whereNotNull('end_date')
                ->whereBetween('end_date', [$start->toDateString(), $end->toDateString()])
                ->orderBy('end_date')
                ->get(['id', 'title', 'end_date', 'status']);
        }

        $count = $tasks->count();

        if ($count === 0) {
            $message = $window === 'overdue' ? 'No overdue tasks found.' : "No tasks due {$window}.";

            return $this->createResponse('information', $message, false);
        }

        $taskList = $tasks->take(10)->map(function ($task) {
            $daysOverdue = $task->end_date ? Carbon::parse($task->end_date)->diffInDays(Carbon::now(), false) : 0;
            $dueText = $daysOverdue > 0 ? "({$daysOverdue} days overdue)" : '('.Carbon::parse($task->end_date)->format('M d').')';

            return "• #{$task->id}: {$task->title} {$dueText}";
        })->implode("\n");

        $message = $window === 'overdue'
            ? "{$count} overdue task(s):\n{$taskList}"
            : "{$count} task(s) due {$window}:\n{$taskList}";

        if ($count > 10) {
            $message .= "\n... and ".($count - 10).' more';
        }

        return $this->createResponse('information', $message, false);
    }

    private function dateWindow(string $label): array
    {
        $now = Carbon::now();
        $label = strtolower(trim($label));
        switch ($label) {
            case 'today':     return [$now->copy()->startOfDay(), $now->copy()->endOfDay(), 'today'];
            case 'tomorrow':  return [$now->copy()->addDay()->startOfDay(), $now->copy()->addDay()->endOfDay(), 'tomorrow'];
            case 'this week': return [$now->copy()->startOfWeek(), $now->copy()->endOfWeek(), 'this week'];
            case 'next week': return [$now->copy()->addWeek()->startOfWeek(), $now->copy()->addWeek()->endOfWeek(), 'next week'];
            default:          return [$now->copy()->startOfDay(), $now->copy()->endOfDay(), 'today'];
        }
    }

    private function provideHelp(Project $project): array
    {
        $labels = $this->labelsFor($project);

        $message = "I can help you with:\n\n";
        $message .= "📋 **Questions:**\n";
        $message .= "• How many tasks are {$labels['done']}?\n";
        $message .= "• Who is the project owner?\n";
        $message .= "• List overdue tasks\n";
        $message .= "• Show project overview\n\n";

        $message .= "⚡ **Commands:**\n";
        $message .= "• Create task \"Fix login bug\"\n";
        $message .= "• Move #42 to {$labels['done']}\n";
        $message .= "• Assign #42 to Alex\n";
        $message .= "• Delete urgent tasks\n";
        $message .= "• Update priority of #42 to high\n";
        $message .= "• Set due date for #42 to Friday\n";
        $message .= "• Move all tasks to {$labels['done']}, only the first two";

        return $this->createResponse('information', $message, false);
    }

    private function provideSuggestions(Project $project, string $message): array
    {
        $m = strtolower($message);
        $suggestions = "I couldn't understand that command. ";

        if (strpos($m, 'task') !== false) {
            $suggestions .= "Try:\n• Create task \"Your task title\"\n• Delete task #123\n• Move task #123 to done";
        } elseif (strpos($m, 'assign') !== false) {
            $suggestions .= "Try:\n• Assign #123 to John\n• Assign all high priority to Sarah";
        } elseif (strpos($m, 'move') !== false || strpos($m, 'status') !== false) {
            $labels = $this->labelsFor($project);
            $suggestions .= "Try:\n• Move #123 to {$labels['done']}\n• Move all tasks to {$labels['todo']}\n• Move all tasks to {$labels['done']}, only the first two";
        } else {
            $suggestions .= "Try commands like:\n• Create task \"Task title\"\n• Move #123 to done\n• Assign #456 to Alex\n• Delete overdue tasks";
        }

        return $this->createResponse('information', $suggestions, false);
    }

    private function logException(Throwable $e, array $context = []): void
    {
        try {
            Log::error('[ProjectAssistantService] '.$e->getMessage(), array_merge($context, [
                'exception' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]));
        } catch (Throwable $ignore) {
        }
    }
}
