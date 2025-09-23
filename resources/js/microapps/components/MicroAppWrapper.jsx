import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box, Stack, Chip, Tooltip, Typography, Fab } from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import ComputerIcon from '@mui/icons-material/Computer';
import useLocalViewData from '../useLocalViewData';
import useSharedViewData from '../useSharedViewData';

// Wrapper component that provides shared/local toggle for micro apps
export default function MicroAppWrapper({ 
    projectId, 
    viewName, 
    appKey, 
    defaultValue,
    title,
    enableSharing = true,
    defaultShared = true,
    children 
}) {
    const [useShared, setUseShared] = useState(defaultShared && enableSharing);
    
    // Use either local or shared data based on toggle
    const localData = useLocalViewData({ projectId, viewName, appKey, defaultValue });
    const sharedData = useSharedViewData({ projectId, viewName, appKey, defaultValue });

    // Normalize tuple shapes: local returns [state, persist, reset, key]; shared returns [state, persist, reset, key, isLoaded]
    const tuple = useShared ? sharedData : localData;
    const state = tuple[0];
    const persist = tuple[1];
    const reset = tuple[2];
    const dataKey = tuple[3];
    const isLoaded = useShared ? (tuple[4] ?? false) : true;

    // Wrapper that accepts optional options for shared mode; ignored for local mode
    const setState = (value, options) => {
        if (useShared) {
            return persist(value, options || {});
        }
        return persist(value); // local mode ignores options
    };
    
    // Render cloud button in the CustomView container if it exists
    const [buttonContainer, setButtonContainer] = useState(null);
    
    useEffect(() => {
        const container = document.getElementById('cloud-local-toggle-container');
        setButtonContainer(container);
    }, []);
    
    const cloudButton = enableSharing && (
        <Tooltip title={useShared ? 'Data is shared with all project members' : 'Data is stored locally on your device'}>
            <Fab
                size="small"
                color={useShared ? 'primary' : 'default'}
                onClick={() => setUseShared(!useShared)}
                sx={{
                    boxShadow: 2,
                    '&:hover': {
                        transform: 'scale(1.05)'
                    }
                }}
            >
                {useShared ? <CloudIcon /> : <ComputerIcon />}
            </Fab>
        </Tooltip>
    );
    
    return (
        <>
            {/* Render cloud button in portal if container exists */}
            {buttonContainer && createPortal(cloudButton, buttonContainer)}
            
            <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* Pass down the state management to children */}
                <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {typeof children === 'function' 
                        ? children({ state, setState, reset, isShared: useShared, isLoaded })
                        : children
                    }
                </Box>
            </Box>
        </>
    );
}
