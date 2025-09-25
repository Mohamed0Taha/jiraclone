<?php

namespace App\Agents\Tools;

use App\Agents\Contracts\AgentTool;
use App\Agents\Runtime\AgentContext;
use App\Agents\Runtime\AgentResult;
use App\Services\CommandProcessingService;

class CommandPlanningTool implements AgentTool
{
    public function __construct(private CommandProcessingService $commandProcessor)
    {
    }

    public function name(): string
    {
        return 'command-planning';
    }

    public function supports(AgentContext $context): bool
    {
        $intent = $context->getState('intent', []);

        return ($intent['kind'] ?? null) === 'command' && ! $context->hasResult();
    }

    public function invoke(AgentContext $context): void
    {
        $intent = $context->getState('intent', []);
        $planSeed = $intent['plan'] ?? [];

        $planResult = $this->commandProcessor->generatePlan(
            $context->project(),
            $context->message(),
            $context->history(),
            $planSeed
        );

        $context->setState('plan_result', $planResult);

        $commandData = $planResult['command_data'] ?? null;
        $preview = (string) ($planResult['preview_message'] ?? '');
        $meta = [
            'intent' => 'command',
            'tool' => $this->name(),
            'plan' => $planResult,
        ];

        if (! empty($commandData)) {
            $context->setResult(AgentResult::commandPreview($preview, $commandData, true, $meta));

            return;
        }

        $context->setResult(AgentResult::information($preview, [], $meta));
    }
}
