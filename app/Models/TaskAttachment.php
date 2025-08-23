<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id', 'user_id', 'kind', 'original_name', 'mime_type', 'size', 'imagekit_file_id', 'url', 'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
