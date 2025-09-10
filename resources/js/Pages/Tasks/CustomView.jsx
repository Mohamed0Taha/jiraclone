import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Box, Fab, IconButton, Tooltip, Alert, Snackbar } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import AssistantChat from './AssistantChat';

export default function CustomView({ auth, project, viewName }) {
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [workingAreaContent, setWorkingAreaContent] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const toggleLock = () => {
        setIsLocked(!isLocked);
        setSnackbar({
            open: true,
            message: isLocked ? 'Working area unlocked' : 'Working area locked',
            severity: 'info'
        });
    };

    const clearWorkingArea = () => {
        setWorkingAreaContent('');
        setSnackbar({
            open: true,
            message: 'Working area cleared',
            severity: 'success'
        });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleSpaGenerated = (htmlContent) => {
        setWorkingAreaContent(htmlContent);
        setSnackbar({
            open: true,
            message: 'Custom application generated successfully!',
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
