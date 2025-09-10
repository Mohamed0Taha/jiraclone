import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Box, Fab } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import AssistantChat from './AssistantChat';

export default function CustomView({ auth, project, viewName }) {
    const [assistantOpen, setAssistantOpen] = useState(false);

    return (
        <>
            <Head title={`${viewName} - ${project?.name ?? 'Project'}`} />

            <AuthenticatedLayout user={auth?.user}>
                {/* Wrapper padding prevents margin-collapsing so top/bottom spacing is visible */}
                <Box sx={{ p: '3%' }}>
                    <Box
                        id="working-area"
                        sx={{
                            width: '100%',
                            m: 0,
                            border: '2px dotted #ffcccb', // faint red dotted line
                            borderRadius: 3,
                            minHeight: 'calc(100vh - 64px - 12%)',
                            p: 3,
                            backgroundColor: '#fff',
                            boxSizing: 'border-box',
                        }}
                    />
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
                />
            </AuthenticatedLayout>
        </>
    );
}
