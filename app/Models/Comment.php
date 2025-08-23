<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Comment extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'parent_id',
        'content',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function parent()
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    public function replies()
    {
        return $this->hasMany(Comment::class, 'parent_id');
    }

    public function attachments()
    {
        return $this->hasMany(CommentAttachment::class);
    }

    // Check if this is a reply to another comment
    public function isReply()
    {
        return ! is_null($this->parent_id);
    }

    // Get only top-level comments (not replies)
    public function scopeTopLevel($query)
    {
        return $query->whereNull('parent_id');
    }
}
