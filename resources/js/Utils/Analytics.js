// Analytics tracking utility
class TaskPilotAnalytics {
    constructor() {
        this.startTime = Date.now();
        this.visitorId = this.getCookie('visitor_id');
        this.sessionId = this.getSessionId();
        this.init();
    }

    init() {
        // Track page load
        window.addEventListener('load', () => {
            this.trackPageView();
        });

        // Track time on page when leaving
        window.addEventListener('beforeunload', () => {
            this.trackTimeOnPage();
        });

        // Track clicks on important elements
        this.trackClicks();

        // Track scroll depth
        this.trackScrollDepth();
    }

    trackPageView() {
        const data = {
            url: window.location.pathname + window.location.search,
            title: document.title,
            referrer: document.referrer,
            load_time: Date.now() - this.startTime,
            screen_width: screen.width,
            screen_height: screen.height,
            language: navigator.language,
            custom_data: {
                scroll_depth: 0,
                clicks: 0,
                viewport_width: window.innerWidth,
                viewport_height: window.innerHeight,
            }
        };

        this.sendTracking(data);
    }

    trackTimeOnPage() {
        const timeOnPage = Math.round((Date.now() - this.startTime) / 1000);
        
        if (timeOnPage > 5) { // Only track if user stayed more than 5 seconds
            this.sendTracking({
                url: window.location.pathname,
                time_on_page: timeOnPage,
                visitor_id: this.visitorId,
            });
        }
    }

    trackClicks() {
        let clickCount = 0;
        
        // Track clicks on important elements
        const importantSelectors = [
            'button',
            'a[href*="register"]',
            'a[href*="login"]',
            'a[href*="pricing"]',
            'a[href*="demo"]',
            '.cta-button',
            '[data-track="true"]'
        ];

        importantSelectors.forEach(selector => {
            document.addEventListener('click', (e) => {
                if (e.target.matches(selector) || e.target.closest(selector)) {
                    clickCount++;
                    
                    const element = e.target.closest(selector) || e.target;
                    const elementText = element.textContent?.trim().substring(0, 100) || '';
                    const elementHref = element.href || '';
                    
                    this.sendTracking({
                        url: window.location.pathname,
                        custom_data: {
                            event_type: 'click',
                            element_selector: selector,
                            element_text: elementText,
                            element_href: elementHref,
                            click_count: clickCount,
                            timestamp: Date.now()
                        }
                    });
                }
            }, true);
        });
    }

    trackScrollDepth() {
        let maxScroll = 0;
        let scrollDepthSent = false;

        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
            }

            // Send scroll depth at 25%, 50%, 75%, and 100%
            if (!scrollDepthSent && maxScroll >= 75) {
                scrollDepthSent = true;
                this.sendTracking({
                    url: window.location.pathname,
                    custom_data: {
                        event_type: 'scroll_depth',
                        max_scroll_percent: maxScroll,
                        timestamp: Date.now()
                    }
                });
            }
        });
    }

    sendTracking(data) {
        // Use sendBeacon for better reliability, fallback to fetch
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        // Add CSRF token if available
        const csrfToken = this.getCsrfToken();
        if (csrfToken) {
            headers['X-CSRF-TOKEN'] = csrfToken;
        }

        const payload = JSON.stringify(data);
        
        if (navigator.sendBeacon) {
            // Note: sendBeacon doesn't support custom headers, so we use fetch for CSRF
            fetch('/api/analytics/track', {
                method: 'POST',
                headers: headers,
                body: payload,
                keepalive: true
            }).catch(error => {
                // Silently fail - don't disrupt user experience
                console.debug('Analytics tracking failed:', error);
            });
        } else {
            fetch('/api/analytics/track', {
                method: 'POST',
                headers: headers,
                body: payload,
                keepalive: true
            }).catch(error => {
                // Silently fail - don't disrupt user experience
                console.debug('Analytics tracking failed:', error);
            });
        }
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('session_id', sessionId);
        }
        return sessionId;
    }

    getCsrfToken() {
        const token = document.querySelector('meta[name="csrf-token"]');
        return token ? token.getAttribute('content') : '';
    }
}

// Initialize analytics if not a bot
if (typeof navigator !== 'undefined' && 
    !navigator.userAgent.match(/bot|crawler|spider|crawling/i)) {
    window.taskPilotAnalytics = new TaskPilotAnalytics();
}

export default TaskPilotAnalytics;
