<?php

namespace App\Agents\Contracts;

use App\Agents\Runtime\AgentContext;

interface AgentTool
{
    public function name(): string;

    public function supports(AgentContext $context): bool;

    public function invoke(AgentContext $context): void;
}
