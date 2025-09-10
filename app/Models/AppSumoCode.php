<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppSumoCode extends Model
{
    protected $table = 'appsumo_codes';

    protected $fillable = [
        'code',
        'status',
        'redeemed_by_user_id',
        'redeemed_at',
        'redemption_data',
        'campaign',
    ];

    protected $casts = [
        'redeemed_at' => 'datetime',
        'redemption_data' => 'array',
    ];

    public function redeemedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'redeemed_by_user_id');
    }

    public function isRedeemed(): bool
    {
        return $this->status === 'redeemed';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function markAsRedeemed(User $user, array $redemptionData = []): void
    {
        $this->update([
            'status' => 'redeemed',
            'redeemed_by_user_id' => $user->id,
            'redeemed_at' => now(),
            'redemption_data' => $redemptionData,
        ]);
    }

    /**
     * Generate unique alphanumeric codes
     */
    public static function generateUniqueCode(int $length = 12): string
    {
        do {
            $code = strtoupper(bin2hex(random_bytes($length / 2)));
        } while (self::where('code', $code)->exists());

        return $code;
    }

    /**
     * Generate multiple unique codes
     */
    public static function generateCodes(int $count, string $campaign = 'appsumo_2025'): array
    {
        $codes = [];

        for ($i = 0; $i < $count; $i++) {
            $codes[] = self::create([
                'code' => self::generateUniqueCode(),
                'status' => 'active',
                'campaign' => $campaign,
            ]);
        }

        return $codes;
    }

    /**
     * Scope for active codes
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope for redeemed codes
     */
    public function scopeRedeemed($query)
    {
        return $query->where('status', 'redeemed');
    }
}
