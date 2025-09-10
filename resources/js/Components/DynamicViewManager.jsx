import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    Stack,
    Button,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Divider,
    Card,
    CardContent,
    Grid,
    LinearProgress,
    Fab,
    Tooltip,
} from '@mui/material';
import {
    Send as SendIcon,
    Close as CloseIcon,
    ViewModule as ViewModuleIcon,
    Chat as ChatIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
    BarChart as BarChartIcon,
    TableChart as TableChartIcon,
    Dashboard as DashboardIcon,
    Code as CodeIcon,
} from '@mui/icons-material';
import { router } from '@inertiajs/react';
import axios from 'axios';

const DynamicViewManager = ({ project, isOpen, onClose, onViewSaved }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [savedViews, setSavedViews] = useState([]);
    const [currentView, setCurrentView] = useState(null);
    const [apiEndpoint, setApiEndpoint] = useState(`/projects/${project?.id}/data/tasks`);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initialize with welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: 1,
                type: 'assistant',
                content: `Hello! I'm your AI assistant for creating dynamic views of your project data. 

I can help you:
• Create custom charts and visualizations
• Generate reports and insights
• Filter and organize your project data
• Build custom dashboards

The current API endpoint for your project data is: \`${apiEndpoint}\`

What kind of view would you like to create?`,
                timestamp: new Date(),
            }]);
        }
    }, [isOpen, apiEndpoint]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputMessage,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await axios.post('/dashboard/chat', {
                message: inputMessage,
                endpoint: window.location.origin + apiEndpoint,
                context: {
                    project_id: project?.id,
                    project_name: project?.name,
                    current_view: currentView,
                },
            }, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
            });

            const assistantMessage = {
                id: Date.now() + 1,
                type: 'assistant',
                content: response.data.message,
                timestamp: new Date(),
                viewConfig: response.data.view_config,
            };

            setMessages(prev => [...prev, assistantMessage]);

            // If the response includes a view config, set it as current view
            if (response.data.view_config) {
                setCurrentView(response.data.view_config);
            }

        } catch (error) {
            console.error('Chat error:', error);
            
            let errorContent = 'Sorry, I encountered an error while processing your request. Please try again.';
            
            // Handle specific error types
            if (error.response?.status === 404) {
                errorContent = 'Chat service is currently unavailable. Please check your configuration or contact support.';
            } else if (error.response?.status >= 500) {
                errorContent = 'Server error occurred. Please try again later.';
            } else if (error.code === 'NETWORK_ERROR' || !error.response) {
                errorContent = 'Network error. Please check your connection and try again.';
            }
            
            const errorMessage = {
                id: Date.now() + 1,
                type: 'error',
                content: errorContent,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const saveCurrentView = () => {
        if (!currentView) return;

        const viewToSave = {
            ...currentView,
            id: Date.now(),
            saved_at: new Date(),
            project_id: project?.id,
        };

        const updatedViews = [...savedViews, viewToSave];
        setSavedViews(updatedViews);
        
        // Save to localStorage
        try {
            localStorage.setItem(`saved_views_${project?.id}`, JSON.stringify(updatedViews));
            // Notify parent component that views have been updated
            if (onViewSaved) {
                onViewSaved();
            }
        } catch (error) {
            console.error('Failed to save view:', error);
        }
    };

    const loadSavedViews = () => {
        try {
            const saved = localStorage.getItem(`saved_views_${project?.id}`);
            if (saved) {
                setSavedViews(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Failed to load saved views:', error);
        }
    };

    useEffect(() => {
        if (project?.id) {
            loadSavedViews();
        }
    }, [project?.id]);

    const renderMessage = (message) => {
        const isUser = message.type === 'user';
        const isError = message.type === 'error';

        return (
            <Box
                key={message.id}
                sx={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    mb: 2,
                }}
            >
                <Paper
                    elevation={1}
                    sx={{
                        p: 2,
                        maxWidth: '80%',
                        bgcolor: isUser ? 'primary.main' : isError ? 'error.light' : 'grey.100',
                        color: isUser ? 'primary.contrastText' : isError ? 'error.contrastText' : 'text.primary',
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                    </Typography>
                    
                    {message.viewConfig && (
                        <Box sx={{ mt: 2 }}>
                            <Divider sx={{ mb: 1 }} />
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                Generated View Configuration:
                            </Typography>
                            <Chip
                                size="small"
                                icon={<ViewModuleIcon />}
                                label={message.viewConfig.title || message.viewConfig.type}
                                sx={{ mt: 1 }}
                            />
                        </Box>
                    )}
                    
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                        {message.timestamp.toLocaleTimeString()}
                    </Typography>
                </Paper>
            </Box>
        );
    };

    const renderCurrentView = () => {
        if (!currentView) return null;

        return (
            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">
                            {currentView.title || 'Custom View'}
                        </Typography>
                        <Button
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={saveCurrentView}
                        >
                            Save View
                        </Button>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {currentView.description || 'AI-generated view configuration'}
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Typography variant="caption" display="block" gutterBottom>
                                Type: {currentView.type}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" display="block" gutterBottom>
                                Data Source: API Endpoint
                            </Typography>
                        </Grid>
                    </Grid>

                    {currentView.config && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" display="block" gutterBottom>
                                Configuration:
                            </Typography>
                            <Box
                                component="pre"
                                sx={{
                                    fontSize: '0.75rem',
                                    bgcolor: 'grey.50',
                                    p: 1,
                                    borderRadius: 1,
                                    overflow: 'auto',
                                    maxHeight: 200,
                                }}
                            >
                                {JSON.stringify(currentView.config, null, 2)}
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Card>
        );
    };

    const renderSavedViews = () => {
        if (savedViews.length === 0) return null;

        return (
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Saved Views
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {savedViews.map((view) => (
                        <Chip
                            key={view.id}
                            label={view.title || view.type}
                            size="small"
                            onClick={() => setCurrentView(view)}
                            sx={{ cursor: 'pointer' }}
                        />
                    ))}
                </Stack>
            </Box>
        );
    };

    if (!isOpen) return null;

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { height: '80vh', display: 'flex', flexDirection: 'column' }
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ViewModuleIcon />
                        <Typography variant="h6">Dynamic View Generator</Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pb: 1 }}>
                {renderSavedViews()}
                {renderCurrentView()}
                
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
                        {messages.map(renderMessage)}
                        {isLoading && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                                <CircularProgress size={24} />
                            </Box>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            fullWidth
                            multiline
                            maxRows={4}
                            placeholder="Ask me to create charts, reports, or custom views..."
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                            size="small"
                        />
                        <IconButton
                            onClick={handleSendMessage}
                            disabled={!inputMessage.trim() || isLoading}
                            color="primary"
                        >
                            <SendIcon />
                        </IconButton>
                    </Box>
                </Box>
            </DialogContent>
            
            <DialogActions sx={{ pt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    API Endpoint: {apiEndpoint}
                </Typography>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default DynamicViewManager;