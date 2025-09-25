<?php

namespace App\Agents;

use App\Agents\Contracts\ConversationalAgent;
use App\Agents\Runtime\AgentContext;
use App\Agents\Runtime\AgentKernel;
use App\Agents\Runtime\AgentResult;
use App\Agents\Support\AgentException;
use App\Agents\Tools\CommandPlanningTool;
use App\Agents\Tools\FallbackHelpTool;
use App\Agents\Tools\IntentAnalysisTool;
use App\Agents\Tools\QuestionAnswerTool;
use App\Models\Project;
use App\Services\ConversationHistoryManager;
use App\Services\IntentClassifierService;
use App\Services\QuestionAnsweringService;
use App\Services\CommandProcessingService;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProjectAssistantAgent implements ConversationalAgent
{
    private ConversationHistoryManager $historyManager;

    private AgentKernel $kernel;

    public function __construct(
        ConversationHistoryManager $historyManager,
        IntentClassifierService $classifier,
        QuestionAnsweringService $qaService,
        CommandProcessingService $commandProcessor
    ) {
        $this->historyManager = $historyManager;

        $this->kernel = new AgentKernel([
            new IntentAnalysisTool($classifier),
            new QuestionAnswerTool($qaService),
            new CommandPlanningTool($commandProcessor),
            new FallbackHelpTool($qaService),
        ]);
    }

    public function handle(Project $project, string $message, ?string $sessionId = null): AgentResult
    {
        $message = trim($message);

        if ($message === '') {
            return AgentResult::information('Please type a request.');
        }

        if ($this->looksLikeSecrets($message)) {
            return AgentResult::error("I can't process content that looks like secrets.");
        }

        $history = [];
        try {
            $history = $this->historyManager->getFormattedHistoryForOpenAI($project, $sessionId);
        } catch (Throwable $historyError) {
            Log::warning('[ProjectAssistantAgent] history unavailable, continuing without prior context', [
                'project_id' => $project->id,
                'session_id' => $sessionId,
                'error' => $historyError->getMessage(),
            ]);
        }

        $context = new AgentContext($project, $message, $sessionId, $history);

        try {
            $result = $this->kernel->run($context);
        } catch (AgentException $e) {
            Log::error('[ProjectAssistantAgent] agent unresolved', ['error' => $e->getMessage()]);

            return AgentResult::error('I was not able to figure out a helpful response. Please rephrase and try again.');
        } catch (Throwable $e) {
            Log::error('[ProjectAssistantAgent] unhandled exception', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return AgentResult::error('An unexpected error occurred. Please try again.');
        }

        $payload = $result->toArray();

        foreach ([['role' => 'user', 'content' => $message], ['role' => 'assistant', 'content' => (string) ($payload['message'] ?? '')]] as $entry) {
            try {
                $this->historyManager->addToHistory($project, $entry['role'], $entry['content'], $sessionId);
            } catch (Throwable $historyError) {
                Log::warning('[ProjectAssistantAgent] failed to record conversation message', [
                    'project_id' => $project->id,
                    'session_id' => $sessionId,
                    'role' => $entry['role'],
                    'error' => $historyError->getMessage(),
                ]);
            }
        }

        return $result;
    }

    private function looksLikeSecrets(string $text): bool
    {
        return (bool) preg_match('/\b(api_key|secret=|password=|token=|bearer|PRIVATE KEY)\b/i', $text);
    }
}
