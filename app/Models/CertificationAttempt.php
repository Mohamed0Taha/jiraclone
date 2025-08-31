<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CertificationAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'phase', 'current_step', 'total_score', 'max_possible_score',
        'percentage', 'passed', 'serial', 'completed_at', 'theory_answers',
        'practical_performance', 'meta', 'selected_question_ids', 'exam_started_at',
        'exam_expires_at', 'is_expired', 'next_attempt_allowed_at',
    ];

    protected $casts = [
        'theory_answers' => 'array',
        'practical_performance' => 'array',
        'meta' => 'array',
        'selected_question_ids' => 'array',
        'completed_at' => 'datetime',
        'exam_started_at' => 'datetime',
        'exam_expires_at' => 'datetime',
        'next_attempt_allowed_at' => 'datetime',
        'passed' => 'boolean',
        'percentage' => 'decimal:2',
        'is_expired' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function answers()
    {
        return $this->hasMany(CertificationAnswer::class);
    }

    /**
     * Check if the exam time has expired
     */
    public function isTimeExpired()
    {
        if (! $this->exam_expires_at) {
            return false;
        }

        return now()->isAfter($this->exam_expires_at);
    }

    /**
     * Get remaining time in seconds
     */
    public function getRemainingTimeSeconds()
    {
        if (! $this->exam_expires_at) {
            return null;
        }
        
        // If exam has expired, return 0
        if (now()->isAfter($this->exam_expires_at)) {
            return 0;
        }
        
        // Return seconds remaining until expiration (expires_at - now)
        return now()->diffInSeconds($this->exam_expires_at);
    }

    /**
     * Check if user can start a new attempt
     */
    public function canStartNewAttempt()
    {
        if (! $this->next_attempt_allowed_at) {
            return true;
        }

        return now()->isAfter($this->next_attempt_allowed_at);
    }

    /**
     * Get hours until next attempt is allowed
     */
    public function getHoursUntilNextAttempt()
    {
        if (! $this->next_attempt_allowed_at) {
            return 0;
        }

        return max(0, now()->diffInHours($this->next_attempt_allowed_at));
    }

    /**
     * Mark attempt as expired and set cooldown
     */
    public function markAsExpired()
    {
        $this->update([
            'is_expired' => true,
            'next_attempt_allowed_at' => now()->addHours(24),
        ]);
    }
}
