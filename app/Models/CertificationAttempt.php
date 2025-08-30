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
        'practical_performance', 'meta', 'selected_question_ids'
    ];

    protected $casts = [
        'theory_answers' => 'array',
        'practical_performance' => 'array',
        'meta' => 'array',
        'selected_question_ids' => 'array',
        'completed_at' => 'datetime',
        'passed' => 'boolean',
        'percentage' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function answers()
    {
        return $this->hasMany(CertificationAnswer::class);
    }
}
