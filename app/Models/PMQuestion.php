<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PMQuestion extends Model
{
    protected $table = 'p_m_questions';

    protected $fillable = [
        'question',
        'options',
        'correct_answer',
        'category',
        'difficulty',
        'points',
        'type',
        'explanation',
        'meta',
        'is_active'
    ];

    protected $casts = [
        'options' => 'array',
        'correct_answer' => 'array',
        'meta' => 'array',
        'is_active' => 'boolean'
    ];

    public function certificationAnswers(): HasMany
    {
        return $this->hasMany(CertificationAnswer::class);
    }
}
