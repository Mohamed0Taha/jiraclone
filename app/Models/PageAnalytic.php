<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PageAnalytic extends Model
{
    use HasFactory;

    protected $fillable = [
        'page_url',
        'page_title',
        'referrer_url',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'ip_address',
        'user_agent',
        'browser',
        'browser_version',
        'operating_system',
        'device_type',
        'country',
        'country_code',
        'region',
        'city',
        'postal_code',
        'latitude',
        'longitude',
        'timezone',
        'session_id',
        'visitor_id',
        'is_returning_visitor',
        'page_load_time',
        'time_on_page',
        'screen_resolution',
        'language',
        'is_mobile',
        'is_bot',
        'custom_data',
    ];

    protected $casts = [
        'screen_resolution' => 'array',
        'custom_data' => 'array',
        'is_returning_visitor' => 'boolean',
        'is_mobile' => 'boolean',
        'is_bot' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    // Scopes for common queries
    public function scopeToday($query)
    {
        return $query->whereDate('created_at', today());
    }

    public function scopeThisWeek($query)
    {
        return $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
    }

    public function scopeThisMonth($query)
    {
        return $query->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year);
    }

    public function scopeLandingPage($query)
    {
        return $query->where('page_url', '/');
    }

    public function scopeByCountry($query, $countryCode)
    {
        return $query->where('country_code', $countryCode);
    }
}
