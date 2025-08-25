<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RestrictCookieHeader
{
    /**
     * Handle an incoming request to restrict cookie header size BEFORE it reaches any other middleware.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check raw cookie header immediately
        $rawCookies = $_SERVER['HTTP_COOKIE'] ?? '';
        $headerSize = strlen($rawCookies);
        
        // If dangerous size, immediately clear and return reset page
        if ($headerSize > 3072) { // 3KB - very strict
            return $this->emergencyClearResponse($request, $headerSize);
        }
        
        $response = $next($request);
        
        // Also check outgoing response cookies
        if (method_exists($response, 'headers') && $response->headers) {
            $setCookieHeaders = $response->headers->get('Set-Cookie', null, false);
            if (is_array($setCookieHeaders)) {
                $totalSetCookieSize = array_sum(array_map('strlen', $setCookieHeaders));
                
                // If we're setting too many large cookies, clear them
                if ($totalSetCookieSize > 2048) {
                    // Clear all Set-Cookie headers and just keep essentials
                    $response->headers->remove('Set-Cookie');
                    
                    // Only set a minimal session cookie
                    $response->headers->setCookie(new \Symfony\Component\HttpFoundation\Cookie(
                        'tp_s',
                        bin2hex(random_bytes(16)), // Simple 32-char session ID
                        time() + 3600,
                        '/',
                        null,
                        true,
                        true,
                        false,
                        'Lax'
                    ));
                }
            }
        }
        
        return $response;
    }
    
    private function emergencyClearResponse(Request $request, int $headerSize): Response
    {
        // Return an immediate HTML response that clears cookies
        $html = '<!DOCTYPE html>
<html><head><title>Clearing Cookies</title>
<meta http-equiv="refresh" content="3;url=' . $request->url() . '">
</head><body>
<h1>🍪 Clearing oversized cookies...</h1>
<p>Header size: ' . $headerSize . ' bytes (limit: 3KB)</p>
<script>
document.cookie.split(";").forEach(c => {
    const name = c.split("=")[0].trim();
    if(name) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + location.hostname + ";";
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." + location.hostname + ";";
    }
});
setTimeout(() => location.reload(), 2000);
</script>
</body></html>';
        
        return response($html, 200, [
            'Content-Type' => 'text/html',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }
}
