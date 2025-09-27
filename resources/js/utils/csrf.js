// resources/js/utils/csrf.js

function readMetaToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
        const content = meta.getAttribute('content');
        if (content && content.length > 0) return content;
    }
    return null;
}

function readWindowLaravel() {
    // Check window.Laravel object set in the blade template
    if (typeof window !== 'undefined' && window.Laravel && window.Laravel.csrfToken) {
        const token = window.Laravel.csrfToken;
        if (token && token.length > 0) return token;
    }
    return null;
}

function readHiddenInput() {
    // Look for hidden CSRF token inputs
    const input = document.querySelector('input[name="_token"]');
    if (input) {
        const value = input.value;
        if (value && value.length > 0) return value;
    }
    return null;
}

function readCookie(name) {
    const match = document.cookie.match(
        new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)')
    );
    return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfToken() {
    // Try multiple sources in order of preference
    const windowToken = readWindowLaravel();
    if (windowToken) return windowToken;

    const metaToken = readMetaToken();
    if (metaToken) return metaToken;

    const inputToken = readHiddenInput();
    if (inputToken) return inputToken;

    const cookieToken = readCookie('XSRF-TOKEN');
    if (cookieToken) return cookieToken;

    // If no token found, log an error for debugging
    console.error('CSRF Token Debug - No token found:', {
        windowLaravel: !!window.Laravel,
        windowToken: !!window.Laravel?.csrfToken,
        metaTag: !!document.querySelector('meta[name="csrf-token"]'),
        hiddenInput: !!document.querySelector('input[name="_token"]'),
        cookie: !!readCookie('XSRF-TOKEN'),
        timestamp: new Date().toISOString(),
    });

    return null;
}

export function withCsrf(init = {}) {
    const token = getCsrfToken();
    const baseHeaders = init.headers ? { ...init.headers } : {};
    const headers = {
        ...baseHeaders,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };

    if (token) {
        headers['X-CSRF-TOKEN'] = token;
        headers['X-XSRF-TOKEN'] = token;
        console.log('CSRF Token applied:', token.substring(0, 10) + '...');
    } else {
        console.error('No CSRF token available for request - this will likely cause a 419 error');
    }

    // Attach current Pusher socket id so server can broadcast()->toOthers()
    try {
        const socketId = window.__pusherSocketId || null;
        if (socketId) {
            headers['X-Socket-Id'] = socketId;
        }
    } catch (_) {}

    return {
        ...init,
        headers,
        // Include cookies for cross-origin dev (Vite 5173 -> Laravel 8000)
        credentials: 'include',
    };
}

// Enhanced fetch wrapper with automatic CSRF handling and error recovery
export async function csrfFetch(url, options = {}) {
    const fetchOptions = withCsrf(options);

    try {
        const response = await fetch(url, fetchOptions);

        // If 419 (CSRF token mismatch), try to refresh the page to get new token
        if (response.status === 419) {
            console.error('CSRF token mismatch (419) - attempting page refresh');
            setTimeout(() => window.location.reload(), 1000);
            throw new Error('CSRF token mismatch - refreshing page');
        }

        if (!response.ok) {
            // Special-case: allow callers of Google Calendar sync to inspect
            // the JSON body (e.g., { requires_auth, authorize_url }) without
            // throwing here, so they can open the OAuth popup.
            try {
                if (typeof url === 'string' && url.includes('/integrations/google/calendar/sync')) {
                    return response;
                }
            } catch (_) {}

            const errorData = await response.json().catch(() => ({}));
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                url,
                errorData,
                token: getCsrfToken() ? 'Present' : 'Missing',
            });
            throw new Error(errorData?.message || `Request failed with status ${response.status}`);
        }

        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}
