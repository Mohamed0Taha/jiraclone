<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * IntentClassifierService
 *
 * Classifies a user's message as "question" or "command".
 */
class IntentClassifierService
{
    private OpenAIService $openAIService;

    private ProjectContextService $contextService;

    private const ACTION_PATTERNS = [
        'create' => ['/\b(?:create|add|new|make)\s+(?:a\s+)?(?:new\s+)?task\b/i'],
        'update' => ['/\b(?:update|change|modify|edit|set)\b/i', '/\b(?:move|transfer|shift)\s+(?:task|#?\d+)\b/i'],
        'delete' => ['/\b(?:delete|remove|destroy|purge|clear|erase|drop)\b/i', '/\b(?:delete|remove)\s+(?:the\s+)?(?:task\s+)?(?:with\s+)?(?:id\s+)?#?\d+/i'],
        'assign' => ['/\b(?:assign|delegate|give|allocate)\s+(?:task|#?\d+)?\s*(?:to)?\b/i'],
    ];

    private const QUESTION_PATTERNS = [
        '/^(?:what|which|who|where|when|how|why|is|are|do|does|can)\b/i', '/\?$/',
        '/\b(?:show|list|display|get|find|tell)\s+(?:me\s+)?/i', '/\b(?:how\s+many|count|total|number\s+of)\b/i',
        '/\b(?:status|state|progress|info|details?)\s+(?:of|about|for)?\b/i',
    ];

    public function __construct(OpenAIService $openAIService, ProjectContextService $contextService)
    {
        $this->openAIService = $openAIService;
        $this->contextService = $contextService;
    }

    public function classify(string $message, array $history = [], $project = null): array
    {
        if (env('OPENAI_API_KEY')) {
            try {
                $route = $this->llmRoute($message, $history, $project);
                if (! empty($route['kind'])) {
                    return $route;
                }
            } catch (Throwable $e) {
                Log::error('[IntentClassifier] LLM route failed', ['error' => $e->getMessage()]);
            }
        }
        $kind = $this->classifyIntentEnhanced($message);

        return ['kind' => $kind];
    }

    private function llmRoute(string $message, array $history = [], $project = null): array
    {
        // Get the project context if available (you may need to pass project to this method)
        $contextInfo = '';
        if ($project !== null) {
            $context = $this->contextService->getSanitizedContextForLLM($project, [
                'include_tasks' => true,
                'include_comments' => false,
            ]);
            $contextInfo = "\n\nCURRENT PROJECT STATE:\n".json_encode($context, JSON_PRETTY_PRINT);
        }

        $system = <<<SYS
You are a routing and parsing controller for a project management assistant.

CONTEXT AWARENESS:
- You have access to the complete project and task data
- Consider the conversation history when classifying intents
- Follow-up questions like "assigned to who?", "what's their ids?", or "their status?" refer to previously mentioned items
- Short phrases often relate to the previous topic discussed

CLASSIFICATION RULES:
Classify the user's last message as either:
- "question": The user is asking for information (including follow-ups like "assigned to who?", "what's their ids?", "what's their status?")
- "command": The user wants to change state (create, update, delete, assign tasks)

IMPORTANT FOLLOW-UP PATTERNS:
- "their ids" / "what's their ids" → question about previously mentioned tasks
- "assigned to who" / "who are they assigned to" → question about task assignments
- "their status" / "what status" → question about task statuses
- Any question with pronouns (they, them, their, those, these) → likely referring to previous context

RESPONSE FORMAT:
Return a single JSON object with ONLY these keys:
{
  "kind": "question" | "command",
  "question": "<rephrased question with full context, e.g., 'What are the IDs of the tasks in the project?'>",
  "plan": { "type": "...", "selector": {}, "payload": {}, "changes": {}, "filters": {}, "updates": {}, "assignee": "..." }
}

REPHRASING RULES:
- For "their ids?" → "What are the IDs of the tasks?"
- For "assigned to who?" → "Who are the tasks assigned to?"
- For "their status?" → "What is the status of the tasks?"
- Always make the rephrased question complete and unambiguous

COMMAND PARSING:
- Status must be: todo, inprogress, review, done
- Priority must be: low, medium, high, urgent
- Map stages: first->todo, second->inprogress, third->review, fourth->done
- If a person is mentioned ("Alice's tasks"), set filters.assigned_to_hint{$contextInfo}
SYS;

        $msgs = [['role' => 'system', 'content' => $system]];

        // Include comprehensive conversation history (last 10-15 messages for better context)
        $tail = array_slice($history, -15);
        foreach ($tail as $h) {
            $role = ($h['role'] ?? 'user') === 'assistant' ? 'assistant' : 'user';
            if (! empty($h['content']) && $role !== 'system') {
                $msgs[] = ['role' => $role, 'content' => $h['content']];
            }
        }

        // Add context about what was just discussed
        $recentContext = $this->extractRecentContext($history);
        if ($recentContext) {
            $msgs[] = ['role' => 'system', 'content' => "Recent context: User was just discussing {$recentContext}"];
        }

        $msgs[] = ['role' => 'user', 'content' => $message];

        Log::info('[IntentClassifier] Sending to LLM', [
            'message' => $message,
            'history_count' => count($tail),
            'recent_context' => $recentContext,
        ]);

    // Use assistant model (if configured) because routing benefits from higher tool/command reasoning.
    $result = $this->openAIService->chatJson($msgs, 0.1, true);

        // Enhance follow-up questions if needed
        if (isset($result['kind']) && $result['kind'] === 'question') {
            if (! isset($result['question']) || empty($result['question'])) {
                $result['question'] = $this->enhanceFollowUpQuestion($message, $history);
            }

            Log::info('[IntentClassifier] Question classified', [
                'original' => $message,
                'rephrased' => $result['question'] ?? null,
            ]);
        }

        return $result;
    }

    /**
     * Extract what was recently discussed from history
     */
    private function extractRecentContext(array $history): ?string
    {
        $recent = array_slice($history, -4);

        foreach (array_reverse($recent) as $msg) {
            if (($msg['role'] ?? '') === 'user') {
                $content = strtolower($msg['content'] ?? '');

                if (strpos($content, 'tasks') !== false) {
                    if (preg_match('/(\d+)\s+tasks?/i', $msg['content'], $matches)) {
                        return "{$matches[1]} tasks";
                    }

                    return 'tasks in the project';
                }

                if (preg_match('/#(\d+)/', $msg['content'], $matches)) {
                    return "task #{$matches[1]}";
                }

                if (strpos($content, 'project') !== false) {
                    return 'the project';
                }
            }
        }

        return null;
    }

    private function isFollowUpQuestion(string $message): bool
    {
        $m = strtolower(trim($message));

        // Check for phrases that typically indicate follow-up questions
        $followUpIndicators = [
            '/^(and|also|what about|how about)/i',
            '/^(assigned|belong|owned|created) (to|by)/i',
            '/^(who|whom|whose|their|they|them|it|its|that|those)/i',
            '/^(status|priority|due|deadline)/i',
        ];

        foreach ($followUpIndicators as $pattern) {
            if (preg_match($pattern, $m)) {
                return true;
            }
        }

        // Very short questions are often follow-ups
        return strlen($m) < 25 && strpos($m, '#') === false;
    }

    private function enhanceFollowUpQuestion(string $message, array $history): string
    {
        $m = strtolower(trim($message));

        // Look for what was discussed in recent history
        $recentContext = '';
        $recent = array_slice($history, -4);
        foreach ($recent as $msg) {
            if (($msg['role'] ?? '') === 'user') {
                if (preg_match('/\btasks?\b/i', $msg['content'] ?? '')) {
                    $recentContext = 'tasks';
                    break;
                }
                if (preg_match('/#(\d+)/', $msg['content'] ?? '', $matches)) {
                    $recentContext = "task #{$matches[1]}";
                    break;
                }
            }
        }

        // Enhance the question based on common patterns
        if (strpos($m, 'assigned') !== false || strpos($m, 'who') !== false) {
            return $recentContext ? "Who are the {$recentContext} assigned to?" : 'Who are the tasks assigned to?';
        }

        if (strpos($m, 'status') !== false) {
            return $recentContext ? "What is the status of {$recentContext}?" : 'What is the status of the tasks?';
        }

        if (strpos($m, 'their') !== false || strpos($m, 'they') !== false) {
            return $recentContext ? "Tell me about {$recentContext}" : $message;
        }

        return $message;
    }

    private function classifyIntentEnhanced(string $message): string
    {
        $m = strtolower(trim($message));

        // Check for questions first
        foreach (self::QUESTION_PATTERNS as $pattern) {
            if (preg_match($pattern, $m) && ! $this->hasStrongActionVerb($m)) {
                return 'question';
            }
        }

        // Check for action commands
        foreach (self::ACTION_PATTERNS as $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $m)) {
                    return 'command';
                }
            }
        }

        // Follow-up questions are usually questions
        if ($this->isFollowUpQuestion($message)) {
            return 'question';
        }

        return $this->isLikelyQuestion($m) ? 'question' : 'command';
    }

    private function hasStrongActionVerb(string $message): bool
    {
        return preg_match('/\b(create|add|delete|remove|update|change|move|assign|set|mark|make)\b/i', $message);
    }

    private function isLikelyQuestion(string $message): bool
    {
        return preg_match('/\b(how many|what is|who is|members|overview|summary|report|assigned to|belong|their|they)\b/i', $message);
    }
}
