import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { 
    Box, 
    Paper,
    IconButton, 
    Tooltip, 
    Alert, 
    Snackbar, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogContentText, 
    DialogActions, 
    Button,
    Typography,
    Stack,
    Chip,
    alpha,
    useTheme,
    Fade,
    CircularProgress,
    LinearProgress,
    keyframes
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AssistantChat from './AssistantChat';
import ReactComponentRenderer from '@/utils/ReactComponentRenderer';
import { csrfFetch } from '@/utils/csrf';

// Professional design tokens inspired by Board.jsx
const designTokens = {
    gradients: {
        primary: 'linear-gradient(140deg, #F7FAFF 0%, #F2F6FE 55%, #EDF2FA 100%)',
        accent: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        success: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        warning: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    colors: {
        primary: '#4F46E5',
        accent: '#667eea',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
    },
    shadows: {
        card: '0 4px 16px -8px rgba(0, 0, 0, 0.1)',
        elevated: '0 8px 32px -12px rgba(0, 0, 0, 0.15)',
        floating: '0 16px 48px -16px rgba(0, 0, 0, 0.2)',
    },
    radii: {
        lg: 12,
        xl: 16,
    }
};

// Elegant animations
const pulseGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(103, 126, 234, 0.7);
  }
  50% { 
    box-shadow: 0 0 0 10px rgba(103, 126, 234, 0);
  }
`;

const fadeSlideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

export default function CustomView({ auth, project, tasks, allTasks, users, methodology, viewName }) {
    
    const theme = useTheme();
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [componentCode, setComponentCode] = useState('');
    const [customViewId, setCustomViewId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [componentError, setComponentError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const [generationProgress, setGenerationProgress] = useState(null);

    // Enhanced save mechanism with better feedback
    const handleManualSave = async () => {
        if (!componentCode || isSaving) return;
        
        setIsSaving(true);
        try {
            const response = await csrfFetch(`/projects/${project.id}/custom-views/save`, {
                method: 'POST',
                body: JSON.stringify({
                    view_name: viewName,
                    component_code: componentCode,
                    custom_view_id: customViewId
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setCustomViewId(data.customViewId);
                showSnackbar('Micro-application saved successfully!', 'success');
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error('Save error:', error);
            showSnackbar('Failed to save. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    // Enhanced generation progress with detailed stages
    const getProgressIcon = (stage) => {
        switch (stage) {
            case 1: return <CodeIcon sx={{ color: designTokens.colors.primary }} />;
            case 2: return <AutoAwesomeIcon sx={{ color: designTokens.colors.accent }} />;
            case 3: return <BuildIcon sx={{ color: designTokens.colors.warning }} />;
            case 4: return <RocketLaunchIcon sx={{ color: designTokens.colors.success }} />;
            default: return <CircularProgress size={20} />;
        }
    };

    const getProgressMessage = (stage) => {
        switch (stage) {
            case 1: return 'Analyzing your requirements...';
            case 2: return 'Generating intelligent code...'; 
            case 3: return 'Building your application...';
            case 4: return 'Finalizing and deploying...';
            default: return 'Processing...';
        }
    };

    // Auto-save component code to prevent data loss (optimized)
    useEffect(() => {
        if (!componentCode || isLocked || !autoSaveEnabled) return;
        
        // Debounce auto-save to prevent excessive saves
        const timeoutId = setTimeout(() => {
            const backupKey = `microapp-backup-${project?.id || 'unknown'}-${viewName || 'default'}`;
            const backupData = {
                componentCode,
                timestamp: new Date().toISOString(),
                customViewId,
                projectId: project?.id,
                viewName: viewName || 'default'
            };
            localStorage.setItem(backupKey, JSON.stringify(backupData));
        }, 5000); // Save after 5 seconds of inactivity

        return () => {
            clearTimeout(timeoutId);
        };
    }, [componentCode, isLocked, autoSaveEnabled, project?.id, viewName, customViewId]);

    // Load existing custom view on mount (optimized)
    useEffect(() => {
        const loadCustomView = async () => {
            if (!project?.id || !viewName) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await csrfFetch(`/projects/${project.id}/custom-views/get?view_name=${encodeURIComponent(viewName)}`);
                const data = await response.json();

                if (data.success && data.html && data.html.trim()) {
                    setComponentCode(data.html);
                    setCustomViewId(data.customViewId);
                    showSnackbar('Micro-application loaded successfully', 'success');
                } else {
                    // Try to load from local backup
                    const backupKey = `microapp-backup-${project.id}-${viewName}`;
                    const backup = localStorage.getItem(backupKey);
                    if (backup) {
                        try {
                            const backupData = JSON.parse(backup);
                            if (backupData.componentCode && backupData.componentCode.trim()) {
                                setComponentCode(backupData.componentCode || '');
                                setCustomViewId(backupData.customViewId);
                            } else {
                                setComponentCode('');
                            }
                        } catch (e) {
                            setComponentCode('');
                            console.error('[CustomView] Failed to parse backup:', e);
                        }
                    } else {
                        setComponentCode('');
                    }
                }
            } catch (error) {
                console.error('[CustomView] Error loading custom view:', error);
                
                // Fallback to local backup
                const backupKey = `microapp-backup-${project.id}-${viewName}`;
                const backup = localStorage.getItem(backupKey);
                if (backup) {
                    try {
                        const backupData = JSON.parse(backup);
                        setComponentCode(backupData.componentCode || '');
                        setCustomViewId(backupData.customViewId);
                    } catch (e) {
                        setComponentCode('');
                        console.error('[CustomView] Failed to parse backup after API error:', e);
                    }
                } else {
                    setComponentCode('');
                }
                
                showSnackbar('Failed to load custom view, using local backup if available', 'warning');
            } finally {
                setIsLoading(false);
            }
        };

        loadCustomView();
    }, [project?.id, viewName]);

    // Memoize component code for AssistantChat to prevent unnecessary re-renders
    const memoizedComponentCode = useMemo(() => {
        return componentCode && componentCode.trim() ? componentCode : null;
    }, [componentCode]);

    // Enhanced generation handling (optimized with useCallback)
    const handleSpaGenerated = useCallback((payload) => {
        if (typeof payload === 'string') {
            setComponentCode(payload);
            setGenerationProgress(null);
            showSnackbar('Micro-application generated successfully!', 'success');
            setIsLocked(false);
            return;
        }
        
        if (payload && payload.component_code) {
            setComponentCode(payload.component_code);
            setCustomViewId(payload.customViewId || payload.custom_view_id);
            setGenerationProgress(null);
            showSnackbar('Micro-application generated successfully!', 'success');
            setIsLocked(false);
            return;
        }
        
        if (payload && payload.html) {
            setComponentCode(payload.html);
            setCustomViewId(payload.customViewId);
            setGenerationProgress(null);
            showSnackbar('Micro-application generated successfully!', 'success');
            setIsLocked(false);
            return;
        }
        
        console.warn('Unexpected payload format:', payload);
        setGenerationProgress(null);
        showSnackbar('Generation completed but format was unexpected', 'warning');
    }, []);

    // Development logging helper (removed - was causing performance issues)

    const handleToggleLock = () => {
        setIsLocked(!isLocked);
        showSnackbar(isLocked ? 'Micro-application unlocked for editing' : 'Micro-application locked', 'info');
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const handleClearWorkingArea = async () => {
        // Clear local storage backups and any micro-app data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes(`microapp-`) || key.includes(`${project?.id}-${viewName}`))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // If there's a saved custom view, try to delete it from server
        if (customViewId) {
            try {
                const response = await csrfFetch(`/projects/${project.id}/custom-views/delete`, {
                    method: 'DELETE',
                    body: JSON.stringify({
                        view_name: viewName,
                        custom_view_id: customViewId
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        showSnackbar('Micro-application deleted permanently', 'success');
                    } else {
                        showSnackbar('Micro-application cleared locally (server deletion failed)', 'warning');
                    }
                } else {
                    showSnackbar('Micro-application cleared locally (server deletion failed)', 'warning');
                }
            } catch (error) {
                console.error('[CustomView] Error deleting from server:', error);
                showSnackbar('Micro-application cleared locally (server unreachable)', 'warning');
            }
        } else {
            showSnackbar('Working area cleared', 'info');
        }

        // Reset local state
        setComponentCode('');
        setCustomViewId(null);
        setIsLocked(true);
        setDeleteConfirmOpen(false);
    };

    // Emergency recovery function to clear problematic component
    const handleEmergencyReset = useCallback(() => {
        console.warn('[CustomView] Emergency reset triggered');
        setComponentCode('');
        setCustomViewId(null);
        setComponentError(null);
        setIsLocked(true);
        
        // Clear local storage backups that might be causing issues
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes(`microapp-`) || key.includes(`${project?.id}-${viewName}`))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        showSnackbar('Component reset. You can now generate a new micro-application.', 'info');
    }, [project?.id, viewName]);

    // Handle critical errors that could freeze the app
    useEffect(() => {
        const handleCriticalError = (error) => {
            if (componentError && (
                componentError.includes('already been declared') ||
                componentError.includes('SyntaxError') ||
                componentError.includes('freeze')
            )) {
                setTimeout(() => {
                    handleEmergencyReset();
                }, 2000); // Reset after 2 seconds to prevent freeze
            }
        };

        if (componentError) {
            handleCriticalError(componentError);
        }
    }, [componentError, handleEmergencyReset]);

    const handleComponentError = (error) => {
        console.error('[CustomView] Component error:', error);
        setComponentError(error);
        showSnackbar('Component error: ' + error, 'error');
        // Clear the problematic component code to prevent freeze
        if (error.includes('already been declared') || error.includes('SyntaxError')) {
            setComponentCode('');
            showSnackbar('Component cleared due to syntax error. Please regenerate.', 'warning');
        }
    };

    const showSnackbar = (message, severity = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
        >
            <Head title={`Custom View: ${viewName} - ${project.name}`} />

            {/* Enhanced Generation Progress Dialog */}
            <Dialog 
                open={!!generationProgress} 
                disableEscapeKeyDown
                PaperProps={{
                    sx: {
                        borderRadius: designTokens.radii.xl,
                        minWidth: 400,
                        background: designTokens.gradients.primary,
                        boxShadow: designTokens.shadows.floating,
                    }
                }}
            >
                <DialogContent sx={{ p: 4, textAlign: 'center' }}>
                    <Stack spacing={3} alignItems="center">
                        <Box sx={{ 
                            width: 80, 
                            height: 80, 
                            borderRadius: '50%',
                            background: designTokens.gradients.accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 32,
                            position: 'relative',
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                inset: -4,
                                borderRadius: '50%',
                                background: `linear-gradient(45deg, ${designTokens.colors.primary}, ${designTokens.colors.accent})`,
                                animation: `${shimmer} 2s infinite linear`,
                                zIndex: -1,
                                opacity: 0.5,
                            }
                        }}>
                            {getProgressIcon(generationProgress?.step)}
                        </Box>
                        
                        <Box sx={{ width: '100%' }}>
                            <Typography variant="h6" fontWeight="600" color="text.primary" mb={1}>
                                {getProgressMessage(generationProgress?.step)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Step {generationProgress?.step || 1} of {generationProgress?.total || 4}
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={((generationProgress?.step || 1) / (generationProgress?.total || 4)) * 100}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: alpha(designTokens.colors.primary, 0.1),
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 4,
                                        background: designTokens.gradients.accent,
                                    }
                                }}
                            />
                        </Box>
                    </Stack>
                </DialogContent>
            </Dialog>

            {/* Professional Main Container */}
            <Box sx={{ 
                background: designTokens.gradients.primary,
                minHeight: '100vh',
                p: 3 
            }}>
                {/* Floating Control Panel */}
                <Paper 
                    elevation={0}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1200,
                        borderRadius: designTokens.radii.xl,
                        background: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${alpha(designTokens.colors.primary, 0.1)}`,
                        boxShadow: designTokens.shadows.floating,
                        overflow: 'hidden',
                        animation: `${fadeSlideUp} 0.6s ease-out`,
                    }}
                >
                    <Stack direction="column" spacing={0}>
                        {/* Generate Button */}
                        <Tooltip title={componentCode ? "Update Application" : "Generate New Application"} placement="left">
                            <IconButton
                                onClick={() => setAssistantOpen(true)}
                                sx={{
                                    p: 2,
                                    borderRadius: 0,
                                    background: designTokens.gradients.accent,
                                    color: 'white',
                                    '&:hover': {
                                        background: designTokens.gradients.accent,
                                        transform: 'scale(1.05)',
                                    },
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <AutoAwesomeIcon />
                            </IconButton>
                        </Tooltip>

                        {/* Save Button */}
                        {componentCode && (
                            <Tooltip title="Save Application" placement="left">
                                <IconButton
                                    onClick={handleManualSave}
                                    disabled={isSaving}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: designTokens.colors.success,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': {
                                            background: alpha(designTokens.colors.success, 0.1),
                                        },
                                    }}
                                >
                                    {isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                                </IconButton>
                            </Tooltip>
                        )}

                        {/* Lock/Unlock */}
                        {componentCode && (
                            <Tooltip title={isLocked ? "Unlock for Editing" : "Lock Application"} placement="left">
                                <IconButton
                                    onClick={handleToggleLock}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: isLocked ? designTokens.colors.warning : designTokens.colors.primary,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': {
                                            background: alpha(isLocked ? designTokens.colors.warning : designTokens.colors.primary, 0.1),
                                        },
                                    }}
                                >
                                    {isLocked ? <LockIcon /> : <LockOpenIcon />}
                                </IconButton>
                            </Tooltip>
                        )}

                        {/* Refresh */}
                        {componentCode && (
                            <Tooltip title="Refresh Application" placement="left">
                                <IconButton
                                    onClick={handleRefresh}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: theme.palette.text.secondary,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': {
                                            background: alpha(theme.palette.text.secondary, 0.1),
                                        },
                                    }}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        )}

                        {/* Delete */}
                        {componentCode && (
                            <Tooltip title="Delete Application" placement="left">
                                <IconButton
                                    onClick={() => setDeleteConfirmOpen(true)}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: designTokens.colors.error,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': {
                                            background: alpha(designTokens.colors.error, 0.1),
                                        },
                                    }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Tooltip>
                        )}

                        {/* Emergency Reset - always visible when there's an error */}
                        {componentError && (
                            <Tooltip title="Emergency Reset (fixes freeze)" placement="left">
                                <IconButton
                                    onClick={handleEmergencyReset}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: 'white',
                                        background: designTokens.colors.error,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': {
                                            background: designTokens.colors.error,
                                            transform: 'scale(1.05)',
                                        },
                                        animation: `${pulseGlow} 2s infinite`,
                                    }}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Paper>

                {/* Enhanced Main Working Area */}
                <Paper
                    elevation={0}
                    sx={{
                        mt: 2,
                        mr: 10, // Space for floating controls
                        borderRadius: 3,
                        overflow: 'hidden',
                        background: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(12px)',
                        border: isLocked 
                            ? `2px solid ${designTokens.colors.success}` 
                            : `2px dashed ${alpha(designTokens.colors.primary, 0.3)}`,
                        boxShadow: designTokens.shadows.elevated,
                        minHeight: 'calc(100vh - 200px)',
                        position: 'relative',
                        animation: `${fadeSlideUp} 0.8s ease-out`,
                    }}
                >
                    {componentCode ? (
                        <Box sx={{ position: 'relative' }}>
                            {/* Update Available Indicator */}
                            <Box sx={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                zIndex: 10,
                                opacity: 0.8,
                            }}>
                                <Chip 
                                    label="Updateable"
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        borderRadius: designTokens.radii.lg,
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        color: designTokens.colors.accent,
                                        borderColor: designTokens.colors.accent,
                                        background: alpha(designTokens.colors.accent, 0.1),
                                        '&:hover': {
                                            background: alpha(designTokens.colors.accent, 0.2),
                                        }
                                    }}
                                />
                            </Box>
                            {componentCode && componentCode.trim() && (
                                <ReactComponentRenderer
                                    componentCode={componentCode}
                                    project={project}
                                    auth={auth}
                                    viewName={viewName}
                                    onError={handleComponentError}
                                    tasks={tasks}
                                    allTasks={allTasks}
                                    users={users}
                                    methodology={methodology}
                                />
                            )}
                        </Box>
                    ) : isLoading ? (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 'calc(100vh - 200px)',
                            color: 'text.secondary',
                        }}>
                            <Box sx={{
                                width: 60,
                                height: 60,
                                borderRadius: '50%',
                                background: designTokens.gradients.accent,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                mb: 3,
                                animation: `${shimmer} 1.5s infinite linear`,
                            }}>
                                <AutoAwesomeIcon fontSize="large" />
                            </Box>
                            <Typography variant="h6" fontWeight="500" mb={1}>
                                Loading Application Studio...
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Preparing your custom application environment
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 'calc(100vh - 200px)',
                            p: 4,
                            textAlign: 'center',
                        }}>
                            <Box sx={{
                                width: 120,
                                height: 120,
                                borderRadius: designTokens.radii.xl,
                                background: designTokens.gradients.accent,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                mb: 4,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'scale(1.05)',
                                    boxShadow: designTokens.shadows.floating,
                                }
                            }}
                            onClick={() => setAssistantOpen(true)}
                            >
                                <AutoAwesomeIcon sx={{ fontSize: 48 }} />
                            </Box>
                            
                            <Typography variant="h4" fontWeight="600" color="text.primary" mb={2}>
                                Ready to Create Something Amazing?
                            </Typography>
                            <Typography variant="body1" color="text.secondary" mb={4} maxWidth={600}>
                                Welcome to your custom application studio. Use AI to generate powerful, 
                                data-driven micro-applications tailored to your project needs.
                            </Typography>
                            
                            <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
                                <Chip 
                                    label="📊 Data Dashboard" 
                                    variant="outlined" 
                                    sx={{ borderRadius: designTokens.radii.lg }}
                                />
                                <Chip 
                                    label="📋 Task Manager" 
                                    variant="outlined" 
                                    sx={{ borderRadius: designTokens.radii.lg }}
                                />
                                <Chip 
                                    label="📈 Analytics View" 
                                    variant="outlined" 
                                    sx={{ borderRadius: designTokens.radii.lg }}
                                />
                                <Chip 
                                    label="🎯 Custom Tool" 
                                    variant="outlined" 
                                    sx={{ borderRadius: designTokens.radii.lg }}
                                />
                            </Stack>
                            
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => setAssistantOpen(true)}
                                startIcon={<AutoAwesomeIcon />}
                                sx={{
                                    mt: 4,
                                    borderRadius: designTokens.radii.lg,
                                    background: designTokens.gradients.accent,
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 600,
                                    boxShadow: designTokens.shadows.card,
                                    '&:hover': {
                                        background: designTokens.gradients.accent,
                                        transform: 'translateY(-2px)',
                                        boxShadow: designTokens.shadows.elevated,
                                    },
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                Start Creating
                            </Button>
                        </Box>
                    )}
                </Paper>
            </Box>

            {/* Enhanced Delete Confirmation Dialog */}
            <Dialog 
                open={deleteConfirmOpen} 
                onClose={() => setDeleteConfirmOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        background: designTokens.gradients.primary,
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: alpha(designTokens.colors.error, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: designTokens.colors.error,
                        }}>
                            <DeleteIcon />
                        </Box>
                        <Typography variant="h6" fontWeight="600">
                            Delete Application
                        </Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        Are you sure you want to delete this custom application? This action cannot be undone.
                        All generated code and saved data will be permanently removed.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button 
                        onClick={() => setDeleteConfirmOpen(false)}
                        sx={{ borderRadius: designTokens.radii.lg }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleClearWorkingArea}
                        variant="contained"
                        color="error"
                        sx={{ 
                            borderRadius: designTokens.radii.lg,
                            fontWeight: 600,
                        }}
                    >
                        Delete Permanently
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Enhanced Assistant Chat Dialog */}
            <AssistantChat
                project={project}
                tasks={tasks}
                allTasks={allTasks}
                users={users}
                methodology={methodology}
                viewName={viewName}
                open={assistantOpen}
                onClose={() => setAssistantOpen(false)}
                isCustomView={true}
                onSpaGenerated={handleSpaGenerated}
                onProgressUpdate={setGenerationProgress}
                currentComponentCode={memoizedComponentCode}
            />

            {/* Enhanced Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert 
                    onClose={handleCloseSnackbar} 
                    severity={snackbar.severity}
                    sx={{ 
                        width: '100%',
                        borderRadius: designTokens.radii.lg,
                        fontWeight: 500,
                    }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </AuthenticatedLayout>
    );
}