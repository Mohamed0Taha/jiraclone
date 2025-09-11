import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Box, Fab, IconButton, Tooltip, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import AssistantChat from './AssistantChat';
import { enhanceGeneratedHTML } from '@/utils/htmlEnhancer';
import { csrfFetch } from '@/utils/csrf';

export default function CustomView({ auth, project, viewName }) {
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [workingAreaContent, setWorkingAreaContent] = useState('');
    const [customViewId, setCustomViewId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    // Development logging helper
    const devLog = (message, data = null) => {
        if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
            console.log(`[CustomView Debug] ${message}`, data || '');
        }
    };

    // Periodic save to prevent data loss
    useEffect(() => {
        if (workingAreaContent && !isLocked) {
            devLog('Setting up periodic save for working area content');
            const saveInterval = setInterval(() => {
                const backupKey = `spa-backup-${project?.id || 'unknown'}-${viewName || 'default'}`;
                const backupData = {
                    content: workingAreaContent,
                    timestamp: new Date().toISOString(),
                    customViewId,
                    projectId: project?.id,
                    viewName: viewName || 'default'
                };
                localStorage.setItem(backupKey, JSON.stringify(backupData));
                devLog('Auto-saved working area content to local storage');
            }, 30000); // Save every 30 seconds

            return () => {
                clearInterval(saveInterval);
                devLog('Cleared periodic save interval');
            };
        }
    }, [workingAreaContent, isLocked, project?.id, viewName, customViewId]);

    // Load existing custom view on component mount
    useEffect(() => {
        devLog('Component mounting, loading existing custom view', { projectId: project?.id, viewName });
        loadExistingCustomView();
    }, [project?.id, viewName]);

    const loadExistingCustomView = async () => {
        if (!project?.id) {
            devLog('No project ID available, skipping load');
            return;
        }

        try {
            setIsLoading(true);
            devLog('Loading custom view from API', { projectId: project.id, viewName: viewName || 'default' });
            
            // Use API endpoint with proper CSRF handling
            const response = await csrfFetch(`/api/projects/${project.id}/custom-views/get?view_name=${viewName || 'default'}`);
            
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
                console.error('Non-JSON response received:', {
                    status: response.status,
                    statusText: response.statusText,
                    contentType: contentType,
                    responsePreview: responseText.substring(0, 500)
                });
                throw new Error('Server returned non-JSON response. Check server configuration.');
            }
            
            const data = await response.json();
            devLog('API response received', { success: data.success, hasHtml: !!data.html, customViewId: data.custom_view_id });
            
            if (data.success && data.html) {
                try {
                    // Enhance the loaded HTML with additional JavaScript functionality
                    const enhancedHTML = enhanceGeneratedHTML ? enhanceGeneratedHTML(data.html) : data.html;
                    setWorkingAreaContent(enhancedHTML);
                    devLog('HTML content set and enhanced');
                } catch (error) {
                    devLog('Failed to enhance loaded HTML, using original', error);
                    console.warn('Failed to enhance loaded HTML, using original:', error);
                    setWorkingAreaContent(data.html);
                }
                
                setCustomViewId(data.custom_view_id);
                setSnackbar({
                    open: true,
                    message: 'Custom view loaded successfully!',
                    severity: 'success'
                });
                devLog('Custom view loaded successfully', { customViewId: data.custom_view_id });
            } else if (data.success === false && data.message) {
                // Custom view doesn't exist, check for local backup
                devLog('No existing custom view found, checking for local backup');
                const backupKey = `spa-backup-${project.id}-${viewName || 'default'}`;
                const backup = localStorage.getItem(backupKey);
                
                if (backup) {
                    try {
                        const backupData = JSON.parse(backup);
                        if (backupData.content) {
                            setWorkingAreaContent(backupData.content);
                            setSnackbar({
                                open: true,
                                message: 'Restored from local backup. Consider saving your work.',
                                severity: 'warning'
                            });
                            devLog('Restored content from local backup', { 
                                timestamp: backupData.timestamp,
                                hasCustomViewId: !!backupData.customViewId 
                            });
                        }
                    } catch (e) {
                        devLog('Failed to parse backup data', e);
                    }
                } else {
                    devLog('No backup found either');
                    console.log('No existing custom view found:', data.message);
                }
            }
        } catch (error) {
            devLog('Failed to load custom view', error);
            console.error('Failed to load custom view:', error);
            
            // Try to restore from backup on error
            const backupKey = `spa-backup-${project.id}-${viewName || 'default'}`;
            const backup = localStorage.getItem(backupKey);
            
            if (backup) {
                try {
                    const backupData = JSON.parse(backup);
                    if (backupData.content) {
                        setWorkingAreaContent(backupData.content);
                        setSnackbar({
                            open: true,
                            message: 'Server unavailable. Restored from local backup.',
                            severity: 'warning'
                        });
                        devLog('Restored content from backup due to server error');
                    }
                } catch (e) {
                    devLog('Failed to restore from backup', e);
                }
            }
            
            // Only show error message if it's not a "no view found" case
            if (error.message && !error.message.includes('No custom view found') && !backup) {
                setSnackbar({
                    open: true,
                    message: 'Failed to load existing custom view. You can still create a new one.',
                    severity: 'info'
                });
            }
        } finally {
            setIsLoading(false);
            devLog('Loading process completed');
        }
    };

    const toggleLock = () => {
        devLog('Toggling lock state', { currentlyLocked: isLocked });
        setIsLocked(!isLocked);
        setSnackbar({
            open: true,
            message: isLocked ? 'Working area unlocked' : 'Working area locked',
            severity: 'info'
        });
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
            setWorkingAreaContent('');
            setSnackbar({
                open: true,
                message: 'Working area cleared',
                severity: 'success'
            });
            devLog('Local working area cleared (no saved view)');
            return;
        }

        try {
            devLog('Deleting custom view from server', { projectId: project.id, viewName: viewName || 'default', customViewId });
            
            // Use API endpoint with proper CSRF handling
            const response = await csrfFetch(`/api/projects/${project.id}/custom-views/delete?view_name=${viewName || 'default'}`, {
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
                console.error('Non-JSON response received:', {
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
                setWorkingAreaContent('');
                setCustomViewId(null);
                setSnackbar({
                    open: true,
                    message: 'Custom view deleted permanently',
                    severity: 'success'
                });
                devLog('Custom view deleted successfully');
            } else {
                throw new Error(data.message || 'Failed to delete custom view');
            }
        } catch (error) {
            devLog('Failed to delete custom view', error);
            console.error('Failed to delete custom view:', error);
            setSnackbar({
                open: true,
                message: 'Failed to delete custom view from server',
                severity: 'error'
            });
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleSpaGenerated = (htmlContent, responseData = {}) => {
        devLog('SPA generated, processing content', { 
            contentLength: htmlContent?.length, 
            hasResponseData: !!responseData,
            isUpdate: responseData.is_update,
            customViewId: responseData.custom_view_id 
        });
        
        try {
            // Enhance the HTML with additional JavaScript functionality
            const enhancedHTML = enhanceGeneratedHTML ? enhanceGeneratedHTML(htmlContent) : htmlContent;
            setWorkingAreaContent(enhancedHTML);
            devLog('HTML content enhanced and set');
        } catch (error) {
            devLog('Failed to enhance HTML, using original', error);
            console.warn('Failed to enhance HTML, using original:', error);
            setWorkingAreaContent(htmlContent);
        }
        
        // Update custom view ID if provided
        if (responseData.custom_view_id) {
            setCustomViewId(responseData.custom_view_id);
            devLog('Custom view ID updated', { customViewId: responseData.custom_view_id });
        }
        
        const message = responseData.is_update 
            ? 'Custom application updated successfully!' 
            : 'Custom application generated successfully!';
            
        setSnackbar({
            open: true,
            message,
            severity: 'success'
        });
        devLog('SPA generation completed successfully', { isUpdate: responseData.is_update });
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
                            <Tooltip title="Clear working area">
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

                    <Box
                        id="working-area"
                        sx={{
                            width: '100%',
                            m: 0,
                            border: isLocked ? '2px solid #4caf50' : '2px dotted #ffcccb',
                            borderRadius: 3,
                            minHeight: 'calc(100vh - 64px - 12%)',
                            p: 3,
                            backgroundColor: '#fff',
                            boxSizing: 'border-box',
                            position: 'relative',
                            overflow: 'auto',
                        }}
                    >
                        {workingAreaContent ? (
                            <Box
                                dangerouslySetInnerHTML={{ __html: workingAreaContent }}
                                sx={{ width: '100%', height: '100%' }}
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
                                <div>Loading custom view...</div>
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
                                    <div>Open the chat to generate a custom SPA application</div>
                                    <div style={{ fontSize: '0.9em', marginTop: '8px' }}>
                                        Try: "Create an expense tracker", "Build a vendor phonebook", "Make a project wiki"
                                    </div>
                                    <div style={{ fontSize: '0.8em', marginTop: '16px', fontStyle: 'italic' }}>
                                        {customViewId ? 'Your previous custom view will be updated' : 'A new custom application will be created'}
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
