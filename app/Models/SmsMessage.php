<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'automation_id',
        'twilio_sid',
        'from_number',
        'to_number',
        'body',
        'status',
        'price',
        'price_unit',
        'direction',
        'error_message',
        'error_code',
        'webhook_data',
    ];

    protected $casts = [
        'webhook_data' => 'array',
        'price' => 'decimal:4',
    ];

    /**
     * User who sent the SMS (if applicable)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Automation that triggered the SMS
     */
    public function automation(): BelongsTo
    {
        return $this->belongsTo(Automation::class);
    }

    /**
     * Get status badge color for display
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'delivered' => 'success',
            'sent', 'queued' => 'primary',
            'failed', 'undelivered' => 'danger',
            'unknown' => 'warning',
            default => 'secondary',
        };
    }

    /**
     * Get cost formatted for display
     */
    public function getCostFormattedAttribute(): string
    {
        if ($this->cost === null) {
            return 'N/A';
        }

        return '$'.number_format($this->cost, 4);
    }

    /**
     * Scope for recent messages
     */
    public function scopeRecent($query, $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope for successful messages
     */
    public function scopeDelivered($query)
    {
        return $query->where('status', 'delivered');
    }

    /**
     * Scope for failed messages
     */
    public function scopeFailed($query)
    {
        return $query->whereIn('status', ['failed', 'undelivered']);
    }

    /**
     * Get total cost for a collection
     */
    public static function getTotalCost($messages)
    {
        return $messages->sum('cost') ?? 0;
    }
}
