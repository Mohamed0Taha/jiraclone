<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        // Get date filters from request
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $searchIp = $request->input('search_ip');
        $showAll = $request->input('show_all', false);
        $perPage = $request->input('per_page', 25);

        // Get visitor statistics
        $stats = [
            'total_visitors' => $this->getTotalVisitors($startDate, $endDate),
            'unique_visitors' => $this->getUniqueVisitors($startDate, $endDate),
            'page_views' => $this->getPageViews($startDate, $endDate),
        ];

        // Get top insights
        $insights = $this->getInsights($startDate, $endDate);

        // Get latest visitors (limited to 15 by default, or paginated if show_all)
        if ($showAll || $searchIp) {
            $visitors = $this->getVisitorsWithLocation($startDate, $endDate, $searchIp, $perPage);
        } else {
            $visitors = $this->getLatestVisitors($startDate, $endDate, 15);
        }

        // Get chart data for different periods
        $chartData = $this->getChartData();

        return view('admin.analytics', [
            'stats' => $stats,
            'insights' => $insights,
            'visitors' => $visitors,
            'chartData' => $chartData,
            'showAll' => $showAll,
            'getSourceColor' => [$this, 'getSourceColor'],
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'search_ip' => $searchIp,
                'per_page' => $perPage,
            ],
        ]);
    }

    protected function getTotalVisitors($startDate = null, $endDate = null)
    {
        $query = DB::table('visitor_logs');
        
        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }
        
        return $query->count() ?? 1247;
    }

    protected function getUniqueVisitors($startDate = null, $endDate = null)
    {
        $query = DB::table('visitor_logs');
        
        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }
        
        return $query->distinct('ip_address')->count('ip_address') ?? 892;
    }

    protected function getPageViews($startDate = null, $endDate = null)
    {
        $query = DB::table('visitor_logs');
        
        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }
        
        return $query->sum('page_views') ?? 3420;
    }

    protected function getVisitorsWithLocation($startDate = null, $endDate = null, $searchIp = null, $perPage = 25)
    {
        // Build query for unique visitors with their location data
        $query = DB::table('visitor_logs')
            ->select(
                'ip_address',
                'city',
                'region',
                'country',
                'country_code',
                DB::raw('MAX(created_at) as last_visit'),
                DB::raw('SUM(page_views) as page_views'),
                DB::raw('MAX(NULLIF(utm_source, "")) as utm_source')
            )
            ->groupBy('ip_address', 'city', 'region', 'country', 'country_code');

        // Apply date filters
        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        // Apply IP search filter
        if ($searchIp) {
            $query->where('ip_address', 'like', '%' . $searchIp . '%');
        }

        $query->orderBy('last_visit', 'desc');

        // Paginate results
        $visitors = $query->paginate($perPage);

        // If no real data, return sample data
        if ($visitors->isEmpty() && !$startDate && !$endDate && !$searchIp) {
            $sampleData = collect([
                [
                    'ip' => '192.168.1.1',
                    'city' => 'New York',
                    'region' => 'NY',
                    'country' => 'United States',
                    'country_flag' => '🇺🇸',
                    'last_visit' => now()->subHours(2),
                    'page_views' => 5,
                    'is_unique' => true,
                ],
                [
                    'ip' => '10.0.0.1',
                    'city' => 'London',
                    'region' => 'England',
                    'country' => 'United Kingdom',
                    'country_flag' => '🇬🇧',
                    'last_visit' => now()->subHours(5),
                    'page_views' => 3,
                    'is_unique' => false,
                ],
                [
                    'ip' => '172.16.0.1',
                    'city' => 'Toronto',
                    'region' => 'Ontario',
                    'country' => 'Canada',
                    'country_flag' => '🇨🇦',
                    'last_visit' => now()->subDays(1),
                    'page_views' => 8,
                    'is_unique' => true,
                ],
            ]);
            
            // Create a manual paginator for sample data
            $visitors = new \Illuminate\Pagination\LengthAwarePaginator(
                $sampleData,
                $sampleData->count(),
                $perPage,
                1,
                ['path' => request()->url()]
            );
        }

        // Transform the paginated data
        $visitors->getCollection()->transform(function ($visitor) {
            // Handle both stdClass objects (from DB) and arrays (sample data)
            if (is_object($visitor)) {
                return [
                    'ip' => $visitor->ip_address ?? 'Unknown',
                    'city' => $visitor->city ?? 'Unknown',
                    'region' => $visitor->region ?? 'Unknown',
                    'country' => $visitor->country ?? 'Unknown',
                    'country_flag' => $this->getCountryFlag($visitor->country_code ?? 'US'),
                    'last_visit' => $visitor->last_visit,
                    'page_views' => $visitor->page_views ?? 1,
                    'is_unique' => true,
                    'source' => $visitor->utm_source ?: 'direct',
                ];
            } else {
                // Handle array (sample data)
                return [
                    'ip' => $visitor['ip'] ?? 'Unknown',
                    'city' => $visitor['city'] ?? 'Unknown',
                    'region' => $visitor['region'] ?? 'Unknown',
                    'country' => $visitor['country'] ?? 'Unknown',
                    'country_flag' => $visitor['country_flag'] ?? $this->getCountryFlag('US'),
                    'last_visit' => $visitor['last_visit'],
                    'page_views' => $visitor['page_views'] ?? 1,
                    'is_unique' => $visitor['is_unique'] ?? true,
                    'source' => $visitor['source'] ?? 'direct',
                ];
            }
        });

        return $visitors;
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

    protected function getSourceColor($source)
    {
        $colors = [
            'direct' => ['bg' => 'bg-gray-100', 'text' => 'text-gray-800'],
            'reddit' => ['bg' => 'bg-orange-100', 'text' => 'text-orange-800'],
            'twitter' => ['bg' => 'bg-blue-100', 'text' => 'text-blue-800'],
            'facebook' => ['bg' => 'bg-indigo-100', 'text' => 'text-indigo-800'],
            'google' => ['bg' => 'bg-green-100', 'text' => 'text-green-800'],
            'linkedin' => ['bg' => 'bg-cyan-100', 'text' => 'text-cyan-800'],
            'youtube' => ['bg' => 'bg-red-100', 'text' => 'text-red-800'],
            'instagram' => ['bg' => 'bg-pink-100', 'text' => 'text-pink-800'],
            'tiktok' => ['bg' => 'bg-slate-100', 'text' => 'text-slate-800'],
            'newsource' => ['bg' => 'bg-emerald-100', 'text' => 'text-emerald-800'],
        ];

        // Default color for unknown sources
        return $colors[$source] ?? ['bg' => 'bg-purple-100', 'text' => 'text-purple-800'];
    }

    public function trackVisitor(Request $request)
    {
        $ip = $request->ip();
        $userAgent = $request->userAgent();
        $utmSource = $request->query('utm_source');
        if ($utmSource) {
            $request->session()->put('utm_source', $utmSource);
        } else {
            $utmSource = $request->session()->get('utm_source');
        }

        // Check if visitor already exists today
        $existingVisitor = DB::table('visitor_logs')
            ->where('ip_address', $ip)
            ->whereDate('created_at', today())
            ->first();

        if (! $existingVisitor) {
            // Get location data for new visitor
            $locationData = $this->getLocationData($ip);

            DB::table('visitor_logs')->insert([
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'utm_source' => $utmSource,
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
            $query = DB::table('visitor_logs')
                ->where('id', $existingVisitor->id);

            if ($utmSource && empty($existingVisitor->utm_source)) {
                $query->update([
                    'utm_source' => $utmSource,
                    'page_views' => DB::raw('page_views + 1'),
                    'updated_at' => now(),
                ]);
            } else {
                $query->increment('page_views');
            }
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
            Log::warning("Failed to get location data for IP: {$ip}", ['error' => $e->getMessage()]);
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

    protected function getChartData()
    {
        // Generate chart data for different time periods
        return [
            '7d' => $this->getVisitorChartData(7),
            '30d' => $this->getVisitorChartData(30),
            '90d' => $this->getVisitorChartData(90),
        ];
    }

    protected function getVisitorChartData($days)
    {
        $labels = [];
        $data = [];

        // Get visitor data for the specified number of days
        $visitors = DB::table('visitor_logs')
            ->selectRaw('DATE(created_at) as date, COUNT(DISTINCT ip_address) as unique_visitors')
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        // If no real data, generate sample data for demonstration
        if ($visitors->isEmpty()) {
            for ($i = $days - 1; $i >= 0; $i--) {
                $date = now()->subDays($i);
                $labels[] = $date->format($days <= 7 ? 'M j' : 'M j');

                // Generate realistic sample data with growth trend
                $baseVisitors = 10;
                $growthFactor = 1 + (($days - $i) / $days * 0.5); // 50% growth over period
                $randomVariation = rand(80, 120) / 100; // ±20% random variation
                $data[] = round($baseVisitors * $growthFactor * $randomVariation);
            }
        } else {
            // Use real data
            for ($i = $days - 1; $i >= 0; $i--) {
                $date = now()->subDays($i)->format('Y-m-d');
                $labels[] = now()->subDays($i)->format($days <= 7 ? 'M j' : 'M j');
                $data[] = $visitors->get($date)->unique_visitors ?? 0;
            }
        }

        return [
            'labels' => $labels,
            'data' => $data,
        ];
    }

    protected function getLatestVisitors($startDate = null, $endDate = null, $limit = 15)
    {
        // Get latest unique visitors without pagination
        $query = DB::table('visitor_logs')
            ->select(
                'ip_address',
                'city',
                'region',
                'country',
                'country_code',
                DB::raw('MAX(created_at) as last_visit'),
                DB::raw('SUM(page_views) as page_views'),
                DB::raw('MAX(NULLIF(utm_source, "")) as utm_source')
            )
            ->groupBy('ip_address', 'city', 'region', 'country', 'country_code');

        // Apply date filters
        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        $query->orderBy('last_visit', 'desc')
              ->limit($limit);

        $visitors = $query->get();

        // If no real data, return sample data
        if ($visitors->isEmpty() && !$startDate && !$endDate) {
            $visitors = collect([
                [
                    'ip_address' => '192.168.1.1',
                    'city' => 'New York',
                    'region' => 'NY',
                    'country' => 'United States',
                    'country_code' => 'US',
                    'last_visit' => now()->subHours(2),
                    'page_views' => 5,
                ],
                [
                    'ip_address' => '10.0.0.1',
                    'city' => 'London',
                    'region' => 'England',
                    'country' => 'United Kingdom',
                    'country_code' => 'GB',
                    'last_visit' => now()->subHours(5),
                    'page_views' => 3,
                ],
                [
                    'ip_address' => '172.16.0.1',
                    'city' => 'Toronto',
                    'region' => 'Ontario',
                    'country' => 'Canada',
                    'country_code' => 'CA',
                    'last_visit' => now()->subDays(1),
                    'page_views' => 8,
                ],
            ]);
        }

        // Transform the data
        return $visitors->map(function ($visitor) {
            // Handle both stdClass objects (from DB) and arrays (sample data)
            if (is_object($visitor)) {
                return [
                    'ip' => $visitor->ip_address ?? 'Unknown',
                    'city' => $visitor->city ?? 'Unknown',
                    'region' => $visitor->region ?? 'Unknown',
                    'country' => $visitor->country ?? 'Unknown',
                    'country_flag' => $this->getCountryFlag($visitor->country_code ?? 'US'),
                    'last_visit' => $visitor->last_visit,
                    'page_views' => $visitor->page_views ?? 1,
                    'is_unique' => true,
                    'source' => $visitor->utm_source ?? 'direct',
                ];
            } else {
                // Handle array (sample data) - already in correct format
                return [
                    'ip' => $visitor['ip_address'] ?? 'Unknown',
                    'city' => $visitor['city'] ?? 'Unknown',
                    'region' => $visitor['region'] ?? 'Unknown',
                    'country' => $visitor['country'] ?? 'Unknown',
                    'country_flag' => $this->getCountryFlag($visitor['country_code'] ?? 'US'),
                    'last_visit' => $visitor['last_visit'],
                    'page_views' => $visitor['page_views'] ?? 1,
                    'is_unique' => true,
                    'source' => $visitor['source'] ?? 'direct',
                ];
            }
        });
    }

    protected function getInsights($startDate = null, $endDate = null)
    {
        $query = DB::table('visitor_logs');

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        // Top countries
        $topCountries = (clone $query)
            ->select('country', 'country_code', DB::raw('COUNT(DISTINCT ip_address) as visitor_count'))
            ->whereNotNull('country')
            ->groupBy('country', 'country_code')
            ->orderByDesc('visitor_count')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                return [
                    'country' => $item->country,
                    'flag' => $this->getCountryFlag($item->country_code),
                    'count' => $item->visitor_count,
                ];
            });

        // Top cities
        $topCities = (clone $query)
            ->select('city', 'country_code', DB::raw('COUNT(DISTINCT ip_address) as visitor_count'))
            ->whereNotNull('city')
            ->groupBy('city', 'country_code')
            ->orderByDesc('visitor_count')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                return [
                    'city' => $item->city,
                    'flag' => $this->getCountryFlag($item->country_code),
                    'count' => $item->visitor_count,
                ];
            });

        // If no data, provide sample insights
        if ($topCountries->isEmpty()) {
            $topCountries = collect([
                ['country' => 'United States', 'flag' => '🇺🇸', 'count' => 245],
                ['country' => 'United Kingdom', 'flag' => '🇬🇧', 'count' => 189],
                ['country' => 'Canada', 'flag' => '🇨🇦', 'count' => 156],
                ['country' => 'Germany', 'flag' => '🇩🇪', 'count' => 134],
                ['country' => 'France', 'flag' => '🇫🇷', 'count' => 98],
            ]);
        }

        if ($topCities->isEmpty()) {
            $topCities = collect([
                ['city' => 'New York', 'flag' => '🇺🇸', 'count' => 89],
                ['city' => 'London', 'flag' => '🇬🇧', 'count' => 76],
                ['city' => 'Toronto', 'flag' => '🇨🇦', 'count' => 65],
                ['city' => 'Berlin', 'flag' => '🇩🇪', 'count' => 54],
                ['city' => 'Paris', 'flag' => '🇫🇷', 'count' => 43],
            ]);
        }

        $topSources = (clone $query)
            ->selectRaw('COALESCE(NULLIF(utm_source, ""), "direct") as source, COUNT(DISTINCT ip_address) as visitor_count')
            ->groupBy('source')
            ->orderByDesc('visitor_count')
            ->get()
            ->map(function ($item) {
                return [
                    'source' => $item->source,
                    'count' => $item->visitor_count,
                ];
            });

        if ($topSources->isEmpty()) {
            $topSources = collect([
                ['source' => 'direct', 'count' => 120],
                ['source' => 'reddit', 'count' => 45],
                ['source' => 'newsource', 'count' => 18],
            ]);
        }

        return [
            'top_countries' => $topCountries,
            'top_cities' => $topCities,
            'top_sources' => $topSources,
        ];
    }
}
