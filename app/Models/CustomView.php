<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomView extends Model
{
    protected $fillable = [
        'project_id',
        'user_id', 
        'name',
        'description',
        'html_content', // Now stores React component code instead of HTML
        'metadata',
        'is_active',
        'last_accessed_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'is_active' => 'boolean',
        'last_accessed_at' => 'datetime',
    ];

    /**
     * Get the project that owns the custom view
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the user that created the custom view
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Update last accessed timestamp
     */
    public function updateLastAccessed(): void
    {
        $this->update(['last_accessed_at' => now()]);
    }

    /**
     * Get the active custom view for a project (shared across users)
     * Note: Previously filtered by user_id; now shared at project+name level.
     */
    public static function getActiveForProject(int $projectId, int $userId, string $viewName = 'default'): ?self
    {
        return static::where('project_id', $projectId)
            ->where('name', $viewName)
            ->where('is_active', true)
            ->orderByDesc('updated_at')
            ->first();
    }

    /**
     * Create or update a custom view with React component code
     * Shared across users: uniqueness is project_id + name (user_id stored for audit only)
     */
    public static function createOrUpdate(int $projectId, int $userId, string $name, string $componentCode, array $metadata = []): self
    {
        return static::updateOrCreate(
            [
                'project_id' => $projectId,
                'name' => $name,
            ],
            [
                'user_id' => $userId,
                'html_content' => $componentCode, // Now stores React component code
                'metadata' => array_merge($metadata, ['type' => 'react_component']),
                'is_active' => true,
                'last_accessed_at' => now(),
            ]
        );
    }

    /**
     * Get the React component code
     */
    public function getComponentCode(): string
    {
        return $this->html_content;
    }

    /**
     * Check if this is a React component view
     */
    public function isReactComponent(): bool
    {
        return $this->metadata['type'] ?? null === 'react_component';
    }
}
