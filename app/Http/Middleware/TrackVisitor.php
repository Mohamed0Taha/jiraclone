<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\Response;

class TrackVisitor
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Track visitor after processing the request
        $response = $next($request);

        // Only track successful page loads (not API calls, assets, etc.)
        if ($response->getStatusCode() === 200 && $request->isMethod('GET')) {
            $this->trackVisitor($request);
        }

        return $response;
    }

    protected function trackVisitor(Request $request)
    {
        try {
            $ip = $request->ip();
            $userAgent = $request->userAgent();
            $utmSource = $request->query('utm_source');
            if ($utmSource) {
                // Persist campaign source for the session
                $request->session()->put('utm_source', $utmSource);
            } else {
                $utmSource = $request->session()->get('utm_source');
            }

            // Skip if this is a bot or internal request
            if ($this->isBot($userAgent) || $this->isLocalIP($ip)) {
                return;
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

                // If we have a utm_source now and it's not set yet for today, set it
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
        } catch (\Exception $e) {
            // Silently fail to not break the user experience
            \Log::warning('Visitor tracking failed: '.$e->getMessage());
        }
    }

    protected function getLocationData($ip)
    {
        try {
            // Use a free IP geolocation service
            $response = Http::timeout(3)->get("http://ip-api.com/json/{$ip}");

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
            // Silently fail
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

    protected function isBot($userAgent)
    {
        $bots = ['bot', 'crawler', 'spider', 'scraper', 'facebook', 'twitter'];

        foreach ($bots as $bot) {
            if (stripos($userAgent, $bot) !== false) {
                return true;
            }
        }

        return false;
    }
}
