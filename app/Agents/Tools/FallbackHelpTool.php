<?php

namespace App\Agents\Tools;

use App\Agents\Contracts\AgentTool;
use App\Agents\Runtime\AgentContext;
use App\Agents\Runtime\AgentResult;
use App\Services\QuestionAnsweringService;

class FallbackHelpTool implements AgentTool
{
    public function __construct(private QuestionAnsweringService $qaService)
    {
    }

    public function name(): string
    {
        return 'fallback-help';
    }

    public function supports(AgentContext $context): bool
    {
        return ! $context->hasResult();
    }

    public function invoke(AgentContext $context): void
    {
        $help = $this->qaService->provideHelp($context->project());
        $message = is_array($help) ? ($help['message'] ?? json_encode($help)) : (string) $help;

        $context->setResult(AgentResult::information(
            $message,
            [],
            [
                'intent' => 'fallback',
                'tool' => $this->name(),
            ]
        ));
    }
}
