<?php
// app/Models/Project.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'key',
        'description',
        'meta',
        'start_date',
        'end_date',
    ];

    protected $casts = [
        'meta'       => 'array',
        'start_date' => 'date:Y-m-d',
        'end_date'   => 'date:Y-m-d',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'project_members')
                    ->withPivot('role', 'joined_at')
                    ->withTimestamps();
    }

    public function invitations()
    {
        return $this->hasMany(ProjectInvitation::class);
    }

    public function pendingInvitations()
    {
        return $this->hasMany(ProjectInvitation::class)->where('status', 'pending');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function automations()
    {
        return $this->hasMany(Automation::class);
    }
}
