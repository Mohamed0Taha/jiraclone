<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\Log;
use OpenAI\Laravel\Facades\OpenAI;
use Exception;

class ProjectAssistantService
{
    private const MAX_CONTEXT_LENGTH = 4000;
    private const MAX_RESPONSE_LENGTH = 1000;
    
    // Security keywords that should trigger content filtering
    private const SECURITY_FILTERS = [
        'password', 'secret', 'key', 'token', 'credential', 'api_key',
        'database', 'connection', 'server', 'admin', 'root', 'config',
        'env', 'environment', 'private', 'confidential', 'sensitive'
    ];

    public function buildProjectContext(Project $project): array
    {
        $project->load(['tasks.assignee', 'tasks.creator', 'user']);
        
        // Build sanitized project context
        $context = [
            'project_name' => $project->name,
            'project_description' => $project->description,
            'project_status' => $this->getProjectStatus($project),
            'methodology' => $project->meta['methodology'] ?? 'kanban',
            'start_date' => $project->start_date,
            'end_date' => $project->end_date,
            'tasks_summary' => $this->buildTasksSummary($project),
            'team_summary' => $this->buildTeamSummary($project),
            'project_meta' => $this->sanitizeProjectMeta($project->meta ?? []),
        ];

        return $context;
    }

    public function processMessage(Project $project, string $message, array $conversationHistory = []): string
    {
        // Log for debugging
        Log::info('ProjectAssistant: Processing message', [
            'project_id' => $project->id,
            'message' => $message,
            'conversation_count' => count($conversationHistory)
        ]);

        // Step 1: Content sanitation - check if message is project-related
        $isProjectRelated = $this->isProjectRelatedQuery($message);
        Log::info('ProjectAssistant: Project related check', [
            'message' => $message,
            'is_project_related' => $isProjectRelated
        ]);
        
        if (!$isProjectRelated) {
            $response = $this->getOffTopicResponse();
            Log::info('ProjectAssistant: Off-topic response', ['response' => $response]);
            return $response;
        }

        // Step 2: Security filtering
        $hasSecurityRisks = $this->containsSecurityRisks($message);
        Log::info('ProjectAssistant: Security check', [
            'message' => $message,
            'has_security_risks' => $hasSecurityRisks
        ]);
        
        if ($hasSecurityRisks) {
            return "I can't provide information about sensitive system details. Please ask about project-related topics like tasks, timelines, team members, or project goals.";
        }

        // Step 3: Build context-aware prompt
        $context = $this->buildProjectContext($project);
        $systemPrompt = $this->buildSystemPrompt($context);
        
        // Step 4: Prepare conversation for OpenAI
        $messages = $this->prepareConversation($systemPrompt, $conversationHistory, $message);

        // Log the messages being sent to OpenAI
        Log::info('ProjectAssistant: Sending to OpenAI', [
            'messages_count' => count($messages),
            'system_prompt_length' => strlen($systemPrompt),
            'user_message' => $message
        ]);

        // Step 5: Get AI response
        $response = $this->callOpenAI($messages);

        // Step 6: Sanitize and validate response
        $finalResponse = $this->sanitizeResponse($response, $project);
        
        Log::info('ProjectAssistant: Final response', [
            'raw_response_length' => strlen($response),
            'final_response_length' => strlen($finalResponse),
            'final_response' => $finalResponse
        ]);

        return $finalResponse;
    }

    public function getConversationSuggestions(Project $project): array
    {
        $suggestions = [
            "What's the current progress of this project?",
            "Which tasks are overdue or need attention?",
            "Who is assigned to the most tasks?",
            "What are the upcoming deadlines?",
            "Summarize the project objectives and constraints",
        ];

        // Add dynamic suggestions based on project state
        $taskCount = $project->tasks->count();
        if ($taskCount > 0) {
            $suggestions[] = "What tasks are in progress right now?";
            $suggestions[] = "Show me the task distribution by status";
        }

        if ($project->end_date) {
            $suggestions[] = "How much time is left until the project deadline?";
        }

        return array_slice($suggestions, 0, 6);
    }

    private function isProjectRelatedQuery(string $message): bool
    {
        $projectKeywords = [
            'task', 'project', 'deadline', 'progress', 'status', 'team', 'member',
            'milestone', 'goal', 'objective', 'requirement', 'feature', 'bug',
            'timeline', 'schedule', 'assignee', 'assigned', 'priority', 'urgent',
            'todo', 'done', 'complete', 'finish', 'start', 'end', 'date',
            'methodology', 'kanban', 'scrum', 'agile', 'waterfall', 'lean',
            'story', 'epic', 'sprint', 'backlog', 'review', 'testing',
            'summary', 'overview', 'analyze', 'analysis', 'report', 'update'
        ];

        $messageLower = strtolower($message);
        
        // Check if message contains project-related keywords
        foreach ($projectKeywords as $keyword) {
            if (strpos($messageLower, $keyword) !== false) {
                return true;
            }
        }

        // Allow most question words and commands - be more permissive
        $generalPatterns = [
            'what', 'how', 'when', 'who', 'where', 'why', 'which',
            'show', 'tell', 'explain', 'describe', 'list', 'count',
            'status', 'progress', 'update', 'summary', 'overview',
            'help', 'can you', 'could you', 'please', 'need', 'want',
            'current', 'recent', 'latest', 'next', 'upcoming',
            'hello', 'hi', 'hey', 'thanks', 'thank you'
        ];

        foreach ($generalPatterns as $pattern) {
            if (strpos($messageLower, $pattern) !== false) {
                return true;
            }
        }

        // If message is short (likely a greeting or simple question), allow it
        if (strlen(trim($message)) < 50) {
            return true;
        }

        return false;
    }

    private function containsSecurityRisks(string $message): bool
    {
        $messageLower = strtolower($message);
        
        foreach (self::SECURITY_FILTERS as $filter) {
            if (strpos($messageLower, $filter) !== false) {
                return true;
            }
        }

        return false;
    }

    private function getOffTopicResponse(): string
    {
        $responses = [
            "I'm a project assistant focused on helping with this specific project. Please ask me about tasks, deadlines, team members, or project progress.",
            "I can only help with questions related to this project. Feel free to ask about task status, timelines, or team assignments.",
            "Let's keep our conversation focused on this project. I can help with task management, progress tracking, and project planning questions.",
            "I'm designed to assist with project-related topics only. Ask me about your tasks, milestones, or team collaboration for this project."
        ];

        return $responses[array_rand($responses)];
    }

    private function buildSystemPrompt(array $context): string
    {
        return "You are a helpful project assistant for the project '{$context['project_name']}'. 

IMPORTANT SECURITY CONSTRAINTS:
- ONLY discuss topics related to this specific project
- NEVER provide information about other projects, systems, or sensitive data
- If asked about unrelated topics, politely redirect to project matters
- Do not discuss technical infrastructure, databases, or system configuration

PROJECT CONTEXT:
Project: {$context['project_name']}
Description: {$context['project_description']}
Methodology: {$context['methodology']}
Timeline: {$context['start_date']} to {$context['end_date']}

TASKS SUMMARY:
{$context['tasks_summary']}

TEAM SUMMARY:
{$context['team_summary']}

PROJECT DETAILS:
" . json_encode($context['project_meta'], JSON_PRETTY_PRINT) . "

Provide helpful, concise responses about this project only. Focus on task management, progress tracking, deadlines, and team coordination. Keep responses under 300 words.";
    }

    private function buildTasksSummary(Project $project): string
    {
        $tasks = $project->tasks;
        $total = $tasks->count();
        
        if ($total === 0) {
            return "No tasks have been created yet for this project.";
        }

        $byStatus = $tasks->groupBy('status');
        $summary = "Total tasks: {$total}\n";
        
        foreach (['todo', 'inprogress', 'review', 'done'] as $status) {
            $count = $byStatus->get($status, collect())->count();
            $statusLabel = ucfirst(str_replace('_', ' ', $status));
            $summary .= "- {$statusLabel}: {$count}\n";
        }

        // Add overdue tasks info if any
        $overdue = $tasks->filter(function ($task) {
            return $task->end_date && $task->end_date < now() && $task->status !== 'done';
        });

        if ($overdue->count() > 0) {
            $summary .= "- Overdue: {$overdue->count()}\n";
        }

        return trim($summary);
    }

    private function buildTeamSummary(Project $project): string
    {
        // Get unique users from project owner and task assignees
        $users = collect();
        
        // Add project owner
        if ($project->user) {
            $users->put($project->user->id, $project->user);
        }
        
        // Add task assignees
        foreach ($project->tasks as $task) {
            if ($task->assignee) {
                $users->put($task->assignee->id, $task->assignee);
            }
            if ($task->creator) {
                $users->put($task->creator->id, $task->creator);
            }
        }
        
        $totalMembers = $users->count();
        
        if ($totalMembers === 0) {
            return "No team members assigned to this project.";
        }

        $summary = "Team members: {$totalMembers}\n";
        
        // Add task assignments
        foreach ($users as $user) {
            $assignedTasks = $project->tasks->where('assignee_id', $user->id)->count();
            $createdTasks = $project->tasks->where('creator_id', $user->id)->count();
            $summary .= "- {$user->name}: {$assignedTasks} assigned tasks, {$createdTasks} created tasks\n";
        }

        return trim($summary);
    }

    private function sanitizeProjectMeta(array $meta): array
    {
        // Remove sensitive keys and limit what's shared
        $allowedKeys = [
            'project_type', 'domain', 'team_size', 'budget',
            'objectives', 'constraints', 'methodology', 'location'
        ];

        return array_intersect_key($meta, array_flip($allowedKeys));
    }

    private function getProjectStatus(Project $project): string
    {
        $tasks = $project->tasks;
        $total = $tasks->count();
        
        if ($total === 0) {
            return 'Not started';
        }

        $completed = $tasks->where('status', 'done')->count();
        $percentage = round(($completed / $total) * 100);

        if ($percentage === 100) {
            return 'Completed';
        } elseif ($percentage >= 75) {
            return 'Nearly complete';
        } elseif ($percentage >= 50) {
            return 'In progress';
        } elseif ($percentage >= 25) {
            return 'Getting started';
        } else {
            return 'Just started';
        }
    }

    private function prepareConversation(string $systemPrompt, array $history, string $newMessage): array
    {
        $messages = [
            ['role' => 'system', 'content' => $systemPrompt]
        ];

        // Add conversation history (limit to last 10 exchanges to stay within token limits)
        $recentHistory = array_slice($history, -10);
        foreach ($recentHistory as $msg) {
            $messages[] = [
                'role' => $msg['role'],
                'content' => substr($msg['content'], 0, 500) // Limit length
            ];
        }

        // Add new user message
        $messages[] = [
            'role' => 'user',
            'content' => $newMessage
        ];

        return $messages;
    }

    private function callOpenAI(array $messages): string
    {
        try {
            Log::info('ProjectAssistant: Making OpenAI API call', [
                'model' => config('openai.model', 'gpt-4o'),
                'messages_count' => count($messages),
                'api_key_set' => !empty(config('openai.api_key'))
            ]);

            $response = OpenAI::chat()->create([
                'model' => config('openai.model', 'gpt-4o'),
                'messages' => $messages,
                'max_tokens' => 300,
                'temperature' => 0.7,
            ]);

            Log::info('ProjectAssistant: OpenAI response received', [
                'choices_count' => count($response['choices'] ?? []),
                'response_type' => get_class($response)
            ]);

            $content = $response['choices'][0]['message']['content'] ?? '';
            
            if (empty($content)) {
                Log::warning('ProjectAssistant: Empty response from OpenAI', [
                    'full_response' => $response
                ]);
                throw new Exception('Empty response from OpenAI');
            }

            Log::info('ProjectAssistant: Valid response extracted', [
                'content_length' => strlen($content),
                'content_preview' => substr($content, 0, 100) . '...'
            ]);

            return trim($content);
        } catch (\Exception $e) {
            Log::error('OpenAI API Error', [
                'error' => $e->getMessage(),
                'error_class' => get_class($e),
                'messages' => $messages,
                'api_key_configured' => !empty(config('openai.api_key'))
            ]);
            throw new Exception('Failed to get AI response: ' . $e->getMessage());
        }
    }

    private function sanitizeResponse(string $response, Project $project): string
    {
        Log::info('ProjectAssistant: Sanitizing response', [
            'response_length' => strlen($response),
            'response_preview' => substr($response, 0, 100) . '...'
        ]);

        // Additional response filtering to ensure it's project-focused
        $projectName = strtolower($project->name);
        $responseLower = strtolower($response);

        // Check if response mentions the project or project-related terms (expanded list)
        $projectTerms = [
            'task', 'project', 'team', 'deadline', 'progress', 'status',
            'work', 'complete', 'done', 'todo', 'assign', 'member',
            'timeline', 'schedule', 'goal', 'objective', 'milestone',
            'can', 'help', 'assist', 'information', 'about', 'regarding',
            'current', 'update', 'summary', 'overview', 'details'
        ];
        $hasProjectTerms = false;

        foreach ($projectTerms as $term) {
            if (strpos($responseLower, $term) !== false) {
                $hasProjectTerms = true;
                break;
            }
        }

        // Only apply fallback if response is long AND completely unrelated
        // Reduced threshold and made more lenient
        if (!$hasProjectTerms && strlen($response) > 150) {
            Log::warning('ProjectAssistant: Response seems unrelated, using fallback', [
                'original_response' => $response
            ]);
            return "I can help you with questions about your project tasks, timelines, team members, and progress. What specific aspect of the project would you like to know about?";
        }

        // Limit response length
        if (strlen($response) > self::MAX_RESPONSE_LENGTH) {
            $response = substr($response, 0, self::MAX_RESPONSE_LENGTH) . '...';
        }

        Log::info('ProjectAssistant: Response sanitized successfully', [
            'final_response_length' => strlen($response)
        ]);

        return $response;
    }

    /**
     * Test method to verify the assistant is working
     */
    public function testAssistant(Project $project): array
    {
        $testMessage = "What is this project about?";
        
        try {
            $response = $this->processMessage($project, $testMessage);
            
            return [
                'success' => true,
                'test_message' => $testMessage,
                'response' => $response,
                'response_length' => strlen($response),
                'project_name' => $project->name,
                'api_key_configured' => !empty(config('openai.api_key'))
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'test_message' => $testMessage,
                'project_name' => $project->name,
                'api_key_configured' => !empty(config('openai.api_key'))
            ];
        }
    }
}
