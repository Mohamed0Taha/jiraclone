import React, { useState } from 'react';
import { Box, Tooltip, Fab } from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import ComputerIcon from '@mui/icons-material/Computer';

// Container component that manages the cloud/local button positioning
export default function MicroAppContainer({ children, enableSharing = true, defaultShared = true }) {
    const [useShared, setUseShared] = useState(defaultShared && enableSharing);
    
    // Clone children and pass down the shared state
    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, { 
                useShared, 
                setUseShared,
                renderCloudButton: () => enableSharing && (
                    <Tooltip title={useShared ? 'Data is shared with all project members' : 'Data is stored locally on your device'}>
                        <Fab
                            size="small"
                            color={useShared ? 'primary' : 'default'}
                            onClick={() => setUseShared(!useShared)}
                            sx={{
                                boxShadow: 2,
                                ml: 'auto',
                                '&:hover': {
                                    transform: 'scale(1.05)'
                                }
                            }}
                        >
                            {useShared ? <CloudIcon /> : <ComputerIcon />}
                        </Fab>
                    </Tooltip>
                )
            });
        }
        return child;
    });
    
    return <>{childrenWithProps}</>;
}
