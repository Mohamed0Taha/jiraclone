<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        // Get visitor statistics
        $stats = [
            'total_visitors' => $this->getTotalVisitors(),
            'unique_visitors' => $this->getUniqueVisitors(),
            'page_views' => $this->getPageViews(),
        ];

        // Get unique visitors with location data
        $visitors = $this->getVisitorsWithLocation();

        return Inertia::render('Admin/Analytics', [
            'stats' => $stats,
            'visitors' => $visitors,
        ]);
    }

    protected function getTotalVisitors()
    {
        // This would typically come from your analytics table
        // For now, return a sample number or implement based on your tracking
        return DB::table('visitor_logs')->count() ?? 1247;
    }

    protected function getUniqueVisitors()
    {
        // Count unique IP addresses
        return DB::table('visitor_logs')->distinct('ip_address')->count('ip_address') ?? 892;
    }

    protected function getPageViews()
    {
        // Total page views
        return DB::table('visitor_logs')->sum('page_views') ?? 3420;
    }

    protected function getVisitorsWithLocation()
    {
        // Get recent unique visitors with their location data
        $visitors = DB::table('visitor_logs')
            ->select('ip_address', 'city', 'region', 'country', 'country_code', 'created_at as last_visit')
            ->distinct('ip_address')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        if ($visitors->isEmpty()) {
            // Return sample data if no visitors exist
            return [
                [
                    'ip' => '192.168.1.1',
                    'city' => 'New York',
                    'region' => 'NY',
                    'country' => 'United States',
                    'country_flag' => '🇺🇸',
                    'last_visit' => now()->subHours(2),
                    'is_unique' => true,
                ],
                [
                    'ip' => '10.0.0.1',
                    'city' => 'London',
                    'region' => 'England',
                    'country' => 'United Kingdom',
                    'country_flag' => '🇬🇧',
                    'last_visit' => now()->subHours(5),
                    'is_unique' => false,
                ],
                [
                    'ip' => '172.16.0.1',
                    'city' => 'Toronto',
                    'region' => 'Ontario',
                    'country' => 'Canada',
                    'country_flag' => '🇨🇦',
                    'last_visit' => now()->subDays(1),
                    'is_unique' => true,
                ],
            ];
        }

        return $visitors->map(function ($visitor) {
            return [
                'ip' => $visitor->ip_address,
                'city' => $visitor->city ?? 'Unknown',
                'region' => $visitor->region ?? 'Unknown',
                'country' => $visitor->country ?? 'Unknown',
                'country_flag' => $this->getCountryFlag($visitor->country_code ?? 'US'),
                'last_visit' => $visitor->last_visit,
                'is_unique' => true, // You can implement logic to determine if visitor is new
            ];
        })->toArray();
    }

    protected function getCountryFlag($countryCode)
    {
        $flags = [
            'US' => '🇺🇸', 'GB' => '🇬🇧', 'CA' => '🇨🇦', 'AU' => '🇦🇺',
            'DE' => '🇩🇪', 'FR' => '🇫🇷', 'IT' => '🇮🇹', 'ES' => '🇪🇸',
            'JP' => '🇯🇵', 'CN' => '🇨🇳', 'IN' => '🇮🇳', 'BR' => '🇧🇷',
            'MX' => '🇲🇽', 'RU' => '🇷🇺', 'KR' => '🇰🇷', 'SG' => '🇸🇬',
        ];
        
        return $flags[$countryCode] ?? '🌍';
    }

    public function trackVisitor(Request $request)
    {
        $ip = $request->ip();
        $userAgent = $request->userAgent();
        
        // Check if visitor already exists today
        $existingVisitor = DB::table('visitor_logs')
            ->where('ip_address', $ip)
            ->whereDate('created_at', today())
            ->first();

        if (!$existingVisitor) {
            // Get location data for new visitor
            $locationData = $this->getLocationData($ip);
            
            DB::table('visitor_logs')->insert([
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'city' => $locationData['city'] ?? null,
                'region' => $locationData['region'] ?? null,
                'country' => $locationData['country'] ?? null,
                'country_code' => $locationData['country_code'] ?? null,
                'page_views' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            // Update page views for existing visitor
            DB::table('visitor_logs')
                ->where('id', $existingVisitor->id)
                ->increment('page_views');
        }
    }

    protected function getLocationData($ip)
    {
        // Skip location lookup for local IPs
        if ($this->isLocalIP($ip)) {
            return [
                'city' => 'Local',
                'region' => 'Development',
                'country' => 'Local Environment',
                'country_code' => 'LOCAL',
            ];
        }

        try {
            // Use a free IP geolocation service (you can replace with your preferred service)
            $response = Http::timeout(5)->get("http://ip-api.com/json/{$ip}");
            
            if ($response->successful()) {
                $data = $response->json();
                return [
                    'city' => $data['city'] ?? null,
                    'region' => $data['regionName'] ?? null,
                    'country' => $data['country'] ?? null,
                    'country_code' => $data['countryCode'] ?? null,
                ];
            }
        } catch (\Exception $e) {
            \Log::warning("Failed to get location data for IP: {$ip}", ['error' => $e->getMessage()]);
        }

        return [];
    }

    protected function isLocalIP($ip)
    {
        return in_array($ip, ['127.0.0.1', '::1', '0.0.0.0']) || 
               preg_match('/^192\.168\./', $ip) ||
               preg_match('/^10\./', $ip) ||
               preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $ip);
    }
}
