import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    Stack,
    Avatar,
    Chip,
    Button,
    CircularProgress,
    Alert,
    Divider,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Fab,
    Slide,
} from '@mui/material';
import {
    Send as SendIcon,
    SmartToy as SmartToyIcon,
    Close as CloseIcon,
    Minimize as MinimizeIcon,
    ExpandMore as ExpandMoreIcon,
    Lock as LockIcon,
} from '@mui/icons-material';
import { keyframes } from '@emotion/react';
import { useSubscription } from '../Hooks/useSubscription';
import { router } from '@inertiajs/react';
// FeatureOverlay removed for inline upgrade card approach

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

// Robot typing animation keyframes
const robotBounce = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  40% {
    transform: translateY(-3px) rotate(-2deg);
  }
  60% {
    transform: translateY(-1px) rotate(1deg);
  }
`;

const typingDot = keyframes`
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
`;

const shimmer = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

// Robot typing animation component
function RobotTypingIndicator() {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 2,
                borderRadius: 2,
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'primary.100',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background:
                        'linear-gradient(90deg, transparent, rgba(25, 118, 210, 0.1), transparent)',
                    animation: `${shimmer} 2s ease-in-out infinite`,
                },
            }}
        >
            {/* Robot avatar with bouncing animation */}
            <Box
                sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    animation: `${robotBounce} 2s ease-in-out infinite`,
                    boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                }}
            >
                <SmartToyIcon sx={{ fontSize: 18 }} />
            </Box>

            {/* Typing message */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    🤖 Assistant is crafting a response
                </Typography>

                {/* Animated typing dots */}
                <Box sx={{ display: 'flex', gap: 0.3, alignItems: 'center' }}>
                    {[0, 1, 2].map((index) => (
                        <Box
                            key={index}
                            sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: 'primary.main',
                                animation: `${typingDot} 1.4s ease-in-out infinite`,
                                animationDelay: `${index * 0.2}s`,
                            }}
                        />
                    ))}
                </Box>
            </Box>

            {/* Small sparkling effects */}
            <Box
                sx={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    gap: 0.5,
                }}
            >
                {[0, 1, 2].map((index) => (
                    <Box
                        key={index}
                        sx={{
                            width: 3,
                            height: 3,
                            borderRadius: '50%',
                            bgcolor: 'secondary.main',
                            opacity: 0.6,
                            animation: `${typingDot} 1.8s ease-in-out infinite`,
                            animationDelay: `${index * 0.3}s`,
                        }}
                    />
                ))}
            </Box>
        </Box>
    );
}

export default function AssistantChat({ project, open, onClose }) {
    const { shouldShowOverlay, userPlan } = useSubscription();
    // Inline upgrade card model for free/limited users
    
    const [message, setMessage] = useState('');
    const [conversation, setConversation] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [minimized, setMinimized] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [chatLocked, setChatLocked] = useState(false); // disables further input
    const [upgradeUrl, setUpgradeUrl] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const handleUpgrade = () => {
        router.visit(userPlan?.billing_url || '/billing');
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [conversation]);

    // Helper to append upgrade card
    const pushUpgradeCard = (bodyText = 'To continue and view AI insights, you\'ll need to subscribe.') => {
        const billing = userPlan?.billing_url || '/billing';
        setUpgradeUrl(billing);
        setConversation(prev => [...prev, {
            role: 'assistant',
            type: 'upgrade',
            title: 'Subscribe to continue',
            body: bodyText,
            upgradeUrl: billing,
            timestamp: new Date()
        }]);
        setChatLocked(true);
    };

    useEffect(() => {
        if (open && !minimized) {
            setTimeout(() => inputRef.current?.focus(), 100);

            // Fetch suggestions when chat opens
            if (suggestions.length === 0) {
                fetchSuggestions();
            }
        }
    }, [open, minimized]);

    const fetchSuggestions = async () => {
        try {
            const response = await fetch(route('projects.assistant.suggestions', project.id));
            const data = await response.json();
            if (data.success) {
                setSuggestions(data.suggestions);
            }
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
        }
    };

    // Shared submit logic for manual input and suggestion clicks
    const submitUserMessage = async (userMessage) => {
        if (!userMessage?.trim() || isLoading) return;

        setMessage('');
        setError(null);
        setShowSuggestions(false);
        const userObj = { role: 'user', content: userMessage.trim(), timestamp: new Date() };
        setConversation(prev => [...prev, userObj]);

        // If overlay applies, immediately append upgrade card and stop.
        if (userPlan?.overlays?.ai_chat) {
            pushUpgradeCard();
            return;
        }

        setIsLoading(true);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

            const response = await fetch(route('projects.assistant.chat', project.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    message: userMessage.trim(),
                    // Keep history consistent with previous behavior: exclude the just-typed message
                    conversation_history: conversation.map((msg) => ({
                        role: msg.role,
                        content: msg.content,
                    })),
                }),
            });

            const data = await response.json();

            if (data.show_overlay) {
                pushUpgradeCard(data.message || 'To see this AI answer and keep chatting, subscribe to a paid plan.');
            } else if (data.success || data.type === 'message') {
                setConversation(prev => [...prev, {
                    role: 'assistant',
                    content: data.response || data.content,
                    timestamp: new Date(data.timestamp || Date.now())
                }]);
            } else {
                setError(data.message || 'Failed to get response from assistant');
            }
        } catch (err) {
            setError(err.message || 'Network error. Please check your connection and try again.');
            console.error('Assistant chat error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim() || isLoading) return;
        const userMessage = message.trim();
        await submitUserMessage(userMessage);
    };

    const handleSuggestionClick = async (suggestion) => {
        if (isLoading) return;
        await submitUserMessage(suggestion);
        inputRef.current?.focus();
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getMessageAvatar = (role, isLatest = false) => {
        if (role === 'assistant') {
            return (
                <Avatar
                    sx={{
                        bgcolor: 'primary.main',
                        width: 32,
                        height: 32,
                        ...(isLatest && {
                            animation: `${robotBounce} 3s ease-in-out infinite`,
                            boxShadow: '0 0 12px rgba(25, 118, 210, 0.4)',
                        }),
                    }}
                >
                    <SmartToyIcon sx={{ fontSize: 18 }} />
                </Avatar>
            );
        }
        return <Avatar sx={{ bgcolor: 'grey.400', width: 32, height: 32 }}>U</Avatar>;
    };

    if (!open) return null;

    if (minimized) {
        return (
            <Fab
                color="primary"
                sx={{
                    position: 'fixed',
                    bottom: 20,
                    right: 100, // Moved left to avoid overlap with FAB group
                    zIndex: 1300,
                }}
                onClick={() => setMinimized(false)}
            >
                <SmartToyIcon />
            </Fab>
        );
    }

    return (
    <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                bottom: 20,
                right: 100, // Moved left to avoid overlap with FAB group
                width: { xs: '90vw', sm: 400 },
                height: { xs: '70vh', sm: 500 },
                zIndex: 1300,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                overflow: 'hidden',
        position: 'fixed',
            }}
        >
        {/* Global overlay appears AFTER first assistant response if locked */}
            {/* Header */}
            <Box
                sx={{
                    p: 2,
                    bgcolor: 'primary.main',
                    background: 'linear-gradient(90deg,#1e3a8a,#1d4ed8 60%,#2563eb)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center">
                    <SmartToyIcon />
                    <Box>
                        <Typography variant="h6" sx={{ fontSize: '1rem', lineHeight: 1 }}>
                            Project Assistant
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.85 }}>
                            Ask for summaries or actions. First reply visible preview.
                        </Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                    <IconButton
                        size="small"
                        sx={{ color: 'white' }}
                        onClick={() => setMinimized(true)}
                    >
                        <MinimizeIcon />
                    </IconButton>
                    <IconButton size="small" sx={{ color: 'white' }} onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Stack>
            </Box>

            {/* Project Info */}
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'grey.200' }}>
                <Typography variant="body2" color="text.secondary">
                    Chatting about: <strong>{project.name}</strong>
                </Typography>
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        p: 1,
                        '&::-webkit-scrollbar': {
                            width: '6px',
                        },
                        '&::-webkit-scrollbar-track': {
                            background: '#f1f1f1',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: '#c1c1c1',
                            borderRadius: '3px',
                        },
                    }}
                >
                    {conversation.length === 0 && (
                        <Box sx={{ p: 3 }}>
                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                <SmartToyIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Hi! I'm your project assistant. Ask me anything about "
                                    {project.name}".
                                </Typography>
                            </Box>

                            {/* Suggestions */}
                            {showSuggestions && suggestions.length > 0 && (
                                <Box>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            mb: 2,
                                            fontSize: '0.9rem',
                                            color: 'text.secondary',
                                            textAlign: 'center',
                                        }}
                                    >
                                        💡 Suggested Questions
                                    </Typography>
                                    <Box
                                        sx={{
                                            maxHeight: 200,
                                            overflowY: 'auto',
                                            '&::-webkit-scrollbar': {
                                                width: '6px',
                                            },
                                            '&::-webkit-scrollbar-track': {
                                                background: '#f1f1f1',
                                            },
                                            '&::-webkit-scrollbar-thumb': {
                                                background: '#c1c1c1',
                                                borderRadius: '3px',
                                            },
                                        }}
                                    >
                                        <Stack spacing={1}>
                                            {suggestions.map((suggestion, index) => (
                                                <Button
                                                    key={index}
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() =>
                                                        handleSuggestionClick(suggestion)
                                                    }
                                                    disabled={isLoading}
                                                    sx={{
                                                        justifyContent: 'flex-start',
                                                        textAlign: 'left',
                                                        textTransform: 'none',
                                                        fontSize: '0.8rem',
                                                        py: 1,
                                                        px: 1.5,
                                                        borderColor: 'grey.300',
                                                        '&:hover': {
                                                            borderColor: 'primary.main',
                                                            bgcolor: 'primary.50',
                                                        },
                                                    }}
                                                >
                                                    {suggestion}
                                                </Button>
                                            ))}
                                        </Stack>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}

                    <Stack spacing={2}>
                        {conversation.map((msg, index) => {
                            const isLastAssistantMessage =
                                msg.role === 'assistant' &&
                                index === conversation.length - 1 &&
                                conversation.length > 0;

                            return (
                                <Box
                                    key={index}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                        gap: 1,
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    {getMessageAvatar(msg.role, isLastAssistantMessage)}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Paper
                                            elevation={1}
                                            sx={{
                                                position: 'relative', // For overlay positioning
                                                p: 1.5,
                                                bgcolor:
                                                    msg.role === 'user'
                                                        ? 'primary.main'
                                                        : 'grey.100',
                                                color:
                                                    msg.role === 'user' ? 'white' : 'text.primary',
                                                borderRadius: 2,
                                                maxWidth: '85%',
                                                ml: msg.role === 'user' ? 'auto' : 0,
                                                mr: msg.role === 'assistant' ? 'auto' : 0,
                                                ...(isLastAssistantMessage && {
                                                    borderLeft: '3px solid',
                                                    borderLeftColor: 'primary.main',
                                                    bgcolor: 'primary.50',
                                                }),
                                            }}
                                        >
                                            {msg.type === 'upgrade' ? (
                                                <Box
                                                    sx={{
                                                        p: 1.5,
                                                        borderRadius: 2,
                                                        bgcolor: 'white',
                                                        border: '1px solid',
                                                        borderColor: 'primary.100',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 1,
                                                    }}
                                                >
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                                        {msg.title}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                        {msg.body}
                                                    </Typography>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => router.visit(msg.upgradeUrl || upgradeUrl || '/billing')}
                                                        sx={{ textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
                                                    >
                                                        See plans
                                                    </Button>
                                                </Box>
                                            ) : (
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word',
                                                    }}
                                                >
                                                    {msg.content}
                                                </Typography>
                                            )}
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    opacity: 0.7,
                                                    fontSize: '0.7rem',
                                                    mt: 0.5,
                                                    display: 'block',
                                                }}
                                            >
                                                {formatTime(msg.timestamp)}
                                            </Typography>
                                        </Paper>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Stack>

                    {isLoading && (
                        <Box sx={{ p: 1 }}>
                            <RobotTypingIndicator />
                        </Box>
                    )}

                    <div ref={messagesEndRef} />
                </Box>
                {/* End Messages Container */}

                {error && (
                    <Alert severity="error" sx={{ m: 1, mb: 0 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
            </Box>
            {/* End Messages Section */}

            {/* Input */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'grey.200' }}>
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}
                >
                    <TextField
                        ref={inputRef}
                        fullWidth
                        multiline
                        maxRows={3}
                        size="small"
                        placeholder="Ask about your project..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={isLoading || chatLocked}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                            },
                        }}
                    />
                    <IconButton
                        type="submit"
                        disabled={!message.trim() || isLoading || chatLocked}
                        color="primary"
                        sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': {
                                bgcolor: 'primary.dark',
                            },
                            '&.Mui-disabled': {
                                bgcolor: 'grey.300',
                                color: 'grey.500',
                            },
                        }}
                    >
                        {isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    </IconButton>
                </Box>
            </Box>
            {/* Global overlay removed; locked state shown inline above */}
        </Paper>
    );
}
