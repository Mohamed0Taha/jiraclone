// Performance monitoring utilities for the React app
// resources/js/utils/performance.js

/**
 * Measures and logs component render performance
 */
export const measureRenderTime = (componentName, fn) => {
    if (process.env.NODE_ENV === 'development') {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`🚀 ${componentName} rendered in ${(end - start).toFixed(2)}ms`);
        return result;
    }
    return fn();
};

/**
 * Debounce function for expensive operations like search
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Memoize expensive calculations
 */
export const memoize = (fn) => {
    const cache = new Map();
    return (...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};

/**
 * Performance observer for tracking bundle loading times
 */
export const trackBundleLoad = () => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.entryType === 'navigation') {
                    console.log(
                        `📦 Bundle loaded in ${entry.loadEventEnd - entry.loadEventStart}ms`
                    );
                }
            });
        });
        observer.observe({ entryTypes: ['navigation'] });
    }
};

/**
 * Track lazy loading performance
 */
export const trackLazyLoad = (componentName) => {
    return (Component) => {
        return React.forwardRef((props, ref) => {
            React.useEffect(() => {
                console.log(`🔄 Lazy loaded: ${componentName}`);
            }, []);

            return React.createElement(Component, { ...props, ref });
        });
    };
};

/**
 * Memory usage tracker (development only)
 */
export const trackMemoryUsage = () => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
        const memInfo = performance.memory;
        console.log(
            `🧠 Memory usage: ${(memInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / ${(memInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`
        );
    }
};

/**
 * Bundle size analyzer
 */
export const logBundleInfo = () => {
    if (process.env.NODE_ENV === 'development') {
        const scripts = document.querySelectorAll('script[src]');
        let totalSize = 0;

        scripts.forEach((script) => {
            if (script.src.includes('assets')) {
                console.log(`📄 Script: ${script.src.split('/').pop()}`);
            }
        });

        console.log(`📊 Total scripts: ${scripts.length}`);
    }
};
