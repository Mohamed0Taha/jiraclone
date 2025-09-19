import React, { useState } from 'react';
import { Box, Stack, Chip, Tooltip, Typography } from '@mui/material';
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
    
    const [state, setState, reset, dataKey, isLoaded] = useShared ? sharedData : localData;
    
    return (
        <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography variant="h6" fontWeight={600}>{title}</Typography>
                    {enableSharing && (
                        <Tooltip title={useShared ? 'Data is shared with all project members' : 'Data is stored locally on your device'}>
                            <Chip 
                                icon={useShared ? <CloudIcon /> : <ComputerIcon />}
                                label={useShared ? 'Shared' : 'Local'}
                                onClick={() => setUseShared(!useShared)}
                                color={useShared ? 'primary' : 'default'}
                                variant={useShared ? 'filled' : 'outlined'}
                                size="small"
                                clickable
                            />
                        </Tooltip>
                    )}
                </Stack>
            </Stack>
            {/* Pass down the state management to children */}
            {typeof children === 'function' 
                ? children({ state, setState, reset, isShared: useShared, isLoaded })
                : children
            }
        </Box>
    );
}
