import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Box,
    Card,
    CardContent,
    Typography,
    LinearProgress,
    Chip,
    Stack,
    Button,
    Divider,
    Alert,
    AlertTitle,
} from '@mui/material';
import {
    AutoAwesome as AutoAwesomeIcon,
    Analytics as AnalyticsIcon,
    Assignment as AssignmentIcon,
    Message as MessageIcon,
    Schedule as ScheduleIcon,
    CheckCircle as CheckCircleIcon,
    PlayArrow as PlayArrowIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';

export default function AutopilotOverlay({ open, onClose, projectId, onComplete }) {
    console.log('AutopilotOverlay props:', { open, projectId, onComplete });
    const [isRunning, setIsRunning] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [steps, setSteps] = useState([]);
    const [isComplete, setIsComplete] = useState(false);
    const [changesSummary, setChangesSummary] = useState({});

    const autopilotSteps = [
        {
            id: 'analyze',
            title: 'Analyzing Current State',
            description: 'Scanning all tasks, team members, and project health',
            icon: AnalyticsIcon,
            color: '#2196f3',
        },
        {
            id: 'optimize_priorities',
            title: 'Optimizing Task Priorities',
            description: 'Reordering tasks based on deadlines and importance',
            icon: AssignmentIcon,
            color: '#ff9800',
        },
        {
            id: 'assign_tasks',
            title: 'Assigning Unassigned Tasks',
            description: 'Distributing workload across team members',
            icon: AssignmentIcon,
            color: '#4caf50',
        },
        {
            id: 'request_updates',
            title: 'Requesting Status Updates',
            description: 'Asking team members for progress on active tasks',
            icon: MessageIcon,
            color: '#9c27b0',
        },
        {
            id: 'optimize_timeline',
            title: 'Optimizing Timeline',
            description: 'Extending overdue deadlines and adjusting schedules',
            icon: ScheduleIcon,
            color: '#f44336',
        },
        {
            id: 'break_down_tasks',
            title: 'Breaking Down Large Tasks',
            description: 'Splitting complex tasks into manageable subtasks',
            icon: AssignmentIcon,
            color: '#00bcd4',
        },
    ];

    const appUrl = (typeof window !== 'undefined' && window.Laravel && window.Laravel.appUrl) || (document.querySelector('meta[name="app-url"]')?.getAttribute('content')) || '';
    const [autopilotEnabled, setAutopilotEnabled] = useState(false);
    const [statusStep, setStatusStep] = useState(null);

    const handleStartAutopilot = async () => {
        console.log('Starting AI Autopilot session...');
        setIsRunning(true);
        setCurrentStepIndex(0);
        setIsComplete(false);
        setChangesSummary({});
        setSteps(autopilotSteps.map(s => ({ ...s, progress: 0, status: 'pending', result: null })));

        try {
            // Start the autopilot session first
            const startUrl = `${appUrl}/projects/${projectId}/autopilot/start`;
            console.log('Starting autopilot with URL:', startUrl, 'projectId:', projectId);
            await axios.post(
                startUrl,
                {},
                {
                    withCredentials: true,
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'Accept': 'application/json',
                    },
                }
            );
            console.log('Autopilot session started successfully');

            // Execute steps sequentially
            const summaryAccumulator = [];
            for (let i = 0; i < autopilotSteps.length; i++) {
                setCurrentStepIndex(i);
                const stepResult = await executeStep(autopilotSteps[i], i);
                if (stepResult) {
                    summaryAccumulator.push({ id: autopilotSteps[i].id, result: stepResult });
                }
            }

            // Collect summary of changes
            const summary = {};
            summaryAccumulator.forEach(({ id, result }) => {
                summary[id] = result;
            });
            setChangesSummary(summary);

            setIsComplete(true);
            setIsRunning(false);

            // Call completion callback to trigger project reload
            if (onComplete) {
                onComplete(summary);
            }
        } catch (error) {
            console.error('Failed to start autopilot session:', error);
            setIsRunning(false);
            // Show error to user
            setSteps(prev => prev.map(step => ({ ...step, status: 'error', error: 'Failed to start autopilot session' })));
        }
    };

    // Start autopilot in standby (do not run optimization immediately)
    const handleStartStandby = async () => {
        try {
            const startUrl = `${appUrl}/projects/${projectId}/autopilot/start`;
            await axios.post(startUrl, {}, {
                withCredentials: true,
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json',
                },
            });
            setAutopilotEnabled(true);
            setStatusStep('done'); // treat as standby
            // Switch panel to active state (no auto-run)
            setIsRunning(false);
            setCurrentStepIndex(0);
            setSteps([]);
            setIsComplete(false);
            setChangesSummary({});
        } catch (e) {
            console.error('Failed to start autopilot (standby):', e);
        }
    };

    const handleOptimizeNow = async () => {
        console.log('Optimizing now...');
        setIsRunning(true);
        setCurrentStepIndex(0);
        setIsComplete(false);
        setChangesSummary({});
        setSteps(autopilotSteps.map(s => ({ ...s, progress: 0, status: 'pending', result: null })));

        const summaryAccumulator = [];
        for (let i = 0; i < autopilotSteps.length; i++) {
            setCurrentStepIndex(i);
            const stepResult = await executeStep(autopilotSteps[i], i);
            if (stepResult) summaryAccumulator.push({ id: autopilotSteps[i].id, result: stepResult });
        }
        const summary = {};
        summaryAccumulator.forEach(({ id, result }) => { summary[id] = result; });
        setChangesSummary(summary);
        setIsComplete(true);
        setIsRunning(false);
        onComplete?.(summary);
    };

    const executeStep = async (step, index) => {
        console.log(`Starting execution of step: ${step.id}`);
        // Update step to in_progress
        setSteps(prev => prev.map((s, i) => 
            i === index ? { ...s, status: 'in_progress', progress: 0 } : s
        ));

        let result = null;
        try {
            // Simulate progress animation
            for (let progress = 0; progress <= 100; progress += 20) {
                await new Promise(resolve => setTimeout(resolve, 500));
                setSteps(prev => prev.map((s, i) => 
                    i === index ? { ...s, progress } : s
                ));
            }

            console.log(`Making API call for step: ${step.id}`);
            // Execute the actual backend action
            const execUrl = `${appUrl}/projects/${projectId}/autopilot/execute`;
            const response = await axios.post(
                execUrl,
                { action_type: step.id },
                {
                    withCredentials: true,
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'Accept': 'application/json',
                    },
                }
            );

            result = response.data;
            console.log(`Step ${step.id} completed with result:`, result);

            // Mark step as completed
            setSteps(prev => prev.map((s, i) => 
                i === index ? { ...s, status: 'completed', progress: 100, result } : s
            ));

        } catch (error) {
            console.error(`Failed to execute step ${step.id}:`, error);
            // Log more details
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            } else if (error.request) {
                console.error('No response received:', error.request);
            } else {
                console.error('Request setup error:', error.message);
            }
            setSteps(prev => prev.map((s, i) => 
                i === index ? { ...s, status: 'error', progress: 100, error: error.message } : s
            ));
        }

        // Wait a bit before next step
        await new Promise(resolve => setTimeout(resolve, 500));
        return result;
    };

    useEffect(() => {
        async function fetchStatus() {
            try {
                const res = await fetch(`${appUrl}/projects/${projectId}/autopilot/status`, { credentials: 'same-origin' });
                if (res.ok) {
                    const data = await res.json();
                    const enabled = !!(data && (data.enabled || data.autopilot_enabled));
                    const step = data.step || (data.status && data.status.step) || null;
                    setAutopilotEnabled(enabled);
                    setStatusStep(step);
                }
            } catch (e) {}
        }
        if (open) {
            // Reset state when opening
            setIsRunning(false);
            setCurrentStepIndex(0);
            setSteps([]);
            setIsComplete(false);
            setChangesSummary({});
            if (projectId) fetchStatus();
        }
    }, [open, projectId]);


    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                }
            }}
        >
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <AutoAwesomeIcon sx={{ fontSize: 28 }} />
                    <Typography variant="h5" fontWeight="bold">
                        {isComplete ? 'AI Autopilot Complete' : isRunning ? 'AI Autopilot Running' : 'AI Autopilot'}
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                    {isComplete 
                        ? 'Optimization completed! Review the results below.'
                        : isRunning
                        ? 'Optimizing your project workflow autonomously'
                        : 'Ready to optimize your project with AI'
                    }
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                <Box sx={{ p: 3 }}>
                    {/* Control panel when idle */}
                    {!isRunning && !isComplete && (
                        <Card sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
                            <CardContent sx={{ py: 6 }}>
                                <AutoAwesomeIcon sx={{ fontSize: 64, mb: 3, opacity: 0.8 }} />
                                {autopilotEnabled ? (
                                    <>
                                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                                            Autopilot Active
                                        </Typography>
                                        <Typography variant="body1" sx={{ opacity: 0.8, mb: 4, maxWidth: 560, mx: 'auto' }}>
                                            Autopilot is managing this project autonomously. You can trigger a fresh optimization pass any time.
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            startIcon={<PlayArrowIcon />}
                                            onClick={handleOptimizeNow}
                                            sx={{
                                                background: 'linear-gradient(45deg, #FF6B35 30%, #F7931E 90%)',
                                                color: 'white',
                                                px: 4,
                                                py: 1.5,
                                                fontSize: '1.1rem',
                                                fontWeight: 'bold',
                                                boxShadow: '0 3px 5px 2px rgba(255, 107, 53, .35)',
                                                '&:hover': {
                                                    background: 'linear-gradient(45deg, #e55a2b 30%, #e8841a 90%)',
                                                }
                                            }}
                                        >
                                            Optimize Now
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                                            AI Autopilot Ready
                                        </Typography>
                                        <Typography variant="body1" sx={{ opacity: 0.8, mb: 4, maxWidth: 500, mx: 'auto' }}>
                                            Let AI autonomously optimize your project by analyzing tasks, adjusting priorities, distributing workload, requesting updates, and fixing timelines.
                                        </Typography>
                                        <Stack direction="row" spacing={2} justifyContent="center">
                                            <Button
                                                variant="outlined"
                                                size="large"
                                                onClick={handleStartStandby}
                                                sx={{
                                                    color: 'white',
                                                    borderColor: 'rgba(255,255,255,0.6)',
                                                    px: 3,
                                                    py: 1.2,
                                                    fontWeight: 'bold',
                                                    '&:hover': { borderColor: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.08)' }
                                                }}
                                            >
                                                Start Autopilot (Standby)
                                            </Button>
                                            <Button
                                                variant="contained"
                                                size="large"
                                                startIcon={<PlayArrowIcon />}
                                                onClick={handleStartAutopilot}
                                                sx={{
                                                    background: 'linear-gradient(45deg, #4caf50 30%, #8bc34a 90%)',
                                                    color: 'white',
                                                    px: 3.5,
                                                    py: 1.2,
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                                                    '&:hover': { background: 'linear-gradient(45deg, #45a049 30%, #7cb342 90%)' }
                                                }}
                                            >
                                                Start & Optimize Now
                                            </Button>
                                        </Stack>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Steps Progress - Show when running or complete */}
                    {(isRunning || isComplete) && steps.length > 0 && (
                        <Card sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight="bold" mb={3}>
                                    {isComplete ? 'Optimization Complete' : 'Optimization Progress'}
                                </Typography>
                                
                                <Stack spacing={2}>
                                    {steps.map((step, index) => {
                                        const IconComponent = step.icon;
                                        const isCurrentStep = index === currentStepIndex && isRunning;
                                        const isCompleted = step.status === 'completed';
                                        const isPending = step.status === 'pending';
                                        const isError = step.status === 'error';

                                        return (
                                            <Card 
                                                key={step.id}
                                                variant="outlined"
                                                sx={{ 
                                                    backgroundColor: isCurrentStep ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                    border: isCurrentStep ? `2px solid ${step.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                                                    opacity: isPending ? 0.6 : 1
                                                }}
                                            >
                                                <CardContent sx={{ pb: '16px !important' }}>
                                                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                                                        <Box 
                                                            sx={{ 
                                                                backgroundColor: step.color, 
                                                                borderRadius: '50%', 
                                                                p: 1,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                opacity: isPending ? 0.5 : 1
                                                            }}
                                                        >
                                                            {isCompleted ? (
                                                                <CheckCircleIcon sx={{ color: 'white', fontSize: 24 }} />
                                                            ) : (
                                                                <IconComponent sx={{ color: 'white', fontSize: 24 }} />
                                                            )}
                                                        </Box>
                                                        <Box flex={1}>
                                                            <Typography variant="subtitle1" fontWeight="bold">
                                                                {step.title}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ opacity: 0.8, fontSize: '0.875rem' }}>
                                                                {step.description}
                                                            </Typography>
                                                        </Box>
                                                        <Chip
                                                            label={
                                                                isCompleted ? 'Completed' :
                                                                isCurrentStep ? 'Running' :
                                                                isError ? 'Error' : 'Pending'
                                                            }
                                                            size="small"
                                                            sx={{ 
                                                                backgroundColor: isCompleted ? '#4caf50' :
                                                                               isCurrentStep ? step.color :
                                                                               isError ? '#f44336' : 'rgba(255, 255, 255, 0.2)',
                                                                color: 'white',
                                                                fontWeight: 'bold'
                                                            }}
                                                        />
                                                    </Box>

                                                    {/* Progress Bar */}
                                                    {(isCurrentStep || isCompleted) && (
                                                        <Box mt={2}>
                                                            <Box display="flex" justifyContent="space-between" mb={0.5}>
                                                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                                                    Progress
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                                                    {step.progress}%
                                                                </Typography>
                                                            </Box>
                                                            <LinearProgress 
                                                                variant="determinate" 
                                                                value={step.progress}
                                                                sx={{ 
                                                                    height: 6, 
                                                                    borderRadius: 3,
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                                    '& .MuiLinearProgress-bar': {
                                                                        backgroundColor: step.color,
                                                                        borderRadius: 3
                                                                    }
                                                                }}
                                                            />
                                                        </Box>
                                                    )}

                                                    {/* Result Info */}
                                                    {step.result && (
                                                        <Box mt={2} p={2} sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
                                                            <Typography variant="body2" fontWeight="bold" gutterBottom>
                                                                ✅ {step.result.message || 'Completed successfully'}
                                                            </Typography>
                                                            {step.result.tasks_affected > 0 && (
                                                                <Typography variant="caption" display="block">
                                                                    • {step.result.tasks_affected} tasks processed
                                                                </Typography>
                                                            )}
                                                            {step.result.tasks_assigned > 0 && (
                                                                <Typography variant="caption" display="block">
                                                                    • {step.result.tasks_assigned} tasks assigned
                                                                </Typography>
                                                            )}
                                                            {step.result.requests_sent > 0 && (
                                                                <Typography variant="caption" display="block">
                                                                    • {step.result.requests_sent} update requests sent
                                                                </Typography>
                                                            )}
                                                            {step.result.tasks_updated > 0 && (
                                                                <Typography variant="caption" display="block">
                                                                    • {step.result.tasks_updated} deadlines extended
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    )}

                                                    {/* Error Info */}
                                                    {step.error && (
                                                        <Alert severity="error" sx={{ mt: 2 }}>
                                                            {step.error}
                                                        </Alert>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </Stack>

                                {/* Final Summary */}
                                {isComplete && (
                                    <Box mt={4}>
                                        <Divider sx={{ my: 3, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                                        <Alert severity="success" sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', color: 'white', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                                            <AlertTitle fontWeight="bold">✨ AI Autopilot Complete!</AlertTitle>
                                            <Typography variant="body2" gutterBottom>
                                                Your project has been successfully optimized. Here's what was accomplished:
                                            </Typography>
                                            <Box mt={2}>
                                                {/* Show all actions with their results */}
                                                {Object.entries(changesSummary).map(([actionId, result]) => {
                                                    if (actionId === 'analyze') {
                                                        return (
                                                            <Typography key={actionId} variant="body2" display="block" sx={{ mt: 1 }}>
                                                                • <strong>Project Analysis:</strong> {result.analysis?.total_tasks || 0} tasks analyzed, health rating: <strong>{result.analysis?.project_health || 'unknown'}</strong>
                                                            </Typography>
                                                        );
                                                    } else if (actionId === 'optimize_priorities') {
                                                        if (result.skipped) {
                                                            return (
                                                                <Typography key={actionId} variant="body2" display="block" sx={{ mt: 1 }}>
                                                                    • <strong>Priority Optimization:</strong> Already optimized in this session
                                                                </Typography>
                                                            );
                                                        } else if (result.priority_changes && result.priority_changes.length > 0) {
                                                            return (
                                                                <Typography key={actionId} variant="body2" display="block" sx={{ mt: 1 }}>
                                                                    • <strong>{result.tasks_affected} task priorities</strong> optimized:
                                                                    {result.priority_changes.slice(0, 3).map((change, idx) => (
                                                                        <Typography key={idx} variant="caption" display="block" sx={{ ml: 3, mt: 0.5 }}>
                                                                            "{change.task_title}" → {change.old_priority} to {change.new_priority}
                                                                        </Typography>
                                                                    ))}
                                                                    {result.priority_changes.length > 3 && (
                                                                        <Typography variant="caption" display="block" sx={{ ml: 3, mt: 0.5 }}>
                                                                            ...and {result.priority_changes.length - 3} more
                                                                        </Typography>
                                                                    )}
                                                                </Typography>
                                                            );
                                                        } else {
                                                            return (
                                                                <Typography key={actionId} variant="body2" display="block" sx={{ mt: 1 }}>
                                                                    • <strong>Priority Optimization:</strong> All task priorities are already optimal
                                                                </Typography>
                                                            );
                                                        }
                                                    } else if (actionId === 'assign_tasks') {
                                                        if (result.task_assignments && result.task_assignments.length > 0) {
                                                            return (
                                                                <Typography key={actionId} variant="body2" display="block" sx={{ mt: 1 }}>
                                                                    • <strong>{result.tasks_assigned} tasks</strong> assigned to team members:
                                                                    {result.task_assignments.slice(0, 3).map((assignment, idx) => (
                                                                        <Typography key={idx} variant="caption" display="block" sx={{ ml: 3, mt: 0.5 }}>
                                                                            "{assignment.task_title}" → {assignment.assignee_name}
                                                                        </Typography>
                                                                    ))}
                                                                    {result.task_assignments.length > 3 && (
                                                                        <Typography variant="caption" display="block" sx={{ ml: 3, mt: 0.5 }}>
                                                                            ...and {result.task_assignments.length - 3} more
                                                                        </Typography>
                                                                    )}
                                                                </Typography>
                                                            );
                                                        } else {
                                                            return (
                                                                <Typography key={actionId} variant="body2" display="block" sx={{ mt: 1 }}>
                                                                    • <strong>Task Assignment:</strong> All tasks are already assigned to team members
                                                                </Typography>
                                                            );
                                                        }
                                                    } else if (actionId === 'request_updates') {
                                                        if (result.update_requests && result.update_requests.length > 0) {
                                                            return (
                                                                <Typography key={actionId} variant="body2" display="block" sx={{ mt: 1 }}>
                                                                    • <strong>{result.requests_sent} status update requests</strong> sent to team members
                                                                </Typography>
                                                            );
                                                        } else {
                                                            return (
                                                                <Typography key={actionId} variant="body2" display="block" sx={{ mt: 1 }}>
                                                                    • <strong>Status Updates:</strong> Update requests sent recently or no active tasks to update
                                                                </Typography>
                                                            );
                                                        }
                                                    } else if (actionId === 'analyze_timeline') {
                                                        if (result.timeline_changes && result.timeline_changes.length > 0) {
                                                            return (
                                                                <Typography key={actionId} variant="body2" display="block" sx={{ mt: 1 }}>
                                                                    • <strong>{result.tasks_updated} timeline optimizations</strong> made:
                                                                    {result.timeline_changes.slice(0, 3).map((change, idx) => {
                                                                        if (change.change_type === 'deadline_adjusted') {
                                                                            return (
                                                                                <Typography key={idx} variant="caption" display="block" sx={{ ml: 3, mt: 0.5 }}>
                                                                                    "{change.task_title}" deadline adjusted to {change.new_deadline}
                                                                                </Typography>
                                                                            );
                                                                        } else if (change.change_type === 'start_added') {
                                                                            return (
                                                                                <Typography key={idx} variant="caption" display="block" sx={{ ml: 3, mt: 0.5 }}>
                                                                                    "{change.task_title}" start date set to {change.start}
                                                                                </Typography>
                                                                            );
                                                                        } else if (change.change_type === 'duration_normalized') {
                                                                            return (
                                                                                <Typography key={idx} variant="caption" display="block" sx={{ ml: 3, mt: 0.5 }}>
                                                                                    "{change.task_title}" duration normalized to {change.new_end_date}
                                                                                </Typography>
                                                                            );
                                                                        } else if (change.change_type === 'dates_initialized') {
                                                                            return (
                                                                                <Typography key={idx} variant="caption" display="block" sx={{ ml: 3, mt: 0.5 }}>
                                                                                    "{change.task_title}" dates initialized
                                                                                </Typography>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })}
                                                                    {result.timeline_changes.length > 3 && (
                                                                        <Typography variant="caption" display="block" sx={{ ml: 3, mt: 0.5 }}>
                                                                            ...and {result.timeline_changes.length - 3} more
                                                                        </Typography>
                                                                    )}
                                                                </Typography>
                                                            );
                                                        } else {
                                                            return (
                                                                <Typography key={actionId} variant="body2" display="block" sx={{ mt: 1 }}>
                                                                    • <strong>Timeline Analysis:</strong> All task timelines are properly configured
                                                                </Typography>
                                                            );
                                                        }
                                                    } else if (actionId === 'break_down_tasks') {
                                                        if (result.tasks_broken_down && result.tasks_broken_down.length > 0) {
                                                            return (
                                                                <Typography key={actionId} variant="body2" display="block" sx={{ mt: 1 }}>
                                                                    • <strong>{result.tasks_affected} large tasks</strong> broken into subtasks:
                                                                    {result.tasks_broken_down.slice(0, 3).map((breakdown, idx) => (
                                                                        <Typography key={idx} variant="caption" display="block" sx={{ ml: 3, mt: 0.5 }}>
                                                                            "{breakdown.task_title}" → {breakdown.subtask_title}
                                                                        </Typography>
                                                                    ))}
                                                                    {result.tasks_broken_down.length > 3 && (
                                                                        <Typography variant="caption" display="block" sx={{ ml: 3, mt: 0.5 }}>
                                                                            ...and {result.tasks_broken_down.length - 3} more
                                                                        </Typography>
                                                                    )}
                                                                </Typography>
                                                            );
                                                        } else {
                                                            return (
                                                                <Typography key={actionId} variant="body2" display="block" sx={{ mt: 1 }}>
                                                                    • <strong>Task Breakdown:</strong> No large tasks found that need breaking down
                                                                </Typography>
                                                            );
                                                        }
                                                    }
                                                    return null;
                                                })}
                                            </Box>
                                        </Alert>

                                        {/* Action Buttons */}
                                        <Box mt={3} display="flex" gap={2} justifyContent="center">
                                            <Button
                                                variant="contained"
                                                onClick={onClose}
                                                sx={{
                                                    background: 'linear-gradient(45deg, #4caf50 30%, #8bc34a 90%)',
                                                    color: 'white',
                                                    px: 3,
                                                    py: 1.5,
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                                                    '&:hover': {
                                                        background: 'linear-gradient(45deg, #45a049 30%, #7cb342 90%)',
                                                    }
                                                }}
                                            >
                                                Minimize
                                            </Button>
                                            
                                        </Box>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
