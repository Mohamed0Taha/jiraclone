<?php

namespace App\Agents\Tools;

use App\Agents\Contracts\AgentTool;
use App\Agents\Runtime\AgentContext;
use App\Services\IntentClassifierService;

class IntentAnalysisTool implements AgentTool
{
    public function __construct(private IntentClassifierService $classifier) {}

    public function name(): string
    {
        return 'intent-analysis';
    }

    public function supports(AgentContext $context): bool
    {
        return ! $context->hasState('intent');
    }

    public function invoke(AgentContext $context): void
    {
        $intent = $this->classifier->classify(
            $context->message(),
            $context->history(),
            $context->project()
        );

        $context->setState('intent', $intent);
    }
}
