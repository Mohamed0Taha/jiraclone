<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Lightweight pseudo-AI generator (can later swap to real LLM) for unique project ideas.
 */
class ProjectIdeaGenerator
{
    protected array $domains = ['E-Commerce', 'FinTech', 'Health', 'Education', 'Analytics', 'Collaboration', 'Developer Tools', 'Productivity', 'Gaming', 'IoT', 'Security'];

    protected array $targets = ['MVP', 'Platform', 'Dashboard', 'Portal', 'Service', 'API', 'Assistant', 'Automation', 'Engine', 'Toolkit'];

    protected array $features = [
        'real-time notifications', 'role-based access', 'audit logging', 'analytics charts', 'integrations hub', 'webhooks', 'AI summarization', 'multi-tenant support', 'offline caching', 'data export', 'advanced search', 'tagging system', 'rate limiting', 'background jobs', 'file uploads',
    ];

    public function generate(): array
    {
        $domain = collect($this->domains)->random();
        $target = collect($this->targets)->random();
        $title = $domain.' '.$target;
        $budget = rand(14000, 26000);
        $picked = collect($this->features)->random(rand(4, 7))->values()->all();
        $description = 'Build a '.$target.' in the '.$domain.' space focusing on '.Str::lower($picked[0]).' and '.Str::lower($picked[1]).'.';
        $requirements = implode(', ', $picked);

        return compact('title', 'description', 'budget', 'requirements');
    }
}
