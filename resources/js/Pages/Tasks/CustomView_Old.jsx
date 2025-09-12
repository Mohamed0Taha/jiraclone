import React, { useState, useEffect } from 'react';
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
    
    // Debug: Log all props received by CustomView
    console.log('[CustomView] All props received:', {
        auth: auth ? 'present' : 'missing',
        project: project ? { id: project.id, name: project.name } : 'missing',
        tasks: tasks ? Object.keys(tasks) : 'missing',
        allTasks: allTasks ? `array of ${allTasks.length} items` : 'missing',
        users: users ? `array of ${users.length} items` : 'missing', 
        methodology: methodology || 'missing',
        viewName: viewName || 'missing'
    });
    
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
    const [isLocked, setIsLocked] = useState(true);
    const [componentCode, setComponentCode] = useState('');
    const [customViewId, setCustomViewId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [componentError, setComponentError] = useState(null);

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

    // Auto-save component code to prevent data loss
    useEffect(() => {
        if (componentCode && !isLocked) {
            devLog('Setting up periodic save for component code');
            const saveInterval = setInterval(() => {
                const backupKey = `microapp-backup-${project?.id || 'unknown'}-${viewName || 'default'}`;
                const backupData = {
                    componentCode,
                    timestamp: new Date().toISOString(),
                    customViewId,
                    projectId: project?.id,
                    viewName: viewName || 'default'
                };
                localStorage.setItem(backupKey, JSON.stringify(backupData));
                devLog('Auto-saved component code to local storage');
            }, 30000); // Save every 30 seconds

            return () => {
                clearInterval(saveInterval);
                devLog('Cleared periodic save interval');
            };
        }
    }, [componentCode, isLocked, project?.id, viewName, customViewId]);

    // Load existing custom view on component mount
    useEffect(() => {
        devLog('Component mounting, loading existing custom view', { projectId: project?.id, viewName });
        loadExistingCustomView();
    }, [project?.id, viewName]);

    const loadExistingCustomView = async () => {
        if (!project?.id) {
            devLog('No project ID available, skipping load');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            devLog('Loading custom view from API', { projectId: project.id, viewName: viewName || 'default' });
            
            // Use the web route for custom views (not API)
            const activeView = viewName || 'default';
            const response = await csrfFetch(`/projects/${project.id}/custom-views/get?view_name=${encodeURIComponent(activeView)}`);
            
            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                devLog('Non-JSON response received', {
                    status: response.status,
                    statusText: response.statusText,
                    contentType: contentType,
                    responsePreview: responseText.substring(0, 500),
                    url: `/projects/${project.id}/custom-views/get?view_name=${activeView}`
                });
                throw new Error('Server returned non-JSON response. Check server configuration.');
            }
            
            const data = await response.json();
            devLog('API response received', { success: data.success, hasComponent: !!data.html, customViewId: data.custom_view_id });
            
            if (data.success && data.html) {
                // data.html now contains React component code instead of HTML
                setComponentCode(data.html);
                setCustomViewId(data.custom_view_id);
                try {
                    const backupKey = `microapp-backup-${project?.id}-${viewName || 'default'}`;
                    localStorage.setItem(backupKey, JSON.stringify({ componentCode: data.html, customViewId: data.custom_view_id, ts: Date.now() }));
                } catch {}
                devLog('React component code loaded successfully');
                
                showSnackbar('Micro-application loaded successfully', 'success');
            } else {
                devLog('No existing custom view found or server returned empty component');
                // Fallback to local backup if available
                const backupKey = `microapp-backup-${project.id}-${viewName || 'default'}`;
                const backup = localStorage.getItem(backupKey);
                if (backup) {
                    try {
                        const backupData = JSON.parse(backup);
                        setComponentCode(backupData.componentCode || '');
                        setCustomViewId(backupData.customViewId || null);
                        devLog('Loaded from local backup (no server component)');
                        showSnackbar('Loaded from local backup', 'info');
                    } catch {
                        setComponentCode('');
                        setCustomViewId(null);
                    }
                } else {
                    setComponentCode('');
                    setCustomViewId(null);
                }
            }
        } catch (error) {
            console.error('Error loading custom view:', error);
            devLog('Error loading custom view', { error: error.message });
            
            // Try to load from backup
            const backupKey = `microapp-backup-${project.id}-${viewName || 'default'}`;
            const backup = localStorage.getItem(backupKey);
            if (backup) {
                try {
                    const backupData = JSON.parse(backup);
                    setComponentCode(backupData.componentCode || '');
                    setCustomViewId(backupData.customViewId);
                    devLog('Loaded from local backup');
                    showSnackbar('Loaded from local backup due to server error', 'warning');
                } catch (backupError) {
                    devLog('Backup parsing failed', { error: backupError.message });
                }
            } else {
                showSnackbar('Error loading custom view: ' + error.message, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };
    // Handle AI-generated component
    const handleSpaGenerated = (payload) => {
        // payload can be either a string (component code) or an object with html/component_code
        devLog('SPA generated via assistant', payload);

        if (!payload) return;

        if (typeof payload === 'string') {
            setComponentCode(payload);
            try {
                const backupKey = `microapp-backup-${project?.id}-${viewName || 'default'}`;
                localStorage.setItem(backupKey, JSON.stringify({ componentCode: payload, customViewId: null, ts: Date.now() }));
            } catch {}
            showSnackbar('Micro-application generated successfully!', 'success');
            setAssistantOpen(false);
            return;
        }

        if (payload.component_code) {
            setComponentCode(payload.component_code);
            setCustomViewId(payload.custom_view_id);
            try {
                const backupKey = `microapp-backup-${project?.id}-${viewName || 'default'}`;
                localStorage.setItem(backupKey, JSON.stringify({ componentCode: payload.component_code, customViewId: payload.custom_view_id, ts: Date.now() }));
            } catch {}
            showSnackbar('Micro-application generated successfully!', 'success');
            setAssistantOpen(false);
            return;
        }

        if (payload.html) {
            setComponentCode(payload.html);
            setCustomViewId(payload.custom_view_id);
            try {
                const backupKey = `microapp-backup-${project?.id}-${viewName || 'default'}`;
                localStorage.setItem(backupKey, JSON.stringify({ componentCode: payload.html, customViewId: payload.custom_view_id, ts: Date.now() }));
            } catch {}
            showSnackbar('Application generated successfully!', 'success');
            setAssistantOpen(false);
        }
    };

    // Handle component rendering errors
    const handleComponentError = (error) => {
        setComponentError(error);
        showSnackbar(`Component error: ${error}`, 'error');
    };

    // Refresh/reload the component
    const handleRefreshComponent = () => {
        setComponentError(null);
        loadExistingCustomView();
    };
    // Utility functions
    const showSnackbar = (message, severity = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const toggleLock = () => {
        devLog('Toggling lock state', { currentlyLocked: isLocked });
        setIsLocked(!isLocked);
        showSnackbar(isLocked ? 'Micro-application unlocked for editing' : 'Micro-application locked', 'info');
    };

    const handleDeleteClick = () => {
        devLog('Delete button clicked, opening confirmation dialog');
        setDeleteConfirmOpen(true);
    };

    const handleDeleteCancel = () => {
        devLog('Delete cancelled by user');
        setDeleteConfirmOpen(false);
    };

    const clearWorkingArea = async () => {
        devLog('Clearing working area confirmed', { hasCustomViewId: !!customViewId });
        setDeleteConfirmOpen(false);
        
        // Always clear local state and backups first
        setComponentCode('');
        setCustomViewId(null);
        setComponentError(null);
        
        // Clear local storage backups and any micro-app data
        try {
            const backupKey = `microapp-backup-${project?.id}-${viewName || 'default'}`;
            localStorage.removeItem(backupKey);
            
            // Clear all micro-app data for this view (milestones, data, etc.)
            const ns = `microapp-${project?.id || 'unknown'}-${viewName || 'default'}-`;
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(ns)) {
                    toRemove.push(key);
                }
            }
            toRemove.forEach(key => localStorage.removeItem(key));
            
            devLog('Cleared local storage backups and data', { removedKeys: toRemove.length });
        } catch (storageError) {
            devLog('Error clearing local storage', storageError);
        }

        if (!customViewId) {
            // Just local cleanup if no saved view on server
            showSnackbar('Working area cleared', 'success');
            devLog('Local working area cleared (no saved view)');
            return;
        }

        try {
            devLog('Deleting custom view from server', { projectId: project.id, viewName: viewName || 'default', customViewId });
            
            // Use web route for deleting custom views
            const response = await csrfFetch(`/projects/${project.id}/custom-views/delete?view_name=${viewName || 'default'}`, {
                method: 'DELETE',
            });
            
            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                devLog('Non-JSON response received on delete', {
                    status: response.status,
                    statusText: response.statusText,
                    contentType: contentType,
                    responsePreview: responseText.substring(0, 500)
                });
                // Still consider it successful since local cleanup already happened
                showSnackbar('Micro-application cleared (server response unclear)', 'warning');
                return;
            }
            
            const data = await response.json();
            devLog('Delete API response', { success: data.success, message: data.message });
            
            if (data.success) {
                showSnackbar('Micro-application deleted permanently', 'success');
                devLog('Custom view deleted successfully from server');
            } else {
                // Local cleanup already happened, so just warn about server
                showSnackbar('Micro-application cleared locally (server deletion failed)', 'warning');
                devLog('Server deletion failed but local cleanup completed', data.message);
            }
        } catch (error) {
            devLog('Failed to delete custom view from server', error);
            // Local cleanup already happened, so just warn about server
            showSnackbar('Micro-application cleared locally (server unreachable)', 'warning');
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <Box sx={{ 
                    background: designTokens.gradients.primary,
                    borderBottom: `1px solid ${alpha(designTokens.colors.primary, 0.1)}`,
                    py: 2
                }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3 }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Box sx={{
                                width: 40,
                                height: 40,
                                borderRadius: designTokens.radii.lg,
                                background: designTokens.gradients.accent,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                animation: `${pulseGlow} 2s infinite`
                            }}>
                                <AutoAwesomeIcon />
                            </Box>
                            <Box>
                                <Typography variant="h5" fontWeight="600" color="text.primary">
                                    Custom Application Studio
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {project.name} • {viewName}
                                </Typography>
                            </Box>
                        </Stack>
                        
                        <Chip 
                            label={isLocked ? "View Mode" : "Edit Mode"}
                            color={isLocked ? "default" : "primary"}
                            variant="outlined"
                            sx={{
                                borderRadius: designTokens.radii.lg,
                                fontWeight: 500,
                                ...(isLocked ? {} : {
                                    background: alpha(designTokens.colors.primary, 0.1),
                                    borderColor: designTokens.colors.primary,
                                })
                            }}
                        />
                    </Stack>
                </Box>
            }
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
                        top: 100,
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
                        <Tooltip title="Generate New Application" placement="left">
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
                    </Stack>
                </Paper>
                        }}
                    >
                        <Tooltip title="Refresh micro-application">
                            <IconButton
                                onClick={handleRefreshComponent}
                                sx={{
                                    backgroundColor: '#2196f3',
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: '#1976d2',
                                    },
                                }}
                            >
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                        
                        <Tooltip title={isLocked ? 'Unlock working area' : 'Lock working area'}>
                            <IconButton
                                onClick={toggleLock}
                                sx={{
                                    backgroundColor: isLocked ? '#f44336' : '#4caf50',
                                    color: 'white',
                                    '&:hover': {
                                        backgroundColor: isLocked ? '#d32f2f' : '#388e3c',
                                    },
                                }}
                            >
                                {isLocked ? <LockIcon /> : <LockOpenIcon />}
                            </IconButton>
                        </Tooltip>

                        {!isLocked && (
                            <Tooltip title="Clear micro-application">
                                <IconButton
                                    onClick={handleDeleteClick}
                                    sx={{
                                        backgroundColor: '#ff9800',
                                        color: 'white',
                                        '&:hover': {
                                            backgroundColor: '#f57c00',
                                        },
                                    }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>

                    {/* Main Working Area - React Component Renderer */}
                    <Box
                        id="working-area"
                        sx={{
                            width: '100%',
                            m: 0,
                            border: isLocked ? '2px solid #4caf50' : '2px dotted #ffcccb',
                            borderRadius: 3,
                            minHeight: 'calc(100vh - 64px - 12%)',
                            p: componentCode ? 0 : 3, // No padding for components, padding for placeholder
                            backgroundColor: '#fff',
                            boxSizing: 'border-box',
                            position: 'relative',
                            overflow: 'auto',
                        }}
                    >
                        {componentCode ? (
                            <ReactComponentRenderer
                                componentCode={componentCode}
                                project={project}
                                auth={auth}
                                viewName={viewName}
                                onError={handleComponentError}
                                // Pass real data through to the generated component
                                tasks={tasks}
                                allTasks={allTasks}
                                users={users}
                                methodology={methodology}
                            />
                        ) : isLoading ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    flexDirection: 'column',
                                    color: 'text.secondary',
                                }}
                            >
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                                <div>Loading micro-application...</div>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    flexDirection: 'column',
                                    color: 'text.secondary',
                                }}
                            >
                                <ChatIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                                <Box sx={{ textAlign: 'center' }}>
                                    <div>Open the chat to generate a custom micro-application</div>
                                    <div style={{ fontSize: '0.9em', marginTop: '8px' }}>
                                        Try: "Create an expense tracker", "Build a notice board", "Make a timesheet"
                                    </div>
                                    <div style={{ fontSize: '0.8em', marginTop: '16px', fontStyle: 'italic' }}>
                                        {customViewId ? 'Your previous micro-application will be updated' : 'A new micro-application will be created'}
                                    </div>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Floating Chat Button */}
                <Fab
                    color="primary"
                    onClick={() => setAssistantOpen(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1300,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    }}
                    aria-label="Open assistant chat"
                >
                    <ChatIcon />
                </Fab>

                {/* Assistant Chat Dialog */}
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
                />

                {/* Debug: Log what we're passing to AssistantChat */}
                {console.log('[CustomView] Passing to AssistantChat:', {
                    project: project,
                    tasks: tasks,
                    allTasks: allTasks,
                    users: users,
                    methodology: methodology,
                    viewName: viewName,
                    assistantOpen: assistantOpen
                })}

                {/* Snackbar for notifications */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                >
                    <Alert
                        onClose={handleCloseSnackbar}
                        severity={snackbar.severity}
                        variant="filled"
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={deleteConfirmOpen}
                    onClose={handleDeleteCancel}
                    aria-labelledby="delete-dialog-title"
                    aria-describedby="delete-dialog-description"
                >
                    <DialogTitle id="delete-dialog-title">
                        Confirm Deletion
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="delete-dialog-description">
                            {customViewId 
                                ? 'Are you sure you want to permanently delete this custom application? This action cannot be undone.'
                                : 'Are you sure you want to clear the working area? Any unsaved changes will be lost.'
                            }
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleDeleteCancel} color="primary">
                            Cancel
                        </Button>
                        <Button onClick={clearWorkingArea} color="error" variant="contained">
                            {customViewId ? 'Delete Permanently' : 'Clear Area'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </AuthenticatedLayout>
        </>
    );
}
