<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CommentAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'comment_id', 'user_id', 'kind', 'original_name', 'mime_type', 'size', 'imagekit_file_id', 'url', 'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function comment()
    {
        return $this->belongsTo(Comment::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
