<?php

namespace App\Agents\Runtime;

use App\Models\Project;

class AgentContext
{
    private Project $project;

    private string $message;

    private ?string $sessionId;

    private array $history;

    private array $state = [];

    private ?AgentResult $result = null;

    private array $debugNotes = [];

    public function __construct(Project $project, string $message, ?string $sessionId = null, array $history = [])
    {
        $this->project = $project;
        $this->message = $message;
        $this->sessionId = $sessionId;
        $this->history = $history;
    }

    public function project(): Project
    {
        return $this->project;
    }

    public function message(): string
    {
        return $this->message;
    }

    public function sessionId(): ?string
    {
        return $this->sessionId;
    }

    public function history(): array
    {
        return $this->history;
    }

    public function setHistory(array $history): void
    {
        $this->history = $history;
    }

    public function setState(string $key, mixed $value): void
    {
        $this->state[$key] = $value;
    }

    public function getState(string $key, mixed $default = null): mixed
    {
        return $this->state[$key] ?? $default;
    }

    public function hasState(string $key): bool
    {
        return array_key_exists($key, $this->state);
    }

    public function setResult(AgentResult $result): void
    {
        $this->result = $result;
    }

    public function hasResult(): bool
    {
        return $this->result !== null;
    }

    public function result(): ?AgentResult
    {
        return $this->result;
    }

    public function addDebugNote(string $note, array $context = []): void
    {
        $this->debugNotes[] = ['note' => $note, 'context' => $context];
    }

    public function debugNotes(): array
    {
        return $this->debugNotes;
    }
}
