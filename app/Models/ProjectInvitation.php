<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ProjectInvitation extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'invited_by',
        'email',
        'token',
        'status',
        'expires_at',
        'accepted_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function inviter()
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function isExpired()
    {
        return $this->expires_at < now();
    }

    public function isPending()
    {
        return $this->status === 'pending' && ! $this->isExpired();
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($invitation) {
            if (empty($invitation->token)) {
                $invitation->token = Str::random(64);
            }
            if (empty($invitation->status)) {
                $invitation->status = 'pending';
            }
            if (empty($invitation->expires_at)) {
                $invitation->expires_at = now()->addDays(7);
            }
        });
    }
}
