import React, { createContext, useContext } from 'react';
import useLocalViewData from '../useLocalViewData';
import useSharedViewData from '../useSharedViewData';

const DataContext = createContext();

export function useViewData({ appKey, defaultValue, shared = false }) {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useViewData must be used within MicroAppDataProvider');
    }
    
    const { projectId, viewName } = context;
    
    if (shared) {
        return useSharedViewData({ projectId, viewName, appKey, defaultValue });
    } else {
        return useLocalViewData({ projectId, viewName, appKey, defaultValue });
    }
}

export default function MicroAppDataProvider({ projectId, viewName, children }) {
    return (
        <DataContext.Provider value={{ projectId, viewName }}>
            {children}
        </DataContext.Provider>
    );
}
