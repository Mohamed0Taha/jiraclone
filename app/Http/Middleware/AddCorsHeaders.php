<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AddCorsHeaders
{
    public function handle(Request $request, Closure $next)
    {
        // Handle preflight OPTIONS requests
        if ($request->getMethod() === 'OPTIONS') {
            $allowedOrigins = [
                'https://taskpilot.us',
                'https://laravel-react-automation-app-27e3cf659873.herokuapp.com',
                'http://localhost:3000',
                'http://localhost:8000',
                'http://localhost:5173'
            ];

            $origin = $request->headers->get('Origin');
            $allowOrigin = in_array($origin, $allowedOrigins) ? $origin : 'https://taskpilot.us';

            return response('', 200)
                ->header('Access-Control-Allow-Origin', $allowOrigin)
                ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
                ->header('Access-Control-Allow-Credentials', 'true')
                ->header('Access-Control-Max-Age', '86400');
        }

        $response = $next($request);

        // Add CORS headers for all requests when cross-origin
        $allowedOrigins = [
            'https://taskpilot.us',
            'https://laravel-react-automation-app-27e3cf659873.herokuapp.com',
            'http://localhost:3000',
            'http://localhost:8000',
            'http://localhost:5173'
        ];

        $origin = $request->headers->get('Origin');
        
        // Only add CORS headers if there's an Origin header (cross-origin request)
        if ($origin) {
            if (in_array($origin, $allowedOrigins)) {
                $response->headers->set('Access-Control-Allow-Origin', $origin);
            } else {
                $response->headers->set('Access-Control-Allow-Origin', 'https://taskpilot.us');
            }
            
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }

        return $response;
    }
}
