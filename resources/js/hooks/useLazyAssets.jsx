import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Lazy Loading Hook for Assets and Images
 * Provides intersection observer-based lazy loading with caching
 */

// Global asset cache
const ASSET_CACHE = new Map();
const LOADING_STATES = new Map();

export const useLazyAssets = () => {
    const [loadedAssets, setLoadedAssets] = useState(new Set());
    const [failedAssets, setFailedAssets] = useState(new Set());
    const observerRef = useRef(null);

    // Initialize intersection observer
    useEffect(() => {
        if (!observerRef.current) {
            observerRef.current = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            const element = entry.target;
                            const src = element.dataset.src;
                            const assetType = element.dataset.assetType || 'image';

                            if (src && !loadedAssets.has(src) && !LOADING_STATES.has(src)) {
                                loadAsset(src, assetType, element);
                            }
                        }
                    });
                },
                {
                    rootMargin: '50px', // Load assets 50px before they come into view
                    threshold: 0.1,
                }
            );
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [loadedAssets]);

    // Load asset function
    const loadAsset = useCallback(async (src, assetType, element) => {
        // Check cache first
        if (ASSET_CACHE.has(src)) {
            const cachedAsset = ASSET_CACHE.get(src);
            applyAsset(element, cachedAsset, src);
            setLoadedAssets((prev) => new Set([...prev, src]));
            return;
        }

        LOADING_STATES.set(src, true);

        try {
            if (assetType === 'image') {
                const img = new Image();

                img.onload = () => {
                    ASSET_CACHE.set(src, src);
                    applyAsset(element, src, src);
                    setLoadedAssets((prev) => new Set([...prev, src]));
                    LOADING_STATES.delete(src);

                    // Add fade-in animation
                    element.style.opacity = '0';
                    element.style.transition = 'opacity 0.3s ease-in-out';
                    requestAnimationFrame(() => {
                        element.style.opacity = '1';
                    });
                };

                img.onerror = () => {
                    console.warn(`Failed to load image: ${src}`);
                    setFailedAssets((prev) => new Set([...prev, src]));
                    LOADING_STATES.delete(src);

                    // Apply fallback
                    element.style.backgroundColor = '#f5f5f5';
                    element.style.display = 'flex';
                    element.style.alignItems = 'center';
                    element.style.justifyContent = 'center';
                    element.innerHTML = '📷';
                };

                img.src = src;
            } else {
                // Handle other asset types (e.g., fonts, scripts)
                const response = await fetch(src);
                if (response.ok) {
                    const data = await response.text();
                    ASSET_CACHE.set(src, data);
                    setLoadedAssets((prev) => new Set([...prev, src]));
                } else {
                    throw new Error(`Failed to load asset: ${response.status}`);
                }
                LOADING_STATES.delete(src);
            }
        } catch (error) {
            console.error(`Error loading asset ${src}:`, error);
            setFailedAssets((prev) => new Set([...prev, src]));
            LOADING_STATES.delete(src);
        }
    }, []);

    // Apply loaded asset to element
    const applyAsset = (element, asset, src) => {
        if (element.tagName === 'IMG') {
            element.src = asset;
        } else {
            element.style.backgroundImage = `url(${asset})`;
        }
    };

    // Observe element for lazy loading
    const observeElement = useCallback((element) => {
        if (element && observerRef.current) {
            observerRef.current.observe(element);
        }
    }, []);

    // Unobserve element
    const unobserveElement = useCallback((element) => {
        if (element && observerRef.current) {
            observerRef.current.unobserve(element);
        }
    }, []);

    // Preload critical assets
    const preloadAssets = useCallback(
        (assets) => {
            assets.forEach((src) => {
                if (!ASSET_CACHE.has(src) && !LOADING_STATES.has(src)) {
                    loadAsset(src, 'image', document.createElement('img'));
                }
            });
        },
        [loadAsset]
    );

    // Clear cache
    const clearCache = useCallback(() => {
        ASSET_CACHE.clear();
        LOADING_STATES.clear();
        setLoadedAssets(new Set());
        setFailedAssets(new Set());
    }, []);

    return {
        observeElement,
        unobserveElement,
        preloadAssets,
        clearCache,
        loadedAssets,
        failedAssets,
        isLoading: (src) => LOADING_STATES.has(src),
        isLoaded: (src) => loadedAssets.has(src),
        isFailed: (src) => failedAssets.has(src),
        getCacheSize: () => ASSET_CACHE.size,
    };
};

/**
 * Lazy Image Component
 * Drop-in replacement for img tags with automatic lazy loading
 */
export const LazyImage = ({
    src,
    alt,
    placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMiA4VjE2TTggMTJIMTYiIHN0cm9rZT0iI0NDQyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+',
    className = '',
    style = {},
    onLoad,
    onError,
    ...props
}) => {
    const { observeElement, unobserveElement, isLoaded, isFailed } = useLazyAssets();
    const imgRef = useRef(null);

    useEffect(() => {
        const element = imgRef.current;
        if (element) {
            element.dataset.src = src;
            element.dataset.assetType = 'image';
            observeElement(element);

            return () => unobserveElement(element);
        }
    }, [src, observeElement, unobserveElement]);

    const handleLoad = (e) => {
        onLoad?.(e);
    };

    const handleError = (e) => {
        onError?.(e);
    };

    return (
        <img
            ref={imgRef}
            src={isLoaded(src) ? src : placeholder}
            alt={alt}
            className={`lazy-image ${className} ${isLoaded(src) ? 'loaded' : ''} ${isFailed(src) ? 'failed' : ''}`}
            style={{
                transition: 'opacity 0.3s ease-in-out',
                ...style,
            }}
            onLoad={handleLoad}
            onError={handleError}
            {...props}
        />
    );
};

/**
 * Lazy Background Component
 * For elements with background images
 */
export const LazyBackground = ({
    src,
    children,
    className = '',
    style = {},
    placeholder = '#f5f5f5',
    ...props
}) => {
    const { observeElement, unobserveElement, isLoaded } = useLazyAssets();
    const divRef = useRef(null);

    useEffect(() => {
        const element = divRef.current;
        if (element) {
            element.dataset.src = src;
            element.dataset.assetType = 'image';
            observeElement(element);

            return () => unobserveElement(element);
        }
    }, [src, observeElement, unobserveElement]);

    return (
        <div
            ref={divRef}
            className={`lazy-background ${className} ${isLoaded(src) ? 'loaded' : ''}`}
            style={{
                backgroundImage: isLoaded(src) ? `url(${src})` : 'none',
                backgroundColor: isLoaded(src) ? 'transparent' : placeholder,
                transition: 'background-image 0.3s ease-in-out, background-color 0.3s ease-in-out',
                ...style,
            }}
            {...props}
        >
            {children}
        </div>
    );
};

// Export utility functions
export const preloadImages = (urls) => {
    return Promise.all(
        urls.map((url) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(url);
                img.onerror = () => reject(url);
                img.src = url;
            });
        })
    );
};

export const getAssetCacheStats = () => ({
    cacheSize: ASSET_CACHE.size,
    loadingCount: LOADING_STATES.size,
    cachedAssets: Array.from(ASSET_CACHE.keys()),
});
