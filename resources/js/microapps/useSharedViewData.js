import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { csrfFetch } from '@/utils/csrf';
import PusherService from '@/services/PusherService';

// Debounce helper
function useDebounce(callback, delay) {
    const timeoutRef = useRef(null);
    
    return useCallback((...args) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);
}

// Normalize data for comparison by removing volatile fields (e.g., timestamps)
function normalizeForCompare(data) {
    try {
        if (!data || typeof data !== 'object') return data;
        const cloned = Array.isArray(data) ? [...data] : { ...data };
        if (cloned && typeof cloned === 'object') {
            if ('lastUpdated' in cloned) {
                // Do not consider lastUpdated in equality checks
                delete cloned.lastUpdated;
            }
        }
        return cloned;
    } catch (_) {
        return data;
    }
}

// Hook for micro-app data persistence in database (shared across users)
export default function useSharedViewData({ projectId, viewName, appKey, defaultValue }) {
    const dataKey = `${appKey}-data`;
    const [state, setState] = useState(defaultValue ?? null);
    const [isLoaded, setIsLoaded] = useState(false);
    const stateRef = useRef(state);
    const channelName = `custom-view.${projectId}.${viewName}`;
    
    useEffect(() => {
        stateRef.current = state;
    }, [state]);
    
    // Function to load data from server
    const loadData = useCallback(async () => {
        try {
            const response = await csrfFetch(
                `/projects/${projectId}/custom-views/load-data?view_name=${encodeURIComponent(viewName)}&data_key=${encodeURIComponent(dataKey)}`,
                {
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                }
            );
            
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
                    // Validate and fix data structure if needed
                    if (dataKey === 'Spreadsheet-data' && data.rows && Array.isArray(data.rows)) {
                        // Fix corrupted rows data (should be array of objects, not array of arrays)
                        if (data.rows.length > 0 && Array.isArray(data.rows[0])) {
                            console.warn('[useSharedViewData] Fixing corrupted rows data structure');
                            data.rows = [{}]; // Reset to valid default
                        }
                    }
                    
                    console.log('[useSharedViewData] Loaded data from server:', data);
                    stateRef.current = data;
                    setState(data);
                    return data;
                }
            }

            // Fallback: fetch the custom view and try to read from metadata or selection marker state
            try {
                const res2 = await csrfFetch(`/projects/${projectId}/custom-views/get?view_name=${encodeURIComponent(viewName)}`, {
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                });
                const p2 = await res2.json().catch(() => null);
                if (res2.ok && p2 && p2.metadata) {
                    const meta = p2.metadata;
                    if (meta.component_data && meta.component_data[dataKey] && meta.component_data[dataKey].data !== undefined) {
                        const mdata = meta.component_data[dataKey].data;
                        console.log('[useSharedViewData] Loaded data from metadata fallback:', mdata);
                        stateRef.current = mdata;
                        setState(mdata);
                        return mdata;
                    }
                }

                // Try selection marker state
                if (res2.ok && p2 && typeof p2.html === 'string') {
                    const m = /\/\*\s*MICROAPP_SELECTED_START\s*\*\/([\s\S]*?)\/\*\s*MICROAPP_SELECTED_END\s*\*\//.exec(p2.html);
                    if (m) {
                        try {
                            const obj = JSON.parse(m[1]);
                            if (obj && obj.state !== undefined) {
                                console.log('[useSharedViewData] Loaded data from selection marker fallback:', obj.state);
                                stateRef.current = obj.state;
                                setState(obj.state);
                                return obj.state;
                            }
                        } catch (_e) {}
                    }
                }
            } catch (e2) {
                console.log('[useSharedViewData] Fallback load error:', e2.message);
            }
        } catch (error) {
            console.log('[useSharedViewData] Load error:', error.message);
        }
        return null;
    }, [projectId, viewName, dataKey]);
    
    // Load data from server on mount
    useEffect(() => {
        let isMounted = true;
        
        const initialize = async () => {
            console.log('[useSharedViewData] Initializing data load for:', { projectId, viewName, dataKey });
            const loadedData = await loadData();
            if (isMounted) {
                // If no data was loaded, initialize with default value
                if (loadedData === null && defaultValue !== null) {
                    console.log('[useSharedViewData] No data found, using default value');
                    stateRef.current = defaultValue;
                    setState(defaultValue);
                }
                setIsLoaded(true);
                console.log('[useSharedViewData] Initialization complete. Data:', loadedData || defaultValue);
            }
        };
        
        initialize();
        
        return () => {
            isMounted = false;
        };
    }, [projectId, viewName, dataKey]); // Removed defaultValue from deps to prevent infinite loop
    
    // Internal save function
    const doSave = useCallback(async (next) => {
        try {
            console.log('[useSharedViewData] Executing save:', { dataKey, next });
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
                    _broadcast: true,
                    _client_id: window.Laravel?.user?.id || 'anonymous',
                }),
            });
            
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                console.error('[useSharedViewData] Save error:', payload);
                // Revert state on error
                const currentData = await loadData();
                if (currentData) {
                    stateRef.current = currentData;
                    setState(currentData);
                }
                return { success: false, status: response.status, ...payload };
            }
            
            return payload || { success: true };
        } catch (error) {
            console.error('[useSharedViewData] Save error:', error);
            // Revert state on error
            const currentData = await loadData();
            if (currentData) {
                stateRef.current = currentData;
                setState(currentData);
            }
            return { success: false, error: error.message };
        }
    }, [projectId, viewName, dataKey, loadData]);
    
    // Debounced save function (500ms delay)
    const debouncedSave = useDebounce(doSave, 500);
    
    // Save data to server
    const persist = useCallback((value, options = {}) => {
        // Do not attempt to save until initial load completes
        if (!isLoaded) {
            return { success: false, pending: true, reason: 'not_loaded' };
        }

        const next = typeof value === 'function' ? value(stateRef.current) : value;

        // Check if data has actually changed (ignore volatile fields)
        const currentData = JSON.stringify(normalizeForCompare(stateRef.current));
        const newData = JSON.stringify(normalizeForCompare(next));

        const force = options && options.force === true;
        if (!force && currentData === newData) {
            console.log('[useSharedViewData] No substantive changes, skipping save');
            return { success: true, skipped: true };
        }

        console.log('[useSharedViewData] Scheduling save:', { dataKey });
        stateRef.current = next;
        setState(next);
        
        // Use debounced save to prevent rapid successive saves, unless immediate is requested
        if (options && options.immediate) {
            doSave(next);
        } else {
            debouncedSave(next);
        }
        
        return { success: true, pending: true };
    }, [debouncedSave, isLoaded]);
    
    // Listen for real-time updates from server
    useEffect(() => {
        if (!isLoaded) return;
        
        const privateChannelName = `private-custom-view.${projectId}.${viewName}`;
        const eventName = 'custom-view-data-updated';
        
        const channel = PusherService.subscribe(privateChannelName);
        if (!channel) {
            console.error('Failed to subscribe to channel:', privateChannelName);
            return;
        }
        
        console.log(`[useSharedViewData] Successfully subscribed to ${privateChannelName}`);
        
        const handleDataUpdate = (data) => {
            console.log('[useSharedViewData] Received update:', { 
                dataKey, 
                receivedKey: data.data_key, 
                currentUserId: window.Laravel?.user?.id,
                updateUserId: data.user?.id,
                data: data.data 
            });
            
            if (data.data_key === dataKey) {
                // Skip if this update is from the current user (check multiple ways)
                const currentUserId = window.Laravel?.user?.id || window.App?.user?.id;
                if (data.user && currentUserId && data.user.id === currentUserId) {
                    console.log('[useSharedViewData] Skipping update from current user');
                    return;
                }
                
                // Also skip if the client_id matches (fallback for when user ID is not available)
                if (data._client_id && data._client_id === (currentUserId || 'anonymous')) {
                    console.log('[useSharedViewData] Skipping update from same client');
                    return;
                }

                // Fix data shape for specific apps if needed
                let incoming = data.data;
                if (dataKey === 'Spreadsheet-data' && incoming && Array.isArray(incoming.rows)) {
                    if (incoming.rows.length > 0 && Array.isArray(incoming.rows[0])) {
                        console.warn('[useSharedViewData] Correcting spreadsheet rows shape from array-of-arrays to array-of-objects');
                        incoming = { ...incoming, rows: [{}] };
                    }
                }

                // Only update if the data is different (ignore volatile fields)
                const currentData = JSON.stringify(normalizeForCompare(stateRef.current));
                const newData = JSON.stringify(normalizeForCompare(incoming));
                
                if (currentData !== newData) {
                    console.log('[useSharedViewData] Updating state with new data');
                    stateRef.current = incoming;
                    setState(incoming);
                } else {
                    console.log('[useSharedViewData] Data unchanged, skipping update');
                }
            } else {
                console.log('[useSharedViewData] Data key mismatch, ignoring update');
            }
        };
        
        // Bind to the specific event
        console.log(`[useSharedViewData] Binding to event: ${eventName}`);
        channel.bind(eventName, handleDataUpdate);
        
        // Cleanup function
        return () => {
            console.log(`[useSharedViewData] Cleaning up event listeners for ${privateChannelName}`);
            if (channel && channel.unbind) {
                channel.unbind(eventName, handleDataUpdate);
            }
            PusherService.unsubscribe(privateChannelName);
        };
    }, [projectId, viewName, dataKey, isLoaded]);
    
    // For backwards compatibility, also return the key
    const reset = () => persist(defaultValue ?? null);
    
    return [state, persist, reset, dataKey, isLoaded];
}
