<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'to_email',
        'to_name',
        'subject',
        'type',
        'content',
        'user_id',
        'sent_successfully',
        'error_message',
    ];

    protected $casts = [
        'sent_successfully' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function logEmail(
        string $toEmail,
        string $subject,
        string $type,
        ?string $toName = null,
        ?string $content = null,
        ?int $userId = null,
        bool $success = true,
        ?string $error = null
    ): self {
        return self::create([
            'to_email' => $toEmail,
            'to_name' => $toName,
            'subject' => $subject,
            'type' => $type,
            'content' => $content,
            'user_id' => $userId,
            'sent_successfully' => $success,
            'error_message' => $error,
        ]);
    }
}
