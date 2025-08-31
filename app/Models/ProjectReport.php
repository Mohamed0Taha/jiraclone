<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id', 'user_id', 'plan', 'storage_path', 'public_url', 'meta', 'size_bytes', 'generated_at',
    ];

    protected $casts = [
        'meta' => 'array',
        'generated_at' => 'datetime',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
