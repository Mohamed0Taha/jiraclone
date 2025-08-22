<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefundLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'subscription_id',
        'amount',
        'reason',
        'type',
        'status',
        'processed_by',
        'processed_at',
        'notes',
        'stripe_refund_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'processed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public static function createRefund(
        User $user,
        $subscription,
        float $amount,
        string $reason,
        string $type,
        ?string $notes = null
    ): self {
        return self::create([
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'amount' => $amount,
            'reason' => $reason,
            'type' => $type,
            'status' => 'completed',
            'processed_by' => \Illuminate\Support\Facades\Auth::id(),
            'processed_at' => now(),
            'notes' => $notes,
        ]);
    }
}
