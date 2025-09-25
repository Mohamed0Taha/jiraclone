<?php

namespace App\Agents\Runtime;

use App\Agents\Contracts\AgentTool;
use App\Agents\Support\AgentException;

class AgentKernel
{
    /** @var AgentTool[] */
    private array $tools;

    public function __construct(array $tools)
    {
        $this->tools = $tools;
    }

    public function run(AgentContext $context): AgentResult
    {
        foreach ($this->tools as $tool) {
            if ($context->hasResult()) {
                break;
            }

            if ($tool->supports($context)) {
                $tool->invoke($context);
            }
        }

        if (! $context->hasResult()) {
            throw AgentException::unresolved("Agent kernel did not produce a result.");
        }

        return $context->result();
    }
}
