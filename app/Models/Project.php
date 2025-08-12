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

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function automations()
    {
        return $this->hasMany(Automation::class);
    }
}
