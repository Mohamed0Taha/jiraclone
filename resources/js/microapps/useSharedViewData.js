import { useState, useEffect, useRef, useCallback } from 'react';
import { csrfFetch } from '@/utils/csrf';

// Hook for micro-app data persistence in database (shared across users)
export default function useSharedViewData({ projectId, viewName, appKey, defaultValue }) {
    const dataKey = `${appKey}-data`;
    const [state, setState] = useState(defaultValue ?? null);
    const [isLoaded, setIsLoaded] = useState(false);
    const stateRef = useRef(state);
    
    useEffect(() => {
        stateRef.current = state;
    }, [state]);
    
    // Load data from server on mount
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const response = await csrfFetch(
                    `/projects/${projectId}/custom-views/load-data?view_name=${encodeURIComponent(viewName)}&data_key=${encodeURIComponent(dataKey)}`,
                    {
                        method: 'GET',
                        headers: {
                            Accept: 'application/json',
                        },
                    }
                );
                
                if (!active) return;
                
                const payload = await response.json().catch(() => null);
                if (response.ok && payload) {
                    let data = null;
                    
                    // Handle different response structures
                    if (payload.success && payload.data && Object.prototype.hasOwnProperty.call(payload.data, 'data')) {
                        data = payload.data.data;
                    } else if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
                        data = payload.data;
                    }
                    
                    if (data !== null && data !== undefined) {
                        stateRef.current = data;
                        setState(data);
                    }
                }
            } catch (error) {
                console.warn('[useSharedViewData] Load error:', error);
            } finally {
                if (active) setIsLoaded(true);
            }
        })();
        
        return () => {
            active = false;
        };
    }, [projectId, viewName, dataKey]);
    
    // Save data to server
    const persist = useCallback(async (value) => {
        const next = typeof value === 'function' ? value(stateRef.current) : value;
        stateRef.current = next;
        setState(next);
        
        try {
            const response = await csrfFetch(`/projects/${projectId}/custom-views/save-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    view_name: viewName,
                    data_key: dataKey,
                    data: next,
                }),
            });
            
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                console.error('[useSharedViewData] Save error:', payload);
                return { success: false, status: response.status, ...payload };
            }
            
            // Broadcast change to other users via Echo
            if (window.Echo) {
                const channelName = `custom-view.${projectId}.${viewName}`;
                // This will be picked up by other users watching this view
                window.Echo.private(channelName).whisper('data-updated', {
                    data_key: dataKey,
                    timestamp: new Date().toISOString(),
                });
            }
            
            return payload || { success: true };
        } catch (error) {
            console.error('[useSharedViewData] Save error:', error);
            return { success: false, error: error.message };
        }
    }, [projectId, viewName, dataKey]);
    
    // Listen for real-time updates from other users
    useEffect(() => {
        if (!window.Echo || !isLoaded) return;
        
        const channelName = `custom-view.${projectId}.${viewName}`;
        const channel = window.Echo.private(channelName);
        
        const handleDataUpdate = async (e) => {
            if (e.data_key === dataKey) {
                // Reload data from server when another user updates
                try {
                    const response = await csrfFetch(
                        `/projects/${projectId}/custom-views/load-data?view_name=${encodeURIComponent(viewName)}&data_key=${encodeURIComponent(dataKey)}`,
                        {
                            method: 'GET',
                            headers: {
                                Accept: 'application/json',
                            },
                        }
                    );
                    
                    const payload = await response.json().catch(() => null);
                    if (response.ok && payload) {
                        let data = null;
                        
                        if (payload.success && payload.data && Object.prototype.hasOwnProperty.call(payload.data, 'data')) {
                            data = payload.data.data;
                        } else if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
                            data = payload.data;
                        }
                        
                        if (data !== null && data !== undefined) {
                            stateRef.current = data;
                            setState(data);
                        }
                    }
                } catch (error) {
                    console.warn('[useSharedViewData] Reload error:', error);
                }
            }
        };
        
        channel.listenForWhisper('data-updated', handleDataUpdate);
        
        return () => {
            channel.stopListeningForWhisper('data-updated', handleDataUpdate);
        };
    }, [projectId, viewName, dataKey, isLoaded]);
    
    // For backwards compatibility, also return the key
    const reset = () => persist(defaultValue ?? null);
    
    return [state, persist, reset, dataKey, isLoaded];
}
