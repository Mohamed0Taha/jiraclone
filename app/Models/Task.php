<?php

namespace App\Models;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    public const STATUSES = ['todo', 'inprogress', 'review', 'done'];

    public const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    protected $fillable = [
        'project_id',
        'title',
        'description',
        'start_date',
        'end_date',
        'creator_id',
        'assignee_id',
        'status',
        'milestone',
        'priority',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'milestone' => 'boolean',
    ];

    protected static function booted()
    {
        static::created(function ($task) {
            TaskCreated::dispatch($task);
        });

        static::updated(function ($task) {
            TaskUpdated::dispatch($task, $task->getChanges());
        });
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function attachments()
    {
        return $this->hasMany(TaskAttachment::class);
    }
}
