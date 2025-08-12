<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Automation extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'description',
        'trigger',
        'trigger_config',
        'actions',
        'is_active',
        'runs_count',
        'success_rate',
        'last_run_at',
    ];

    protected $casts = [
        'trigger_config' => 'array',
        'actions' => 'array',
        'is_active' => 'boolean',
        'success_rate' => 'decimal:2',
        'last_run_at' => 'datetime',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
