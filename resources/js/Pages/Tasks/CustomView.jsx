import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Box, Fab, IconButton, Tooltip, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssistantChat from './AssistantChat';
import ReactComponentRenderer from '@/utils/ReactComponentRenderer';
import { csrfFetch } from '@/utils/csrf';

export default function CustomView({ auth, project, viewName }) {
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [componentCode, setComponentCode] = useState('');
    const [customViewId, setCustomViewId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [componentError, setComponentError] = useState(null);

    // Development logging helper
    const devLog = (message, data = null) => {
        if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
            console.log(`[CustomView Debug] ${message}`, data || '');
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
            const response = await csrfFetch(`/projects/${project.id}/custom-views/get?view_name=${viewName || 'default'}`);
            
            // Check if response is actually JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                devLog('Non-JSON response received', {
                    status: response.status,
                    statusText: response.statusText,
                    contentType: contentType,
                    responsePreview: responseText.substring(0, 500)
                });
                throw new Error('Server returned non-JSON response. Check server configuration.');
            }
            
            const data = await response.json();
            devLog('API response received', { success: data.success, hasComponent: !!data.html, customViewId: data.custom_view_id });
            
            if (data.success && data.html) {
                // data.html now contains React component code instead of HTML
                setComponentCode(data.html);
                setCustomViewId(data.custom_view_id);
                devLog('React component code loaded successfully');
                
                showSnackbar('Micro-application loaded successfully', 'success');
            } else {
                devLog('No existing custom view found');
                setComponentCode('');
                setCustomViewId(null);
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
    const handleSpaGenerated = (response) => {
        devLog('SPA generated via assistant', response);
        
        if (response && response.component_code) {
            setComponentCode(response.component_code);
            setCustomViewId(response.custom_view_id);
            showSnackbar('Micro-application generated successfully!', 'success');
            setAssistantOpen(false);
        } else if (response && response.html) {
            // Fallback for old HTML responses - convert to component
            setComponentCode(response.html);
            setCustomViewId(response.custom_view_id);
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
        
        if (!customViewId) {
            // Just clear the local state if no saved view
            setComponentCode('');
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
                throw new Error('Server returned non-JSON response. Check server configuration.');
            }
            
            const data = await response.json();
            devLog('Delete API response', { success: data.success, message: data.message });
            
            if (data.success) {
                setComponentCode('');
                setCustomViewId(null);
                setComponentError(null);
                showSnackbar('Micro-application deleted permanently', 'success');
                devLog('Custom view deleted successfully');
            } else {
                throw new Error(data.message || 'Failed to delete custom view');
            }
        } catch (error) {
            devLog('Failed to delete custom view', error);
            console.error('Failed to delete custom view:', error);
            showSnackbar('Failed to delete micro-application from server', 'error');
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <>
            <Head title={`${viewName} - ${project?.name ?? 'Project'}`} />

            <AuthenticatedLayout user={auth?.user}>
                {/* Wrapper padding prevents margin-collapsing so top/bottom spacing is visible */}
                <Box sx={{ p: '3%', position: 'relative' }}>
                    {/* Lock/Unlock Controls */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 20,
                            right: 20,
                            zIndex: 1200,
                            display: 'flex',
                            gap: 1,
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
                                onError={handleComponentError}
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
                    open={assistantOpen}
                    onClose={() => setAssistantOpen(false)}
                    isCustomView={true}
                    onSpaGenerated={handleSpaGenerated}
                />

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
