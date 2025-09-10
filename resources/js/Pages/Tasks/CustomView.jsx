import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Box,
    Typography,
    Fab,
    Stack,
    Chip,
    alpha,
    useTheme,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';

// Import Board components directly
import Column from '../Board/Column';
import HeaderBanner from '../Board/HeaderBanner';
import { DragDropContext } from 'react-beautiful-dnd';
import { METHODOLOGIES, DEFAULT_METHOD, getStatusMeta, getStatusOrder } from '../Board/meta.jsx';

import AssistantChat from './AssistantChat';

export default function CustomView({ auth, project, tasks, users, viewName, isPro }) {
    const theme = useTheme();
    const [assistantOpen, setAssistantOpen] = useState(false);
    
    // Use default methodology for custom views
    const methodology = DEFAULT_METHOD;
    const STATUS_META = getStatusMeta(methodology);
    const STATUS_ORDER = getStatusOrder(methodology);
    
    // Method styles similar to Board component
    const methodStyles = {
        accent: '#4F46E5',
        gradient: 'linear-gradient(140deg,#F7FAFF 0%,#F2F6FE 55%,#EDF2FA 100%)',
        chipBg: (t) => alpha('#4F46E5', 0.08),
        chipBorder: (t) => alpha('#4F46E5', 0.18),
    };

    const COLUMN_WIDTH = 320;
    const COLUMN_GAP = 12;

    // Convert tasks to the expected format
    const taskState = {
        todo: Array.isArray(tasks.todo) ? tasks.todo : [],
        inprogress: Array.isArray(tasks.inprogress) ? tasks.inprogress : [],
        review: Array.isArray(tasks.review) ? tasks.review : [],
        done: Array.isArray(tasks.done) ? tasks.done : [],
    };

    const totalTasks = Object.values(taskState).reduce((sum, arr) => sum + arr.length, 0);
    const doneCount = taskState.done.length;
    const percentDone = totalTasks === 0 ? 0 : Math.round((doneCount / totalTasks) * 100);

    // Empty drag handler for custom view (read-only)
    const onDragEnd = () => {
        // Custom views are read-only
    };

    return (
        <>
            <Head title={`${viewName} - ${project?.name ?? 'Project'}`} />
            
            <AuthenticatedLayout user={auth?.user}>
                <Box
                    sx={{
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        background: methodStyles.gradient,
                        p: { xs: 1.5, md: 2 },
                    }}
                    style={{ ['--col-w']: `${COLUMN_WIDTH}px`, ['--col-gap']: `${COLUMN_GAP}px` }}
                >
                    {/* Header Banner */}
                    <HeaderBanner
                        projectName={project?.name ?? 'Project'}
                        totalTasks={totalTasks}
                        percentDone={percentDone}
                        usersCount={Array.isArray(users) ? users.length : 0}
                        onAiTasks={() => {}} // Disabled for custom views
                        isPro={isPro}
                        onOpenMembers={() => {}} // Disabled for custom views
                        onOpenAutomations={() => {}} // Disabled for custom views
                        onOpenReport={() => {}} // Disabled for custom views
                        onOpenDetails={() => {}} // Disabled for custom views
                        onOpenAssistant={() => setAssistantOpen(true)}
                    />

                    {/* Custom View Content Container */}
                    <Box
                        sx={{
                            width: '96%', // 100% - 2% margin on each side = 96%
                            mx: 'auto', // centers the container
                            border: '2px dotted #ffcccb', // faint red dotted border
                            borderRadius: 3, // rounded corners
                            p: 3,
                            background: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(10px)',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        {/* Custom View Header */}
                        <Box sx={{ mb: 3 }}>
                            <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                                <Typography 
                                    variant="h4" 
                                    component="h1" 
                                    sx={{ 
                                        fontWeight: 700,
                                        color: 'primary.main',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    {viewName}
                                </Typography>
                                <Chip
                                    icon={<FlagRoundedIcon fontSize="small" />}
                                    label="Custom View"
                                    size="small"
                                    sx={{
                                        fontWeight: 600,
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                    }}
                                />
                            </Stack>
                            <Typography 
                                variant="subtitle1" 
                                sx={{ 
                                    color: 'text.secondary',
                                    fontWeight: 500 
                                }}
                            >
                                Custom view for {project?.name} • {totalTasks} tasks • {percentDone}% complete
                            </Typography>
                        </Box>

                        {/* Board Columns */}
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'stretch',
                                    gap: 'var(--col-gap)',
                                    pb: 3,
                                    overflowX: 'auto',
                                    overflowY: 'hidden',
                                    scrollSnapType: 'x proximity',
                                    '&::-webkit-scrollbar': { height: 8 },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: alpha('#000', 0.2),
                                        borderRadius: 8,
                                    },
                                }}
                            >
                                {STATUS_ORDER.map((statusKey) => (
                                    <Column
                                        key={statusKey}
                                        statusKey={statusKey}
                                        tasks={taskState[statusKey] || []}
                                        onAddTask={() => {}} // Disabled for custom views
                                        statusMeta={STATUS_META}
                                        project={project}
                                        showProjectSummary={false}
                                        renderTaskCard={(task, dragSnapshot) => (
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    background: 'rgba(255, 255, 255, 0.9)',
                                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                    cursor: 'default', // Read-only
                                                }}
                                            >
                                                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                                                    {task.title}
                                                </Typography>
                                                {task.description && (
                                                    <Typography 
                                                        variant="body2" 
                                                        color="text.secondary"
                                                        sx={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                        }}
                                                    >
                                                        {task.description}
                                                    </Typography>
                                                )}
                                                {task.assignee && (
                                                    <Chip
                                                        label={task.assignee.name}
                                                        size="small"
                                                        sx={{
                                                            mt: 1,
                                                            fontSize: '0.75rem',
                                                            height: 24,
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        )}
                                    />
                                ))}
                            </Box>
                        </DragDropContext>
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
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                                transform: 'scale(1.1)',
                                boxShadow: '0 12px 40px rgba(102, 126, 234, 0.6)',
                            },
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <ChatIcon />
                    </Fab>

                    {/* Assistant Chat */}
                    <AssistantChat
                        project={project}
                        open={assistantOpen}
                        onClose={() => setAssistantOpen(false)}
                    />
                </Box>
            </AuthenticatedLayout>
        </>
    );
}