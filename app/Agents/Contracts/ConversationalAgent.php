<?php

namespace App\Agents\Contracts;

use App\Agents\Runtime\AgentResult;
use App\Models\Project;

interface ConversationalAgent
{
    public function handle(Project $project, string $message, ?string $sessionId = null): AgentResult;
}
