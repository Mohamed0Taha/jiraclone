<?php

namespace App\Http\Controllers;

use App\Models\PageAnalytic;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    /**
     * Track page visit
     */
    public function trackVisit(Request $request)
    {
        try {
            $ip = $this->getClientIp($request);
            
            // Get geographic data
            $geoData = $this->getGeographicData($ip);
            
            // Generate or get visitor ID
            $visitorId = $request->cookie('visitor_id') ?? Str::uuid()->toString();
            
            // Parse URL parameters
            $urlParams = parse_url($request->input('url', '/'), PHP_URL_QUERY);
            parse_str($urlParams ?: '', $params);
            
            // Detect device type and browser from user agent
            $userAgent = $request->userAgent();
            $isMobile = $this->isMobileDevice($userAgent);
            $browser = $this->getBrowser($userAgent);
            $os = $this->getOperatingSystem($userAgent);
            $deviceType = $this->getDeviceType($userAgent);
            
            // Detect if it's a bot
            $isBot = $this->isBot($userAgent);
            
            $analytics = PageAnalytic::create([
                'page_url' => $request->input('url', '/'),
                'page_title' => $request->input('title'),
                'referrer_url' => $request->input('referrer'),
                'utm_source' => $params['utm_source'] ?? null,
                'utm_medium' => $params['utm_medium'] ?? null,
                'utm_campaign' => $params['utm_campaign'] ?? null,
                'utm_content' => $params['utm_content'] ?? null,
                'utm_term' => $params['utm_term'] ?? null,
                
                // Visitor Information
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'browser' => $browser,
                'browser_version' => $this->getBrowserVersion($userAgent),
                'operating_system' => $os,
                'device_type' => $deviceType,
                
                // Geographic Information
                'country' => $geoData['country'] ?? null,
                'country_code' => $geoData['country_code'] ?? null,
                'region' => $geoData['region'] ?? null,
                'city' => $geoData['city'] ?? null,
                'postal_code' => $geoData['postal_code'] ?? null,
                'latitude' => $geoData['latitude'] ?? null,
                'longitude' => $geoData['longitude'] ?? null,
                'timezone' => $geoData['timezone'] ?? null,
                
                // Session Information
                'session_id' => session()->getId(),
                'visitor_id' => $visitorId,
                'is_returning_visitor' => $this->isReturningVisitor($visitorId),
                'page_load_time' => $request->input('load_time'),
                'time_on_page' => $request->input('time_on_page'),
                
                // Additional Information
                'screen_resolution' => [
                    'width' => $request->input('screen_width'),
                    'height' => $request->input('screen_height')
                ],
                'language' => $request->input('language') ?? $request->getPreferredLanguage(),
                'is_mobile' => $isMobile,
                'is_bot' => $isBot,
                'custom_data' => $request->input('custom_data', []),
            ]);

            // Set visitor cookie if new
            if (!$request->cookie('visitor_id')) {
                cookie()->queue('visitor_id', $visitorId, 60 * 24 * 365); // 1 year
            }

            return response()->json([
                'success' => true,
                'visitor_id' => $visitorId
            ]);
            
        } catch (\Exception $e) {
            // Log error but don't fail the request
            Log::error('Analytics tracking error: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'error' => 'Tracking failed'
            ], 500);
        }
    }

    /**
     * Get admin analytics dashboard
     */
    public function dashboard(Request $request)
    {
        $timeframe = $request->get('timeframe', 'week'); // day, week, month, year
        
        $query = PageAnalytic::query();
        
        // Apply timeframe filter
        switch ($timeframe) {
            case 'day':
                $query->today();
                break;
            case 'week':
                $query->thisWeek();
                break;
            case 'month':
                $query->thisMonth();
                break;
            case 'year':
                $query->whereYear('created_at', now()->year);
                break;
        }

        // Get overview stats
        $stats = [
            'total_visits' => $query->count(),
            'unique_visitors' => $query->distinct('visitor_id')->count('visitor_id'),
            'page_views' => $query->landingPage()->count(),
            'bounce_rate' => $this->calculateBounceRate($query),
            'avg_time_on_page' => $query->whereNotNull('time_on_page')->avg('time_on_page'),
            'mobile_percentage' => $query->where('is_mobile', true)->count() / max($query->count(), 1) * 100,
        ];

        // Get geographic data
        $countries = $query->select('country', 'country_code')
            ->selectRaw('COUNT(*) as visits')
            ->whereNotNull('country')
            ->groupBy('country', 'country_code')
            ->orderByDesc('visits')
            ->take(10)
            ->get();

        $cities = $query->select('city', 'region', 'country_code')
            ->selectRaw('COUNT(*) as visits')
            ->whereNotNull('city')
            ->groupBy('city', 'region', 'country_code')
            ->orderByDesc('visits')
            ->take(10)
            ->get();

        // Get traffic sources
        $trafficSources = $query->select('utm_source')
            ->selectRaw('COUNT(*) as visits')
            ->whereNotNull('utm_source')
            ->groupBy('utm_source')
            ->orderByDesc('visits')
            ->take(10)
            ->get();

        $referrers = $query->select('referrer_url')
            ->selectRaw('COUNT(*) as visits')
            ->whereNotNull('referrer_url')
            ->where('referrer_url', '!=', '')
            ->groupBy('referrer_url')
            ->orderByDesc('visits')
            ->take(10)
            ->get();

        // Get device and browser data
        $devices = $query->select('device_type')
            ->selectRaw('COUNT(*) as visits')
            ->whereNotNull('device_type')
            ->groupBy('device_type')
            ->orderByDesc('visits')
            ->get();

        $browsers = $query->select('browser')
            ->selectRaw('COUNT(*) as visits')
            ->whereNotNull('browser')
            ->groupBy('browser')
            ->orderByDesc('visits')
            ->take(10)
            ->get();

        // Get hourly data for charts
        $hourlyData = $query->selectRaw('HOUR(created_at) as hour, COUNT(*) as visits')
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        return Inertia::render('Admin/Analytics', [
            'timeframe' => $timeframe,
            'stats' => $stats,
            'countries' => $countries,
            'cities' => $cities,
            'trafficSources' => $trafficSources,
            'referrers' => $referrers,
            'devices' => $devices,
            'browsers' => $browsers,
            'hourlyData' => $hourlyData,
        ]);
    }

    /**
     * Get client IP address
     */
    private function getClientIp(Request $request)
    {
        $ipKeys = ['HTTP_CF_CONNECTING_IP', 'HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = $_SERVER[$key];
                if (strpos($ip, ',') !== false) {
                    $ip = explode(',', $ip)[0];
                }
                return trim($ip);
            }
        }
        
        return $request->ip();
    }

    /**
     * Get geographic data from IP
     */
    private function getGeographicData($ip)
    {
        try {
            // Using a free IP geolocation API (you can replace with paid service for better accuracy)
            $response = Http::timeout(5)->get("http://ip-api.com/json/{$ip}");
            
            if ($response->successful()) {
                $data = $response->json();
                
                if ($data['status'] === 'success') {
                    return [
                        'country' => $data['country'] ?? null,
                        'country_code' => $data['countryCode'] ?? null,
                        'region' => $data['regionName'] ?? null,
                        'city' => $data['city'] ?? null,
                        'postal_code' => $data['zip'] ?? null,
                        'latitude' => $data['lat'] ?? null,
                        'longitude' => $data['lon'] ?? null,
                        'timezone' => $data['timezone'] ?? null,
                    ];
                }
            }
        } catch (\Exception $e) {
            Log::error('Geolocation API error: ' . $e->getMessage());
        }
        
        return [];
    }

    /**
     * Check if visitor is returning
     */
    private function isReturningVisitor($visitorId)
    {
        return PageAnalytic::where('visitor_id', $visitorId)
            ->where('created_at', '<', now()->subHour())
            ->exists();
    }

    /**
     * Calculate bounce rate
     */
    private function calculateBounceRate($query)
    {
        $totalSessions = $query->distinct('session_id')->count('session_id');
        
        if ($totalSessions === 0) {
            return 0;
        }
        
        // Sessions with only one page view are considered bounces
        $bounces = $query->select('session_id')
            ->groupBy('session_id')
            ->havingRaw('COUNT(*) = 1')
            ->get()
            ->count();
            
        return round(($bounces / $totalSessions) * 100, 2);
    }

    /**
     * Check if user agent is mobile device
     */
    private function isMobileDevice($userAgent)
    {
        $mobileKeywords = [
            'Mobile', 'Android', 'iPhone', 'iPad', 'iPod', 'BlackBerry', 
            'Windows Phone', 'Opera Mini', 'IEMobile', 'Mobile Safari'
        ];
        
        foreach ($mobileKeywords as $keyword) {
            if (stripos($userAgent, $keyword) !== false) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Extract browser from user agent
     */
    private function getBrowser($userAgent)
    {
        $browsers = [
            'Chrome' => 'Chrome',
            'Firefox' => 'Firefox',
            'Safari' => 'Safari',
            'Edge' => 'Edge',
            'Opera' => 'Opera',
            'Internet Explorer' => 'MSIE',
        ];

        foreach ($browsers as $browser => $pattern) {
            if (stripos($userAgent, $pattern) !== false) {
                return $browser;
            }
        }

        return 'Unknown';
    }

    /**
     * Extract browser version
     */
    private function getBrowserVersion($userAgent)
    {
        if (preg_match('/Chrome\/([0-9\.]+)/', $userAgent, $matches)) {
            return $matches[1];
        }
        if (preg_match('/Firefox\/([0-9\.]+)/', $userAgent, $matches)) {
            return $matches[1];
        }
        if (preg_match('/Safari\/([0-9\.]+)/', $userAgent, $matches)) {
            return $matches[1];
        }
        if (preg_match('/Edge\/([0-9\.]+)/', $userAgent, $matches)) {
            return $matches[1];
        }

        return 'Unknown';
    }

    /**
     * Extract operating system
     */
    private function getOperatingSystem($userAgent)
    {
        $systems = [
            'Windows 11' => 'Windows NT 10.0',
            'Windows 10' => 'Windows NT 10.0',
            'Windows 8.1' => 'Windows NT 6.3',
            'Windows 8' => 'Windows NT 6.2',
            'Windows 7' => 'Windows NT 6.1',
            'Mac OS X' => 'Mac OS X',
            'macOS' => 'Mac OS X',
            'Linux' => 'Linux',
            'Ubuntu' => 'Ubuntu',
            'Android' => 'Android',
            'iOS' => 'iPhone OS',
        ];

        foreach ($systems as $system => $pattern) {
            if (stripos($userAgent, $pattern) !== false) {
                return $system;
            }
        }

        return 'Unknown';
    }

    /**
     * Get device type
     */
    private function getDeviceType($userAgent)
    {
        if (stripos($userAgent, 'tablet') !== false || stripos($userAgent, 'iPad') !== false) {
            return 'tablet';
        }
        
        if ($this->isMobileDevice($userAgent)) {
            return 'mobile';
        }
        
        return 'desktop';
    }

    /**
     * Check if user agent is a bot
     */
    private function isBot($userAgent)
    {
        $bots = [
            'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 
            'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
            'whatsapp', 'telegrambot', 'applebot', 'petalbot'
        ];

        foreach ($bots as $bot) {
            if (stripos($userAgent, $bot) !== false) {
                return true;
            }
        }

        return false;
    }
}
