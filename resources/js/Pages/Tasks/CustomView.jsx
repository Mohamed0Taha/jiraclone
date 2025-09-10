import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Box, Fab, IconButton, Tooltip, Alert, Snackbar } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import AssistantChat from './AssistantChat';
import { enhanceGeneratedHTML } from '@/utils/htmlEnhancer';

export default function CustomView({ auth, project, viewName }) {
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [workingAreaContent, setWorkingAreaContent] = useState('');
    const [customViewId, setCustomViewId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    // Load existing custom view on component mount
    useEffect(() => {
        loadExistingCustomView();
    }, [project?.id, viewName]);

    const loadExistingCustomView = async () => {
        if (!project?.id) return;

        try {
            setIsLoading(true);
            const response = await fetch(`/projects/${project.id}/custom-views/get?view_name=${viewName || 'default'}`, {
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            
            const data = await response.json();
            
            if (data.success && data.html) {
                try {
                    // Enhance the loaded HTML with additional JavaScript functionality
                    const enhancedHTML = enhanceGeneratedHTML ? enhanceGeneratedHTML(data.html) : data.html;
                    setWorkingAreaContent(enhancedHTML);
                } catch (error) {
                    console.warn('Failed to enhance loaded HTML, using original:', error);
                    setWorkingAreaContent(data.html);
                }
                
                setCustomViewId(data.custom_view_id);
                setSnackbar({
                    open: true,
                    message: 'Custom view loaded successfully!',
                    severity: 'success'
                });
            }
        } catch (error) {
            console.error('Failed to load custom view:', error);
            setSnackbar({
                open: true,
                message: 'Failed to load existing custom view.',
                severity: 'warning'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleLock = () => {
        setIsLocked(!isLocked);
        setSnackbar({
            open: true,
            message: isLocked ? 'Working area unlocked' : 'Working area locked',
            severity: 'info'
        });
    };

    const clearWorkingArea = async () => {
        if (!customViewId) {
            // Just clear the local state if no saved view
            setWorkingAreaContent('');
            setSnackbar({
                open: true,
                message: 'Working area cleared',
                severity: 'success'
            });
            return;
        }

        try {
            const response = await fetch(`/projects/${project.id}/custom-views/delete?view_name=${viewName || 'default'}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Content-Type': 'application/json',
                },
            });
            
            const data = await response.json();
            
            if (data.success) {
                setWorkingAreaContent('');
                setCustomViewId(null);
                setSnackbar({
                    open: true,
                    message: 'Custom view deleted permanently',
                    severity: 'success'
                });
            } else {
                throw new Error(data.message || 'Failed to delete custom view');
            }
        } catch (error) {
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
        try {
            // Enhance the HTML with additional JavaScript functionality
            const enhancedHTML = enhanceGeneratedHTML ? enhanceGeneratedHTML(htmlContent) : htmlContent;
            setWorkingAreaContent(enhancedHTML);
        } catch (error) {
            console.warn('Failed to enhance HTML, using original:', error);
            setWorkingAreaContent(htmlContent);
        }
        
        // Update custom view ID if provided
        if (responseData.custom_view_id) {
            setCustomViewId(responseData.custom_view_id);
        }
        
        const message = responseData.is_update 
            ? 'Custom application updated successfully!' 
            : 'Custom application generated successfully!';
            
        setSnackbar({
            open: true,
            message,
            severity: 'success'
        });
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
                                    onClick={clearWorkingArea}
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
            </AuthenticatedLayout>
        </>
    );
}
