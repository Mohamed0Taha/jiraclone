import React, { useState } from 'react';
import { Box, Fab, Tooltip, Zoom, Stack } from '@mui/material';
import {
    Add as AddIcon,
    SmartToy as SmartToyIcon,
    MoreVert as MoreVertIcon,
    Close as CloseIcon,
    Lock as LockIcon,
    ViewModule as ViewModuleIcon,
} from '@mui/icons-material';
import GetAppIcon from '@mui/icons-material/GetApp';
import { useSubscription } from '../Hooks/useSubscription';
import { router } from '@inertiajs/react';

export default function FloatingActionGroup({
    onAddTask,
    onOpenAssistant,
    onOpenDynamicView,
    methodStyles,
    assistantOpen,
    projectId,
}) {
    const [expanded, setExpanded] = useState(false);
    const { shouldShowOverlay, userPlan } = useSubscription();
    const assistantLocked = shouldShowOverlay('ai_chat');

    const handleToggle = () => {
        setExpanded(!expanded);
    };

    const handleAddTask = () => {
        setExpanded(false);
        onAddTask();
    };

    const handleOpenAssistant = () => {
        // Always allow opening the chat - overlay will be shown on responses instead
        setExpanded(false);
        onOpenAssistant();
    };

    const handleOpenDynamicView = () => {
        setExpanded(false);
        onOpenDynamicView();
    };

    const handleExportJira = () => {
        window.location.href = route('projects.export.jira', projectId);
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                zIndex: 1200,
            }}
        >
            <Stack spacing={2} alignItems="center">
                {/* Dynamic View Manager Button */}
                <Zoom
                    in={expanded}
                    timeout={200}
                    style={{ transitionDelay: expanded ? '200ms' : '0ms' }}
                >
                    <Tooltip title="Custom Views & LLM Chat" placement="left">
                        <Fab
                            size="medium"
                            onClick={handleOpenDynamicView}
                            sx={{
                                bgcolor: 'purple',
                                color: 'white',
                                boxShadow: '0 8px 16px -8px rgba(0,0,0,.3)',
                                '&:hover': {
                                    bgcolor: 'darkviolet',
                                    transform: 'scale(1.05)',
                                },
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <ViewModuleIcon />
                        </Fab>
                    </Tooltip>
                </Zoom>

                {/* Assistant Button */}
                <Zoom
                    in={expanded}
                    timeout={200}
                    style={{ transitionDelay: expanded ? '100ms' : '0ms' }}
                >
                    <Tooltip title="AI Assistant" placement="left">
                        <Fab
                            size="medium"
                            onClick={handleOpenAssistant}
                            sx={{
                                bgcolor: 'secondary.main',
                                color: 'white',
                                boxShadow: '0 8px 16px -8px rgba(0,0,0,.3)',
                                '&:hover': {
                                    bgcolor: 'secondary.dark',
                                    transform: 'scale(1.05)',
                                },
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <SmartToyIcon />
                        </Fab>
                    </Tooltip>
                </Zoom>

                {/* Add Task Button */}
                <Zoom
                    in={expanded}
                    timeout={200}
                    style={{ transitionDelay: expanded ? '0ms' : '0ms' }}
                >
                    <Tooltip title="Create task (c)" placement="left">
                        <Fab
                            size="medium"
                            onClick={handleAddTask}
                            sx={{
                                background: methodStyles.accent,
                                color: 'white',
                                boxShadow: '0 8px 16px -8px rgba(0,0,0,.3)',
                                '&:hover': {
                                    opacity: 0.9,
                                    transform: 'scale(1.05)',
                                },
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <AddIcon />
                        </Fab>
                    </Tooltip>
                </Zoom>

                {/* Export Jira Button */}
                <Zoom
                    in={expanded}
                    timeout={200}
                    style={{ transitionDelay: expanded ? '150ms' : '0ms' }}
                >
                    <Tooltip title="Export Jira CSV" placement="left">
                        <Fab
                            size="medium"
                            onClick={handleExportJira}
                            sx={{
                                bgcolor: 'info.main',
                                color: 'white',
                                boxShadow: '0 8px 16px -8px rgba(0,0,0,.3)',
                                '&:hover': { bgcolor: 'info.dark', transform: 'scale(1.05)' },
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <GetAppIcon />
                        </Fab>
                    </Tooltip>
                </Zoom>

                {/* Main Toggle Button */}
                <Tooltip title={expanded ? 'Close menu' : 'Quick actions'}>
                    <Fab
                        color="primary"
                        onClick={handleToggle}
                        sx={{
                            background: expanded
                                ? 'linear-gradient(45deg, #f44336 30%, #ff5722 90%)'
                                : `linear-gradient(45deg, ${methodStyles.accent} 30%, #1976d2 90%)`,
                            boxShadow: '0 10px 20px -12px rgba(0,0,0,.4)',
                            '&:hover': {
                                transform: 'scale(1.05)',
                                boxShadow: '0 12px 24px -10px rgba(0,0,0,.5)',
                            },
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)',
                        }}
                    >
                        {expanded ? <CloseIcon /> : <MoreVertIcon />}
                    </Fab>
                </Tooltip>
            </Stack>
        </Box>
    );
}
