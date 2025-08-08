<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

   // app/Models/Task.php
    protected $fillable = [
        'title',
        'description',
        'execution_date',
        'status',
        'assignee_id',
        'creator_id',   // ← ADD THIS
    ];


    /* Relationships */
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
    public function createdTasks()
{
    return $this->hasMany(Task::class, 'creator_id');
}

public function assignedTasks()
{
    return $this->hasMany(Task::class, 'assignee_id');
}

}
