<?php

namespace App\Services;

use App\Models\Project;
use App\Services\OpenAIAssistantService;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * AssistantManagerService
 * 
 * Manages OpenAI Assistants for projects, using existing meta column for storage.
 * This service bridges your existing architecture with OpenAI Assistant capabilities.
 */
class AssistantManagerService
{
    public function __construct(
        private OpenAIAssistantService $openAIAssistantService
    ) {}

    /**
     * Get or create an OpenAI Assistant for a project
     */
    public function getProjectAssistantId(Project $project): ?string
    {
        try {
            // Check if project already has an assistant ID in meta column
            $meta = $project->meta ?? [];
            if (isset($meta['openai_assistant_id'])) {
                return $meta['openai_assistant_id'];
            }

            // Create new assistant for this project
            Log::info('Creating OpenAI assistant for project', ['project_id' => $project->id]);
            $assistant = $this->openAIAssistantService->createProjectAssistant($project);

            // Store in existing meta column (no DB schema changes needed!)
            $project->update([
                'meta' => array_merge($meta, [
                    'openai_assistant_id' => $assistant['id'],
                    'assistant_created_at' => now()->toISOString(),
                    'ai_enhancement_enabled' => true
                ])
            ]);

            Log::info('OpenAI assistant created successfully', [
                'project_id' => $project->id,
                'assistant_id' => $assistant['id']
            ]);

            return $assistant['id'];

        } catch (Exception $e) {
            Log::warning('Failed to create/get OpenAI assistant', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get or create a conversation thread for a project session
     */
    public function getOrCreateThread(Project $project, ?string $sessionId = null): ?string
    {
        try {
            $threadKey = 'openai_thread_' . ($sessionId ?? 'default');
            $meta = $project->meta ?? [];

            // Check if thread already exists for this session
            if (isset($meta[$threadKey])) {
                return $meta[$threadKey];
            }

            // Create new thread
            $thread = $this->openAIAssistantService->createThread();
            $threadId = $thread['id'];

            // Store thread ID in project meta
            $project->update([
                'meta' => array_merge($meta, [
                    $threadKey => $threadId,
                    'last_thread_created' => now()->toISOString()
                ])
            ]);

            Log::info('OpenAI thread created', [
                'project_id' => $project->id,
                'thread_id' => $threadId,
                'session_id' => $sessionId
            ]);

            return $threadId;

        } catch (Exception $e) {
            Log::warning('Failed to create/get OpenAI thread', [
                'project_id' => $project->id,
                'session_id' => $sessionId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Check if AI enhancement is enabled for this project
     * Default to enabled for all projects
     */
    public function isAIEnhancementEnabled(Project $project): bool
    {
        $meta = $project->meta ?? [];
        return $meta['ai_enhancement_enabled'] ?? true; // Default to enabled
    }

    /**
     * Toggle AI enhancement for a project
     */
    public function toggleAIEnhancement(Project $project, bool $enabled): void
    {
        $meta = $project->meta ?? [];
        $project->update([
            'meta' => array_merge($meta, [
                'ai_enhancement_enabled' => $enabled,
                'enhancement_toggled_at' => now()->toISOString()
            ])
        ]);

        Log::info('AI enhancement toggled', [
            'project_id' => $project->id,
            'enabled' => $enabled
        ]);
    }

    /**
     * Chat with the project's OpenAI Assistant
     */
    public function chatWithAssistant(Project $project, string $message, ?string $sessionId = null): ?string
    {
        try {
            $assistantId = $this->getProjectAssistantId($project);
            if (!$assistantId) {
                return null;
            }

            $threadId = $this->getOrCreateThread($project, $sessionId);
            if (!$threadId) {
                return null;
            }

            $response = $this->openAIAssistantService->chatWithAssistant($threadId, $assistantId, $message);
            return $response['response'] ?? null;

        } catch (Exception $e) {
            Log::error('OpenAI Assistant chat failed', [
                'project_id' => $project->id,
                'message' => substr($message, 0, 100),
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get assistant capabilities for a project
     */
    public function getAssistantCapabilities(Project $project): array
    {
        $meta = $project->meta ?? [];
        $hasAssistant = isset($meta['openai_assistant_id']);
        $aiEnabled = $meta['ai_enhancement_enabled'] ?? true; // Default to enabled

        return [
            'has_assistant' => $hasAssistant,
            'ai_enhanced' => $aiEnabled,
            'assistant_id' => $meta['openai_assistant_id'] ?? null,
            'created_at' => $meta['assistant_created_at'] ?? null,
            'capabilities' => $aiEnabled ? [
                'persistent_memory',
                'project_context_awareness', 
                'function_calling',
                'advanced_reasoning'
            ] : []
        ];
    }
}
