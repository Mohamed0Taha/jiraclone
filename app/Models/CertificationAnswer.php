<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CertificationAnswer extends Model
{
    protected $fillable = [
        'certification_attempt_id',
        'pm_question_id',
        'user_answer',
        'is_correct',
        'points_earned',
        'answered_at'
    ];

    protected $casts = [
        'user_answer' => 'array',
        'is_correct' => 'boolean',
        'answered_at' => 'datetime'
    ];

    public function certificationAttempt(): BelongsTo
    {
        return $this->belongsTo(CertificationAttempt::class);
    }

    public function pmQuestion(): BelongsTo
    {
        return $this->belongsTo(PMQuestion::class);
    }
}
