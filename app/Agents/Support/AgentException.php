<?php

namespace App\Agents\Support;

use RuntimeException;

class AgentException extends RuntimeException
{
    public static function unresolved(string $message, array $context = []): self
    {
        $payload = empty($context) ? $message : $message.' '.json_encode($context);

        return new self($payload);
    }
}
