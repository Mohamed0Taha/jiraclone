<?php

namespace App\Services\Generative;

class BlueprintRegistry
{
    private array $componentBlueprints = [];

    public function __construct(array $blueprints = [])
    {
        // Allow injection for tests; otherwise the main service populates via an exported map
        $this->componentBlueprints = $blueprints;
    }

    public function setBlueprints(array $blueprints): void
    {
        $this->componentBlueprints = $blueprints;
    }

    public function getBlueprints(): array
    {
        return $this->componentBlueprints;
    }

    public function match(string $userRequest): ?array
    {
        $normalized = strtolower($userRequest);
        foreach ($this->componentBlueprints as $slug => $blueprint) {
            $labels = $blueprint['labels'] ?? [];
            foreach ($labels as $label) {
                if (str_contains($normalized, strtolower($label))) {
                    $blueprint['slug'] = $slug;
                    return $blueprint;
                }
            }
        }
        return null;
    }
}

