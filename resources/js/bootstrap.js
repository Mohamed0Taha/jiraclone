import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
// Ensure cookies (session) are sent with requests (needed when using subdomains / different origins)
window.axios.defaults.withCredentials = true;

// Set up CSRF token for axios
const token = document.querySelector('meta[name="csrf-token"]');
if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token.getAttribute('content');
} else {
    console.error('CSRF token not found: https://laravel.com/docs/csrf#csrf-x-csrf-token');
}

// Add request interceptor to check and warn about large cookie headers
window.axios.interceptors.request.use(
    (config) => {
        // Check if cookie header might be too large
        const cookieHeader = document.cookie;
        if (cookieHeader && cookieHeader.length > 2048) { // Be more aggressive - 2KB threshold
            console.warn('Large cookie header detected:', cookieHeader.length, 'bytes');
            console.warn('This may cause 400 Bad Request errors');
            
            // Try to clear non-essential cookies
            const cookies = document.cookie.split(';');
            const essential = ['tp_s', 'XSRF-TOKEN'];
            
            cookies.forEach(cookie => {
                const [name] = cookie.trim().split('=');
                if (!essential.includes(name) && name) {
                    console.log('Clearing cookie:', name);
                    // Clear with multiple domain/path combinations
                    const domain = window.location.hostname;
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`;
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
                }
            });
            
            // Re-check after cleanup
            const newCookieHeader = document.cookie;
            console.log('Cookie header size after cleanup:', newCookieHeader.length, 'bytes');
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add axios response interceptor to handle 419 CSRF errors
window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 419) {
            console.warn('CSRF token mismatch. Refreshing page...');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

// Proactive cookie cleanup function
function cleanupCookies() {
    const cookieHeader = document.cookie;
    const headerSize = cookieHeader.length;
    
    if (headerSize > 2048) {
        console.warn('Proactively cleaning up oversized cookies:', headerSize, 'bytes');
        
        const cookies = document.cookie.split(';');
        const essential = ['tp_s', 'XSRF-TOKEN'];
        let cleaned = 0;
        
        cookies.forEach(cookie => {
            const [name] = cookie.trim().split('=');
            if (!essential.includes(name) && name) {
                const domain = window.location.hostname;
                // Aggressive cleanup with all possible domain/path combinations
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
                cleaned++;
            }
        });
        
        console.log(`Cleaned ${cleaned} cookies. New size:`, document.cookie.length, 'bytes');
    }
}

// Run cookie cleanup on page load
document.addEventListener('DOMContentLoaded', cleanupCookies);
// Also run immediately in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanupCookies);
} else {
    cleanupCookies();
}

// NUCLEAR OPTION: Clear ALL cookies immediately if header is too large
if (document.cookie.length > 3072) { // 3KB emergency threshold
    console.warn('🚨 NUCLEAR COOKIE CLEAR - Header too large:', document.cookie.length, 'bytes');
    const cookies = document.cookie.split(';');
    const domain = window.location.hostname;
    
    cookies.forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name) {
            // Clear with ALL possible combinations immediately
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
        }
    });
    
    console.log('🔄 Reloading page after nuclear clear...');
    setTimeout(() => window.location.reload(), 1000);
}

// Emergency cookie clearing function - can be called from browser console
window.emergencyClearCookies = function() {
    const cookies = document.cookie.split(';');
    const domain = window.location.hostname;
    let cleared = 0;
    
    console.warn('🚨 EMERGENCY COOKIE CLEAR - Clearing ALL cookies');
    
    cookies.forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name) {
            // Clear with all possible domain/path combinations
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
            cleared++;
        }
    });
    
    console.log(`✅ Cleared ${cleared} cookies. New size:`, document.cookie.length, 'bytes');
    console.log('🔄 Refreshing page in 2 seconds...');
    
    setTimeout(() => {
        window.location.reload();
    }, 2000);
    
    return `Cleared ${cleared} cookies`;
};

// Utility function to get CSRF token with fallbacks
window.getCsrfToken = function() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') 
        || window.Laravel?.csrfToken 
        || '';
};

// Utility function for making authenticated fetch requests
window.authenticatedFetch = function(url, options = {}) {
    const csrfToken = window.getCsrfToken();
    
    if (!csrfToken) {
        console.error('CSRF token not found');
        return Promise.reject(new Error('CSRF token not found'));
    }

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    };

    const mergedOptions = {
        // Use 'include' so cookies are sent even on subdomain / cross-origin allowed by CORS
        credentials: 'include',
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    return fetch(url, mergedOptions)
        .then(response => {
            if (response.status === 419) {
                console.warn('CSRF token mismatch. Refreshing page...');
                window.location.reload();
                return Promise.reject(new Error('CSRF token expired'));
            }
            return response;
        });
};

// Make route function available globally if it exists
if (window.Ziggy) {
    const { route } = await import('ziggy-js');
    window.route = route;
}
