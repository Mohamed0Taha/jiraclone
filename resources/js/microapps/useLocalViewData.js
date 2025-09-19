import { useState, useEffect, useRef } from 'react';

// Persist micro-app data in localStorage per project/view/app
// Key format: microapp-<projectId>-<viewName>-<appKey>
export default function useLocalViewData({ projectId, viewName, appKey, defaultValue }) {
  const stableKey = `microapp-${projectId || 'unknown'}-${viewName || 'default'}-${appKey || 'app'}`;
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(stableKey);
      return raw ? JSON.parse(raw) : (defaultValue ?? null);
    } catch (_) {
      return defaultValue ?? null;
    }
  });
  const ref = useRef(state);

  useEffect(() => { ref.current = state; }, [state]);

  useEffect(() => {
    // Save state to localStorage whenever it changes
    const saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(stableKey, JSON.stringify(state));
      } catch (_) { /* ignore quota errors */ }
    }, 100); // Small delay to batch updates
    
    return () => clearTimeout(saveTimeout);
  }, [stableKey, state]);

  const persist = (next) => {
    const value = typeof next === 'function' ? next(ref.current) : next;
    ref.current = value;
    setState(value);
    try { localStorage.setItem(stableKey, JSON.stringify(value)); } catch (_) {}
    return value;
  };

  const reset = () => persist(defaultValue ?? null);

  return [state, persist, reset, stableKey];
}
