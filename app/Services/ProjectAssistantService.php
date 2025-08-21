<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\Log;
use Throwable;

// Import statements for all the refactored services
// Assuming OpenAIService is also in this namespace

/**
 * ProjectAssistantService (Orchestrator)
 *
 * Main entry point that orchestrates the workflow by delegating to specialized services.
 */
class ProjectAssistantService
{
    private IntentClassifierService $classifier;

    private QuestionAnsweringService $qnaService;

    private CommandProcessingService $commandProcessor;

    private CommandExecutionService $commandExecutor;

    private ConversationHistoryManager $historyManager;

    public function __construct(
        IntentClassifierService $classifier,
        QuestionAnsweringService $qnaService,
        CommandProcessingService $commandProcessor,
        CommandExecutionService $commandExecutor,
        ConversationHistoryManager $historyManager
    ) {
        $this->classifier = $classifier;
        $this->qnaService = $qnaService;
        $this->commandProcessor = $commandProcessor;
        $this->commandExecutor = $commandExecutor;
        $this->historyManager = $historyManager;
    }

    public function processMessage(Project $project, string $message, ?string $sessionId = null): array
    {
        try {
            Log::debug('[ProjectAssistantService] processMessage start', ['message' => $message, 'sessionId' => $sessionId]);
            $message = trim($message);
            if ($message === '') {
                return $this->createResponse('information', 'Please type a request.', false);
            }
            if ($this->looksLikeSecrets($message)) {
                return $this->createResponse('error', "I can't process content that looks like secrets.", false);
            }

            // Use ConversationHistoryManager for full context
            $history = $this->historyManager->getFormattedHistoryForOpenAI($project, $sessionId);
            Log::debug('[ProjectAssistantService] history loaded', ['history' => $history]);

            $intent = $this->classifier->classify($message, $history);
            Log::debug('[ProjectAssistantService] intent classified', ['intent' => $intent]);

            if ($intent['kind'] === 'question') {
                $answer = $this->qnaService->answer($project, $message, $history, $intent['question'] ?? null);
                Log::debug('[ProjectAssistantService] answer', ['answer' => $answer]);
                $this->historyManager->addToHistory($project, 'user', $message, $sessionId);
                $this->historyManager->addToHistory($project, 'assistant', $answer, $sessionId);

                return $this->createResponse('information', $answer, false);
            }

            if ($intent['kind'] === 'command') {
                $planResult = $this->commandProcessor->generatePlan($project, $message, $history, $intent['plan'] ?? []);
                Log::debug('[ProjectAssistantService] planResult', ['planResult' => $planResult]);
                if (! empty($planResult['command_data'])) {
                    $this->historyManager->addToHistory($project, 'user', $message, $sessionId);
                    $this->historyManager->addToHistory($project, 'assistant', $planResult['preview_message'], $sessionId);

                    return [
                        'type' => 'command',
                        'message' => $planResult['preview_message'],
                        'command_data' => $planResult['command_data'],
                        'requires_confirmation' => true,
                    ];
                }
                $this->historyManager->addToHistory($project, 'user', $message, $sessionId);
                $this->historyManager->addToHistory($project, 'assistant', $planResult['preview_message'], $sessionId);

                return $this->createResponse('information', $planResult['preview_message'], false);
            }

            $helpArr = $this->qnaService->provideHelp($project);
            $helpMsg = is_array($helpArr) && isset($helpArr['message']) ? $helpArr['message'] : (string) $helpArr;
            $this->historyManager->addToHistory($project, 'user', $message, $sessionId);
            $this->historyManager->addToHistory($project, 'assistant', $helpMsg, $sessionId);
            Log::debug('[ProjectAssistantService] helpArr', ['helpArr' => $helpArr]);

            return $helpArr;
        } catch (Throwable $e) {
            Log::error('[ProjectAssistantService] Unhandled Exception', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->createResponse('error', 'An unexpected error occurred. Please try again.', false);
        }
    }

    public function executeCommand(Project $project, array $plan): array
    {
        return $this->commandExecutor->execute($project, $plan);
    }

    private function looksLikeSecrets(string $text): bool
    {
        return preg_match('/\b(api_key|secret=|password=|token=|bearer|PRIVATE KEY)\b/i', $text);
    }

    private function createResponse(string $type, string $message, bool $requiresConfirmation): array
    {
        return ['type' => $type, 'message' => $message, 'requires_confirmation' => $requiresConfirmation];
    }
}
