<?php

namespace App\Agents\Tools;

use App\Agents\Contracts\AgentTool;
use App\Agents\Runtime\AgentContext;
use App\Agents\Runtime\AgentResult;
use App\Services\AssistantManagerService;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * OpenAI Assistant Tool
 * 
 * Integrates OpenAI Assistants into your existing AgentKernel as an additional tool.
 * This tool handles complex queries that require advanced reasoning or project insights.
 */
class OpenAIAssistantTool implements AgentTool
{
    public function __construct(
        private AssistantManagerService $assistantManager
    ) {}

    public function name(): string
    {
        return 'openai-assistant';
    }

    /**
     * Determines if this tool should handle the query
     * Only activates for complex queries when AI enhancement is enabled
     */
    public function supports(AgentContext $context): bool
    {
        // Don't interfere if another tool already provided a result
        if ($context->hasResult()) {
            return false;
        }

        $project = $context->project();
        
        // Check if AI enhancement is enabled for this project
        if (!$this->assistantManager->isAIEnhancementEnabled($project)) {
            return false;
        }

        $message = $context->message();
        $intent = $context->getState('intent', []);

        // Handle complex queries that need advanced reasoning
        return $this->isComplexQuery($message, $intent);
    }

    /**
     * Process the query using OpenAI Assistant
     */
    public function invoke(AgentContext $context): void
    {
        $project = $context->project();
        $message = $context->message();
        $sessionId = $context->sessionId();

        try {
            Log::info('OpenAI Assistant tool processing query', [
                'project_id' => $project->id,
                'message_length' => strlen($message),
                'session_id' => $sessionId
            ]);

            // Chat with the project's OpenAI Assistant
            $response = $this->assistantManager->chatWithAssistant($project, $message, $sessionId);

            if ($response) {
                Log::info('OpenAI Assistant provided response', [
                    'project_id' => $project->id,
                    'response_length' => strlen($response)
                ]);

                // Enhance the response to indicate it came from AI Assistant
                $enhancedResponse = "🤖 **AI Assistant**: " . $response;
                
                $context->setResult(AgentResult::information($enhancedResponse));
            } else {
                // If OpenAI Assistant fails, let other tools handle it
                Log::warning('OpenAI Assistant could not provide response, delegating to other tools', [
                    'project_id' => $project->id
                ]);
            }

        } catch (Exception $e) {
            Log::error('OpenAI Assistant tool error', [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);
            
            // Don't set an error result - let other tools handle the fallback
            // This preserves your existing robust fallback system
        }
    }

    /**
     * Determine if a query is complex enough to warrant OpenAI Assistant
     */
    private function isComplexQuery(string $message, array $intent): bool
    {
        $message = strtolower(trim($message));

        // Complex analysis requests
        $analysisPatterns = [
            'analyze', 'analysis', 'insights', 'patterns', 'trends',
            'recommend', 'suggestion', 'advice', 'strategy', 'approach',
            'explain why', 'how should', 'what if', 'compare', 'evaluate'
        ];

        // Project planning and management
        $planningPatterns = [
            'plan for', 'roadmap', 'timeline', 'milestone', 'priority',
            'optimize', 'improve', 'better way', 'best practice',
            'risk', 'challenge', 'bottleneck', 'blocker'
        ];

        // Creative or strategic thinking
        $creativePatterns = [
            'brainstorm', 'idea', 'creative', 'innovative', 'solution',
            'alternative', 'different approach', 'think outside',
            'what would happen if', 'scenario'
        ];

        // Complex project queries
        $projectPatterns = [
            'overall project', 'project health', 'team performance',
            'project status', 'progress overview', 'next steps',
            'bigger picture', 'high level', 'summary'
        ];

        $allPatterns = array_merge($analysisPatterns, $planningPatterns, $creativePatterns, $projectPatterns);

        // Check if message contains complex query indicators
        foreach ($allPatterns as $pattern) {
            if (str_contains($message, $pattern)) {
                return true;
            }
        }

        // Check intent classification for complex types
        $intentKind = $intent['kind'] ?? '';
        $complexIntents = ['analysis', 'planning', 'strategy', 'evaluation'];
        
        if (in_array($intentKind, $complexIntents)) {
            return true;
        }

        // Long messages often require complex reasoning
        if (strlen($message) > 100 && str_word_count($message) > 15) {
            return true;
        }

        // Questions with multiple clauses
        if (substr_count($message, '?') > 1 || (str_contains($message, '?') && str_contains($message, ' and '))) {
            return true;
        }

        return false;
    }
}
