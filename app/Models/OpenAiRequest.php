<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpenAiRequest extends Model
{
    use HasFactory;

    protected $table = 'openai_requests';

    protected $fillable = [
        'user_id',
        'request_type',
        'tokens_used',
        'cost',
        'model',
        'prompt',
        'response',
        'successful',
        'error_message',
    ];

    protected $casts = [
        'tokens_used' => 'integer',
        'cost' => 'decimal:6',
        'successful' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function logRequest(
        int $userId,
        string $type,
        int $tokens = 0,
        float $cost = 0,
        string $model = 'gpt-4',
        ?string $prompt = null,
        ?string $response = null,
        bool $successful = true,
        ?string $error = null
    ): self {
        return self::create([
            'user_id' => $userId,
            'request_type' => $type,
            'tokens_used' => $tokens,
            'cost' => $cost,
            'model' => $model,
            'prompt' => $prompt,
            'response' => $response,
            'successful' => $successful,
            'error_message' => $error,
        ]);
    }
}
