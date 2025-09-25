<?php

namespace App\Agents\Runtime;

class AgentResult
{
    private array $payload;

    private function __construct(array $payload)
    {
        $this->payload = $payload;
    }

    public static function information(string $message, array $data = [], array $meta = []): self
    {
        $payload = [
            'type' => 'information',
            'message' => $message,
            'requires_confirmation' => false,
        ];

        if (! empty($data)) {
            $payload['data'] = $data;
            $payload['ui'] = $payload['ui'] ?? ['show_snapshot' => true];
        }

        if (! empty($meta)) {
            $payload['meta'] = $meta;
        }

        return new self($payload);
    }

    public static function commandPreview(string $message, array $commandData, bool $requiresConfirmation = true, array $meta = []): self
    {
        $payload = [
            'type' => 'command',
            'message' => $message,
            'command_data' => $commandData,
            'requires_confirmation' => $requiresConfirmation,
        ];

        if (! empty($meta)) {
            $payload['meta'] = $meta;
        }

        return new self($payload);
    }

    public static function error(string $message, array $meta = []): self
    {
        $payload = [
            'type' => 'error',
            'message' => $message,
            'requires_confirmation' => false,
        ];

        if (! empty($meta)) {
            $payload['meta'] = $meta;
        }

        return new self($payload);
    }

    public function toArray(): array
    {
        return $this->payload;
    }
}
