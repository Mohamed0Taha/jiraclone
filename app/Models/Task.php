<?php

namespace App\Models;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

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
        'duplicate_of',
        'parent_id',
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
            Cache::forget('project_snapshot_v1_'.$task->project_id);
        });

        static::updated(function ($task) {
            TaskUpdated::dispatch($task, $task->getChanges());
            Cache::forget('project_snapshot_v1_'.$task->project_id);
        });

        static::deleted(function ($task) {
            Cache::forget('project_snapshot_v1_'.$task->project_id);
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

    /**
     * The task this task is a duplicate of
     */
    public function duplicateOf()
    {
        return $this->belongsTo(Task::class, 'duplicate_of');
    }

    /**
     * Tasks that are duplicates of this task
     */
    public function duplicates()
    {
        return $this->hasMany(Task::class, 'duplicate_of');
    }

    /**
     * Check if this task is a duplicate
     */
    public function isDuplicate()
    {
        return ! is_null($this->duplicate_of);
    }

    /**
     * Check if this task has duplicates
     */
    public function hasDuplicates()
    {
        return $this->duplicates()->exists();
    }

    /**
     * The parent task this task belongs to
     */
    public function parent()
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    /**
     * The child tasks (sub-tasks) of this task
     */
    public function children()
    {
        return $this->hasMany(Task::class, 'parent_id');
    }

    /**
     * Check if this task is a sub-task
     */
    public function isSubTask()
    {
        return ! is_null($this->parent_id);
    }

    /**
     * Check if this task has sub-tasks
     */
    public function hasSubTasks()
    {
        return $this->children()->exists();
    }
}
