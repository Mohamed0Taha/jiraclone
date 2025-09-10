import React, { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { csrfFetch } from '@/utils/csrf';
import { useIsolatedSpeechRecognition } from '@/hooks/useIsolatedSpeechRecognition';
import {
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
    Switch,
    FormControlLabel,
    keyframes,
    alpha,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import RecordVoiceOverRoundedIcon from '@mui/icons-material/RecordVoiceOverRounded';

// Animation keyframes
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
  100% { transform: scale(1); opacity: 1; }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
`;

// Theme colors (from your theme.js)
const colors = {
    primary: '#6366F1',
    secondary: '#22D3EE',
    success: '#34D399',
    warning: '#F59E0B',
    error: '#F87171',
    info: '#60A5FA',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    background: '#FAFBFC',
    paper: '#FFFFFF',
};

// Chat-specific palette using theme colors
const palette = {
    appBg: 'linear-gradient(135deg, #1e3a8a, #4f46e5, #7c3aed)',
    appGlass: alpha(colors.paper, 0.2),
    titleBg: `linear-gradient(90deg, ${alpha(colors.primary, 0.55)}, ${alpha(colors.secondary, 0.45)})`,
    ribbonBg: alpha('#233096', 0.65),
    ribbonBorder: alpha(colors.paper, 0.35),
    scrollbar: alpha(colors.primary, 0.55),
    userBubble: `linear-gradient(135deg, ${alpha('#ec4899', 0.9)}, ${alpha('#8b5cf6', 0.85)})`,
    userBubbleBorder: alpha('#a78bfa', 0.75),
    asstBubble: `linear-gradient(135deg, ${alpha(colors.info, 0.9)}, ${alpha(colors.secondary, 0.85)})`,
    asstBubbleBorder: alpha(colors.secondary, 0.75),
    stripeUser: 'linear-gradient(90deg, #f472b6, #a78bfa)',
    stripeAsst: `linear-gradient(90deg, ${colors.info}, ${colors.secondary})`,
    chipGold: colors.warning,
    chipGoldBg: alpha(colors.warning, 0.18),
    chipGoldHover: alpha(colors.warning, 0.28),
    sendGradient: `linear-gradient(135deg, ${colors.secondary}, ${colors.primary})`,
    sendGradientHover: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
    sendFocusRing: `0 0 0 3px ${alpha(colors.secondary, 0.35)}`,
    sendShadow: `0 6px 24px ${alpha(colors.primary, 0.35)}`,
    sendShadowHover: `0 10px 28px ${alpha(colors.primary, 0.5)}`,
    inputBg: alpha(colors.paper, 0.2),
    inputBgHover: alpha(colors.paper, 0.25),
    inputBgFocus: alpha(colors.paper, 0.27),
    inputRing: `0 0 0 3px ${alpha('#a78bfa', 0.35)}`,
    borderSoft: alpha(colors.paper, 0.35),
    snapshotBg: alpha(colors.secondary, 0.12),
    snapshotBorder: alpha(colors.secondary, 0.35),
    dangerBorder: alpha(colors.error, 0.85),
    dangerBg: alpha(colors.error, 0.15),
    successBg: alpha(colors.success, 0.2),
    successText: colors.success,
    cancelBg: alpha(colors.error, 0.18),
    cancelText: colors.error,
};

export default function AssistantChat({ project, open, onClose, isCustomView = false, onSpaGenerated = null }) {
    const { props } = usePage();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [busy, setBusy] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [pendingCommand, setPendingCommand] = useState(null);

    // Voice interaction state
    const [voiceMode, setVoiceMode] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);

    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const voiceTimeoutRef = useRef(null);
    const sessionRef = useRef(null);

    // Generate session ID if not exists
    if (!sessionRef.current) {
        sessionRef.current = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Isolated speech recognition setup for this component
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition,
        startListening: startSpeechRecognition,
        stopListening: stopSpeechRecognition,
    } = useIsolatedSpeechRecognition('assistant-chat');

    const navigateToBoard = () => {
        const url = `/projects/${project.id}/tasks`;
        try {
            router.visit(url, {
                preserveScroll: true,
                preserveState: false,
                replace: true,
            });
        } catch {
            window.location.assign(url);
        }
    };

    useEffect(() => {
        if (!open) return;
        
        // Use different suggestions for custom view
        if (isCustomView) {
            setSuggestions([
                "Create an expense tracker for my team",
                "Build a vendor phonebook",
                "Make a project wiki page",
                "Create a task analytics dashboard",
                "Build a team workload overview",
                "Create a milestone timeline",
                "Build a budget tracking app"
            ]);
        } else {
            fetch(`/projects/${project.id}/assistant/suggestions`, {
                method: 'GET',
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            })
                .then((response) => response.json())
                .then((d) => {
                    if (Array.isArray(d?.suggestions)) setSuggestions(d.suggestions);
                })
                .catch(() => {});
        }
    }, [open, project?.id, isCustomView]);

    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => inputRef.current?.focus(), 120);
        return () => clearTimeout(t);
    }, [open]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const isAffirmation = (text) =>
        /^\s*(yes|yep|yeah|confirm|confirmed|ok|okay|go ahead|proceed|do it|please delete|please proceed|sure)\s*!*\s*$/i.test(
            text || ''
        );

    const isCancellation = (text) =>
        /^\s*(no|cancel|stop|wait|hold on|nevermind|never mind)\s*!*\s*$/i.test(text || '');

    const executeCommand = async (cmdData, indexToAnnotate) => {
        if (busy) return;
        setBusy(true);
        try {
            const response = await csrfFetch(`/projects/${project.id}/assistant/execute`, {
                method: 'POST',
                body: JSON.stringify({
                    command_data: cmdData,
                }),
            });
            const data = await response.json();

            setMessages((prev) => {
                const next = [...prev];
                const m = next[indexToAnnotate];
                if (m) {
                    m.executed = true;
                    m.executionResult = data;
                }
                next.push({
                    role: 'assistant',
                    text: data?.message || 'Command executed.',
                    response: data,
                    ts: Date.now(),
                });
                return next;
            });

            setPendingCommand(null);
            navigateToBoard();
        } catch (e) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    text: `Execution failed: ${e.message}`,
                    error: true,
                    response: { type: 'error' },
                    ts: Date.now(),
                },
            ]);
        } finally {
            setBusy(false);
        }
    };

    // Voice interaction functions
    const startVoiceInput = () => {
        console.log('Starting voice input for assistant chat...', {
            browserSupportsSpeechRecognition,
        });

        if (!browserSupportsSpeechRecognition) {
            console.error('Browser does not support speech recognition');
            alert(
                'Your browser does not support speech recognition. Please use a modern browser like Chrome or Edge.'
            );
            return;
        }

        try {
            resetTranscript();
            setIsProcessingVoice(false); // Reset processing state
            console.log('Attempting to start listening for assistant chat...');

            const success = startSpeechRecognition();
            if (success) {
                console.log('Voice input started successfully for assistant chat');

                // Clear any existing timers
                clearTimeout(silenceTimerRef.current);
                clearTimeout(voiceTimeoutRef.current);

                // Auto-stop after 30 seconds to prevent indefinite listening
                voiceTimeoutRef.current = setTimeout(() => {
                    if (listening) {
                        console.log('Auto-stopping voice input after 30 seconds');
                        stopVoiceInput();
                    }
                }, 30000);
            } else {
                console.error('Failed to start voice input for assistant chat');
                alert('Failed to start voice input. Please try again.');
                setIsProcessingVoice(false);
            }
        } catch (error) {
            console.error('Error starting voice input for assistant chat:', error);
            alert('Failed to start voice input: ' + error.message);
            setIsProcessingVoice(false);
        }
    };

    const stopVoiceInput = () => {
        console.log('Stopping voice input for assistant chat');
        stopSpeechRecognition();
        clearTimeout(silenceTimerRef.current);
        clearTimeout(voiceTimeoutRef.current);

        // Set processing state only if we have transcript to process
        if (transcript && transcript.trim()) {
            setIsProcessingVoice(true);

            // Process the transcript after a short delay to ensure it's captured
            setTimeout(() => {
                sendMessage(transcript.trim());
                resetTranscript();
                setIsProcessingVoice(false);
            }, 500);
        } else {
            setIsProcessingVoice(false);
        }
    };

    const toggleVoiceMode = () => {
        const newVoiceMode = !voiceMode;
        setVoiceMode(newVoiceMode);

        if (!newVoiceMode && listening) {
            stopVoiceInput();
        }

        // Clear input when switching modes
        setInput('');
        setIsProcessingVoice(false); // Reset processing state
    };

    // Monitor transcript changes for silence detection
    useEffect(() => {
        if (!listening || !voiceMode) return;

        // Clear existing timer
        clearTimeout(silenceTimerRef.current);

        // Set new timer for silence detection (2 seconds of silence)
        silenceTimerRef.current = setTimeout(() => {
            if (listening && transcript && transcript.trim()) {
                stopVoiceInput();
            }
        }, 2000);

        return () => clearTimeout(silenceTimerRef.current);
    }, [transcript, listening, voiceMode]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearTimeout(silenceTimerRef.current);
            clearTimeout(voiceTimeoutRef.current);
            if (listening) {
                stopSpeechRecognition();
            }
        };
    }, [listening, stopSpeechRecognition]);

    const sendMessage = async (text) => {
        if (!text || busy) return;

        const userMsg = { role: 'user', text, ts: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');

        if (pendingCommand && !pendingCommand.executed) {
            if (isAffirmation(text)) {
                return executeCommand(pendingCommand.data, pendingCommand.index);
            }
            if (isCancellation(text)) {
                setPendingCommand(null);
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        text: "Cancelled. I won't run that command.",
                        ts: Date.now(),
                    },
                ]);
                return;
            }
        }

        setBusy(true);
        try {
            const payload = {
                message: text,
                session_id: sessionRef.current,
                view_name: 'default', // Add view_name for custom views
                conversation_history: messages.map((m) => ({
                    role: m.role,
                    content: m.text,
                })),
            };

            // Route to different endpoints based on context
            const endpoint = isCustomView 
                ? `/projects/${project.id}/custom-views/chat`
                : `/projects/${project.id}/assistant/chat`;

            const response = await csrfFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            // Handle custom view SPA generation
            if (isCustomView && data?.type === 'spa_generated' && data?.html) {
                const asstMsg = {
                    role: 'assistant',
                    text: data?.message || 'Generated your custom application!',
                    response: data,
                    ts: Date.now(),
                };
                
                setMessages((prev) => [...prev, asstMsg]);
                
                // Notify parent component about the generated SPA
                if (onSpaGenerated) {
                    onSpaGenerated(data.html, data);
                }
                
                setBusy(false);
                return;
            }

            // If backend indicates overlay (free tier), show upgrade card style message
            if (data?.show_overlay) {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        text: data?.content || 'Upgrade to unlock full AI assistance.',
                        response: data,
                        upgrade: true,
                        ts: Date.now(),
                    },
                ]);
                setBusy(false);
                return;
            }

            const asstMsg = {
                role: 'assistant',
                text: data?.message || data?.content || '',
                response: data,
                ts: Date.now(),
            };

            setMessages((prev) => {
                const next = [...prev, asstMsg];

                const cmdData = data?.command_data || data?.data;
                if (data?.requires_confirmation && cmdData) {
                    const idx = next.length - 1;
                    setPendingCommand({ data: cmdData, index: idx });
                }

                return next;
            });
        } catch (e) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    text: `Error: ${e.message}`,
                    error: true,
                    ts: Date.now(),
                    response: { type: 'error' },
                },
            ]);
        } finally {
            setBusy(false);
        }
    };

    const cancelPending = (indexToAnnotate) => {
        setPendingCommand(null);
        setMessages((prev) => {
            const next = [...prev];
            const m = next[indexToAnnotate];
            if (m) m.cancelled = true;
            next.push({
                role: 'assistant',
                text: "Cancelled. I won't run that command.",
                ts: Date.now(),
            });
            return next;
        });
    };

    const handleSuggestion = (s) => sendMessage(s);

    const copyMessage = async (idx, text) => {
        try {
            await navigator.clipboard.writeText(text || '');
            setCopiedIndex(idx);
            setTimeout(() => setCopiedIndex(null), 1200);
        } catch {}
    };

    return (
    <Dialog
        open={open}
        onClose={onClose}
        maxWidth={false}
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    overflow: 'hidden',
                    background: palette.appBg,
                    border: 'none',
                    boxShadow: '0 30px 60px -12px rgba(31,41,255,0.45)',
                    display: 'flex',
            width: 'clamp(420px, 92vw, 900px)',
            minWidth: 400,
                    height: '85vh',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    pr: 6,
                    py: 1.25,
                    background: palette.titleBg,
                    borderBottom: '1px solid rgba(255,255,255,0.25)',
                    color: 'white',
                    position: 'relative',
                }}
            >
                <Avatar
                    sx={{
                        width: 32,
                        height: 32,
                        background: `linear-gradient(135deg, ${colors.secondary}, ${colors.primary})`,
                        boxShadow: '0 0 18px rgba(167,139,250,0.65)',
                        animation: `${pulse} 2.2s infinite`,
                    }}
                >
                    <SmartToyRoundedIcon fontSize="small" />
                </Avatar>
                <Typography
                    variant="subtitle1"
                    component="div"
                    sx={{ fontWeight: 800, letterSpacing: 0.15 }}
                >
                    {isCustomView ? 'Custom SPA Generator' : 'Project Assistant'}
                </Typography>
                <Chip
                    size="small"
                    label={project?.name || 'Project'}
                    sx={{
                        ml: 1,
                        fontWeight: 800,
                        height: 22,
                        background: palette.appGlass,
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.5)',
                    }}
                />

                {/* Voice Mode Toggle */}
                <FormControlLabel
                    control={
                        <Switch
                            checked={voiceMode}
                            onChange={toggleVoiceMode}
                            size="small"
                            sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: colors.secondary,
                                    '& + .MuiSwitch-track': {
                                        backgroundColor: colors.secondary,
                                        opacity: 0.7,
                                    },
                                },
                            }}
                        />
                    }
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {voiceMode ? (
                                <RecordVoiceOverRoundedIcon fontSize="small" />
                            ) : (
                                <ChatBubbleOutlineRoundedIcon fontSize="small" />
                            )}
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {voiceMode ? 'Voice' : 'Text'}
                            </Typography>
                        </Box>
                    }
                    sx={{
                        ml: 2,
                        '& .MuiFormControlLabel-label': {
                            color: 'white',
                        },
                    }}
                />

                <IconButton
                    onClick={onClose}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                    aria-label="Close assistant chat"
                >
                    <CloseRoundedIcon fontSize="small" sx={{ color: 'white' }} />
                </IconButton>
            </DialogTitle>

            <DialogContent
                dividers
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    px: 0,
                    py: 0,
                    background:
                        'linear-gradient(to bottom, rgba(30,58,138,0.85), rgba(67,56,202,0.85))',
                    overflow: 'hidden',
                }}
            >
                {/* Suggestions ribbon */}
                <Box
                    sx={{
                        px: 2,
                        py: 1.5,
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        background: palette.ribbonBg,
                        backdropFilter: 'blur(10px)',
                        borderBottom: `1px solid ${palette.ribbonBorder}`,
                    }}
                >
                    {suggestions.length > 0 ? (
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                            <Typography
                                variant="caption"
                                component="span"
                                sx={{
                                    fontWeight: 800,
                                    pr: 0.5,
                                    alignSelf: 'center',
                                    color: palette.chipGold,
                                }}
                            >
                                Quick actions:
                            </Typography>
                            {suggestions.map((s, i) => (
                                <Chip
                                    key={i}
                                    onClick={() => handleSuggestion(s)}
                                    label={s}
                                    clickable
                                    size="small"
                                    sx={{
                                        border: `1px solid ${palette.chipGold}`,
                                        background: palette.chipGoldBg,
                                        color: palette.chipGold,
                                        '&:hover': {
                                            background: palette.chipGoldHover,
                                            transform: 'translateY(-1px)',
                                            boxShadow: '0 3px 10px rgba(255,215,0,0.3)',
                                        },
                                        transition: 'all 0.2s ease',
                                        fontWeight: 700,
                                    }}
                                />
                            ))}
                        </Stack>
                    ) : (
                        <Typography
                            variant="caption"
                            component="span"
                            sx={{ opacity: 0.9, color: '#e0fbfc', fontWeight: 600 }}
                        >
                            Ask for summaries, bulk ops, assignments, or reporting. I'll always
                            request confirmation before executing changes.
                        </Typography>
                    )}
                </Box>

                {/* Scrollable message area */}
                <Box
                    ref={scrollRef}
                    sx={{
                        px: 2,
                        py: 1.25,
                        overflowY: 'auto',
                        flex: 1,
                        '&::-webkit-scrollbar': { width: 10 },
                        '&::-webkit-scrollbar-thumb': {
                            background: palette.scrollbar,
                            borderRadius: 10,
                        },
                    }}
                >
                    {messages.length === 0 && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                textAlign: 'center',
                                py: 4,
                            }}
                        >
                            <Box
                                sx={{
                                    animation: `${float} 3s ease-in-out infinite`,
                                    mb: 3,
                                }}
                            >
                                <Box
                                    component="img"
                                    src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXZ6OXcxajF5aGIxZHB3dm5xdm95aWUzanJtaWljb2Y2M3VvcGY4aCZlcD12MV9pbnRlcm5alf9naWZfYnlfaWQmY3Q9Zw/LHZyixOnHwDDy/giphy.gif"
                                    alt="Thinking..."
                                    sx={{
                                        height: 180,
                                        width: 180,
                                        borderRadius: '50%',
                                        border: '3px solid rgba(167,139,250,0.45)',
                                        boxShadow: '0 0 36px rgba(99,102,241,0.55)',
                                    }}
                                />
                            </Box>
                            <Typography
                                variant="h6"
                                sx={{ fontWeight: 900, color: '#e0e7ff', mb: 1 }}
                            >
                                Project Assistant
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{ color: 'rgba(255,255,255,0.95)', maxWidth: 520, mb: 2 }}
                            >
                                I'm here to help you manage your project tasks. Try asking me:
                            </Typography>
                            <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                justifyContent="center"
                            >
                                <Chip
                                    label="Delete all overdue tasks"
                                    sx={{
                                        background: alpha(colors.error, 0.22),
                                        color: colors.error,
                                        fontWeight: 700,
                                        mb: 1,
                                        border: `1px solid ${alpha(colors.error, 0.45)}`,
                                    }}
                                />
                                <Chip
                                    label="Move Review → Done"
                                    sx={{
                                        background: alpha('#a78bfa', 0.22),
                                        color: '#a78bfa',
                                        fontWeight: 700,
                                        mb: 1,
                                        border: `1px solid ${alpha('#a78bfa', 0.45)}`,
                                    }}
                                />
                                <Chip
                                    label="Assign tasks to Alex"
                                    sx={{
                                        background: alpha(colors.secondary, 0.22),
                                        color: colors.secondary,
                                        fontWeight: 700,
                                        mb: 1,
                                        border: `1px solid ${alpha(colors.secondary, 0.45)}`,
                                    }}
                                />
                                <Chip
                                    label="How many tasks are done?"
                                    sx={{
                                        background: palette.chipGoldBg,
                                        color: palette.chipGold,
                                        fontWeight: 700,
                                        mb: 1,
                                        border: `1px solid ${palette.chipGold}`,
                                    }}
                                />
                            </Stack>
                        </Box>
                    )}

                    {messages.map((m, idx) => {
                        const cmdData = m?.response?.command_data || m?.response?.data;
                        const needsConfirm = !!(m?.response?.requires_confirmation && cmdData);

                        const typeStr = (
                            cmdData && typeof cmdData.type !== 'undefined'
                                ? String(cmdData.type)
                                : ''
                        ).toLowerCase();
                        const isDeleteCommand =
                            typeStr.includes('delete') ||
                            typeStr.includes('destroy') ||
                            typeStr.includes('remove');

                        const showSnapshot = !!m?.response?.ui?.show_snapshot;
                        const isUser = m?.role === 'user';

                        // Inline upgrade card
                        if (m.upgrade) {
                            return (
                                <Stack
                                    key={idx}
                                    direction="row"
                                    spacing={1.5}
                                    sx={{ my: 2, justifyContent: 'center' }}
                                >
                                    <Box
                                        sx={{
                                            maxWidth: 520,
                                            width: '100%',
                                            p: 3,
                                            borderRadius: 4,
                                            background:
                                                'linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))',
                                            border: '1px solid rgba(255,255,255,0.35)',
                                            backdropFilter: 'blur(8px)',
                                            textAlign: 'center',
                                            boxShadow: '0 10px 28px -4px rgba(0,0,0,0.35)',
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle1"
                                            sx={{ fontWeight: 900, color: '#ecfeff', mb: 1 }}
                                        >
                                            Unlock AI Assistant Pro
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: 'rgba(255,255,255,0.9)',
                                                mb: 2,
                                                lineHeight: 1.6,
                                            }}
                                        >
                                            Get unlimited smart commands, project insights,
                                            summaries and bulk actions. Upgrade now to enable
                                            execution and richer responses.
                                        </Typography>
                                        <Stack
                                            direction={{ xs: 'column', sm: 'row' }}
                                            spacing={1.5}
                                            justifyContent="center"
                                        >
                                            <Button
                                                variant="contained"
                                                onClick={() =>
                                                    router.visit(
                                                        m?.response?.upgrade_url || '/billing'
                                                    )
                                                }
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 800,
                                                    px: 3,
                                                    background:
                                                        'linear-gradient(135deg,#6366F1,#4F46E5 55%,#4338CA)',
                                                    boxShadow: '0 8px 22px rgba(79,70,229,.5)',
                                                    '&:hover': {
                                                        background:
                                                            'linear-gradient(135deg,#595CEB,#4841D6 55%,#3B32B8)',
                                                    },
                                                }}
                                            >
                                                Upgrade Plan
                                            </Button>
                                            <Button
                                                variant="text"
                                                onClick={() =>
                                                    setMessages((prev) =>
                                                        prev.filter((_, i) => i !== idx)
                                                    )
                                                }
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 700,
                                                    color: '#ecfeff',
                                                }}
                                            >
                                                Dismiss
                                            </Button>
                                        </Stack>
                                    </Box>
                                </Stack>
                            );
                        }

                        return (
                            <Stack
                                key={idx}
                                direction="row"
                                spacing={1.5}
                                sx={{
                                    my: 1.5,
                                    alignItems: 'flex-start',
                                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                                }}
                            >
                                {!isUser && (
                                    <Avatar
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            mt: 0.5,
                                            background: `linear-gradient(135deg, ${colors.info}, ${colors.secondary})`,
                                            boxShadow: `0 0 16px ${alpha(colors.secondary, 0.6)}`,
                                        }}
                                    >
                                        <SmartToyRoundedIcon fontSize="small" />
                                    </Avatar>
                                )}

                                <Box
                                    sx={{
                                        maxWidth: '82%',
                                        p: 1.8,
                                        borderRadius: 3,
                                        background: isUser
                                            ? palette.userBubble
                                            : palette.asstBubble,
                                        border: isUser
                                            ? `1px solid ${palette.userBubbleBorder}`
                                            : `1px solid ${palette.asstBubbleBorder}`,
                                        boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
                                        ...(isUser
                                            ? {
                                                  borderTopRightRadius: 10,
                                                  borderBottomLeftRadius: 18,
                                              }
                                            : {
                                                  borderTopLeftRadius: 10,
                                                  borderBottomRightRadius: 18,
                                              }),
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: 3,
                                            background: isUser
                                                ? palette.stripeUser
                                                : palette.stripeAsst,
                                        },
                                    }}
                                >
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={1}
                                        sx={{ mb: 0.8 }}
                                    >
                                        <Typography
                                            variant="caption"
                                            component="span"
                                            sx={{
                                                fontWeight: 900,
                                                color: isUser ? '#fff7ed' : '#ecfeff',
                                            }}
                                        >
                                            {isUser ? 'You' : 'Assistant'}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            component="span"
                                            sx={{ color: 'rgba(255,255,255,0.9)' }}
                                        >
                                            {new Date(m?.ts || Date.now()).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Typography>
                                        {!isUser && (
                                            <Tooltip title="Copy message">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => copyMessage(idx, m?.text)}
                                                    sx={{ ml: 'auto' }}
                                                    aria-label="Copy assistant message"
                                                >
                                                    {copiedIndex === idx ? (
                                                        <CheckRoundedIcon
                                                            fontSize="small"
                                                            sx={{ color: '#ecfeff' }}
                                                        />
                                                    ) : (
                                                        <ContentCopyRoundedIcon
                                                            fontSize="small"
                                                            sx={{ color: 'rgba(255,255,255,0.95)' }}
                                                        />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>

                                    <Typography
                                        variant="body2"
                                        sx={{
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 1.7,
                                            color: 'white',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {m?.text}
                                    </Typography>

                                    {needsConfirm && (
                                        <Box
                                            sx={{
                                                mt: 1.8,
                                                p: 1.8,
                                                borderRadius: 2.5,
                                                border: `1px dashed ${isDeleteCommand ? palette.dangerBorder : alpha(colors.warning, 0.85)}`,
                                                background: isDeleteCommand
                                                    ? palette.dangerBg
                                                    : alpha(colors.warning, 0.15),
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                component="div"
                                                sx={{
                                                    fontWeight: 900,
                                                    display: 'block',
                                                    mb: 0.8,
                                                    color: isDeleteCommand
                                                        ? '#ff4d6d'
                                                        : palette.chipGold,
                                                }}
                                            >
                                                {isDeleteCommand
                                                    ? '⚠️ Delete Preview'
                                                    : '🚀 Command Preview'}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    mb: 1.5,
                                                    lineHeight: 1.6,
                                                    color: 'rgba(255,255,255,0.98)',
                                                }}
                                            >
                                                {m?.response?.message}
                                            </Typography>

                                            <Stack
                                                direction="row"
                                                spacing={1.5}
                                                alignItems="center"
                                            >
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color={isDeleteCommand ? 'error' : 'primary'}
                                                    startIcon={<PlayArrowRoundedIcon />}
                                                    onClick={() => executeCommand(cmdData, idx)}
                                                    disabled={busy || m?.executed || m?.cancelled}
                                                    sx={{
                                                        textTransform: 'none',
                                                        fontWeight: 800,
                                                        borderRadius: 20,
                                                        px: 2,
                                                        boxShadow: '0 8px 22px rgba(0,0,0,0.3)',
                                                        background: isDeleteCommand
                                                            ? 'linear-gradient(135deg, #ff6b6b, #ff8e53)'
                                                            : 'linear-gradient(135deg, #34d399, #10b981)',
                                                        '&:hover': {
                                                            transform:
                                                                'translateY(-1px) scale(1.03)',
                                                            boxShadow:
                                                                '0 10px 26px rgba(0,0,0,0.38)',
                                                        },
                                                        transition: 'all 0.25s ease',
                                                    }}
                                                    aria-label="Confirm and execute command"
                                                >
                                                    {m?.executed ? 'Executed' : 'Confirm'}
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => cancelPending(idx)}
                                                    disabled={busy || m?.executed || m?.cancelled}
                                                    sx={{
                                                        textTransform: 'none',
                                                        borderRadius: 20,
                                                        px: 2,
                                                        borderWidth: 1.8,
                                                        color: 'white',
                                                        borderColor: 'rgba(255,255,255,0.6)',
                                                        '&:hover': {
                                                            background: 'rgba(255,255,255,0.15)',
                                                            borderColor: 'rgba(255,255,255,0.9)',
                                                        },
                                                    }}
                                                    aria-label="Cancel command"
                                                >
                                                    Cancel
                                                </Button>
                                                {m?.executed && (
                                                    <Chip
                                                        size="small"
                                                        label="✅ Done"
                                                        sx={{
                                                            ml: 0.5,
                                                            fontWeight: 800,
                                                            background: palette.successBg,
                                                            color: palette.successText,
                                                            border: `1px solid ${alpha(colors.success, 0.5)}`,
                                                        }}
                                                    />
                                                )}
                                                {m?.cancelled && (
                                                    <Chip
                                                        size="small"
                                                        label="❌ Cancelled"
                                                        sx={{
                                                            ml: 0.5,
                                                            fontWeight: 800,
                                                            background: palette.cancelBg,
                                                            color: palette.cancelText,
                                                            border: `1px solid ${alpha(colors.error, 0.45)}`,
                                                        }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    )}

                                    {m?.response?.type === 'information' &&
                                        showSnapshot &&
                                        m?.response?.data && (
                                            <Box
                                                sx={{
                                                    mt: 1.8,
                                                    p: 1.8,
                                                    borderRadius: 2.5,
                                                    background: palette.snapshotBg,
                                                    border: `1px solid ${palette.snapshotBorder}`,
                                                }}
                                            >
                                                <Typography
                                                    variant="caption"
                                                    component="div"
                                                    sx={{
                                                        fontWeight: 900,
                                                        display: 'block',
                                                        mb: 1,
                                                        color: '#67e8f9',
                                                    }}
                                                >
                                                    📊 Project Snapshot
                                                </Typography>
                                                <Stack
                                                    direction="row"
                                                    spacing={1.5}
                                                    flexWrap="wrap"
                                                    rowGap={1}
                                                >
                                                    <Chip
                                                        size="small"
                                                        label={`Total: ${m?.response?.data?.tasks?.total ?? 0}`}
                                                        sx={{
                                                            fontWeight: 800,
                                                            background: alpha('#a78bfa', 0.22),
                                                            color: '#a78bfa',
                                                            border: `1px solid ${alpha('#a78bfa', 0.45)}`,
                                                        }}
                                                    />
                                                    {m?.response?.data?.tasks?.by_status &&
                                                        Object.entries(
                                                            m.response.data.tasks.by_status
                                                        ).map(([k, v]) => (
                                                            <Chip
                                                                key={k}
                                                                size="small"
                                                                label={`${k}: ${v}`}
                                                                sx={{
                                                                    fontWeight: 800,
                                                                    background: alpha(
                                                                        colors.secondary,
                                                                        0.22
                                                                    ),
                                                                    color: colors.secondary,
                                                                    border: `1px solid ${alpha(colors.secondary, 0.45)}`,
                                                                }}
                                                            />
                                                        ))}
                                                    {typeof m?.response?.data?.tasks?.overdue ===
                                                        'number' && (
                                                        <Chip
                                                            size="small"
                                                            label={`⚠️ Overdue: ${m.response.data.tasks.overdue}`}
                                                            sx={{
                                                                fontWeight: 800,
                                                                background: alpha(
                                                                    colors.error,
                                                                    0.22
                                                                ),
                                                                color: colors.error,
                                                                border: `1px solid ${alpha(colors.error, 0.45)}`,
                                                            }}
                                                        />
                                                    )}
                                                </Stack>
                                            </Box>
                                        )}

                                    {m?.error && (
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            spacing={0.75}
                                            sx={{ mt: 1.5 }}
                                        >
                                            <ErrorOutlineRoundedIcon
                                                fontSize="small"
                                                sx={{ color: '#ff4d6d' }}
                                            />
                                            <Typography
                                                variant="caption"
                                                component="span"
                                                sx={{ color: '#ff4d6d', fontWeight: 600 }}
                                            >
                                                Something went wrong. Please adjust and try again.
                                            </Typography>
                                        </Stack>
                                    )}
                                </Box>

                                {isUser && (
                                    <Avatar
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            mt: 0.5,
                                            background: 'linear-gradient(135deg, #f472b6, #a78bfa)',
                                            boxShadow: '0 0 16px rgba(244,114,182,0.55)',
                                        }}
                                    >
                                        <PersonOutlineRoundedIcon fontSize="small" />
                                    </Avatar>
                                )}
                            </Stack>
                        );
                    })}

                    {/* Loading indicator */}
                    {busy &&
                        messages.length > 0 &&
                        messages[messages.length - 1].role === 'user' && (
                            <Stack
                                direction="row"
                                spacing={1.5}
                                sx={{ my: 1.5, alignItems: 'flex-start' }}
                            >
                                <Avatar
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        mt: 0.5,
                                        background: `linear-gradient(135deg, ${colors.info}, ${colors.secondary})`,
                                        boxShadow: `0 0 16px ${alpha(colors.secondary, 0.6)}`,
                                    }}
                                >
                                    <SmartToyRoundedIcon fontSize="small" />
                                </Avatar>
                                <Box
                                    sx={{
                                        p: 1.8,
                                        borderRadius: 3,
                                        background: palette.asstBubble,
                                        border: `1px solid ${palette.asstBubbleBorder}`,
                                        boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
                                        borderTopLeftRadius: 10,
                                        borderBottomRightRadius: 18,
                                        maxWidth: 320,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: 3,
                                            background: palette.stripeAsst,
                                        },
                                    }}
                                >
                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        spacing={1}
                                        sx={{ mb: 0.5 }}
                                    >
                                        <Typography
                                            variant="caption"
                                            component="span"
                                            sx={{ fontWeight: 900, color: '#ecfeff' }}
                                        >
                                            Assistant
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            component="span"
                                            sx={{ color: 'rgba(255,255,255,0.95)' }}
                                        >
                                            {new Date().toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Typography>
                                    </Stack>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Box
                                            component="img"
                                            src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXZ6OXcxajF5aGIxZHB3dm5xdm95aWUzanJtaWljb2Y2M3VvcGY4aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LHZyixOnHwDDy/giphy.gif"
                                            alt="Thinking..."
                                            sx={{
                                                height: 60,
                                                width: 60,
                                                borderRadius: 1.5,
                                                mr: 1.5,
                                                border: '1px solid rgba(255,255,255,0.4)',
                                            }}
                                        />
                                        <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 700, color: '#ecfeff' }}
                                        >
                                            Thinking...
                                        </Typography>
                                    </Box>
                                </Box>
                            </Stack>
                        )}
                </Box>
            </DialogContent>

            <DialogActions
                sx={{
                    px: 2,
                    py: 1.5,
                    borderTop: `1px solid ${palette.ribbonBorder}`,
                    background: palette.ribbonBg,
                    backdropFilter: 'blur(10px)',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 2,
                }}
            >
                {!voiceMode ? (
                    // Text Input Mode
                    <>
                        <TextField
                            inputRef={inputRef}
                            fullWidth
                            size="small"
                            placeholder={isCustomView 
                                ? "Describe the SPA you want to create..." 
                                : "Type your message..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage(input.trim());
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 24,
                                    backgroundColor: palette.inputBg,
                                    '&:hover': { backgroundColor: palette.inputBgHover },
                                    '&.Mui-focused': {
                                        backgroundColor: palette.inputBgFocus,
                                        boxShadow: palette.inputRing,
                                    },
                                },
                                '& .MuiOutlinedInput-input': {
                                    py: 1.25,
                                    px: 2,
                                    color: 'white',
                                    fontWeight: 500,
                                    '&::placeholder': {
                                        color: 'rgba(255,255,255,0.85)',
                                    },
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: palette.borderSoft,
                                    borderWidth: 1.8,
                                },
                            }}
                        />
                        <Button
                            onClick={() => sendMessage(input.trim())}
                            disabled={!input.trim() || busy}
                            variant="contained"
                            sx={{
                                textTransform: 'none',
                                fontWeight: 900,
                                borderRadius: 24,
                                px: 2.8,
                                minWidth: 112,
                                height: 42,
                                background: palette.sendGradient,
                                color: '#ffffff',
                                boxShadow: palette.sendShadow,
                                '&:hover': {
                                    boxShadow: palette.sendShadowHover,
                                    transform: 'translateY(-1px) scale(1.03)',
                                    background: palette.sendGradientHover,
                                },
                                '&.Mui-focusVisible': {
                                    boxShadow: `${palette.sendShadow}, ${palette.sendFocusRing}`,
                                },
                                '&.Mui-disabled': {
                                    background: `linear-gradient(135deg, ${alpha(colors.secondary, 0.45)}, ${alpha(colors.primary, 0.45)})`,
                                    color: 'rgba(255,255,255,0.85)',
                                },
                                transition: 'all 0.25s ease',
                            }}
                            startIcon={!busy ? <SendRoundedIcon /> : null}
                            aria-label="Send message"
                        >
                            {busy ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Send'}
                        </Button>
                    </>
                ) : (
                    // Voice Input Mode
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            width: '100%',
                            minHeight: 42,
                        }}
                    >
                        {/* Voice Status Display */}
                        <Box
                            sx={{
                                flexGrow: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                px: 2,
                                py: 1.25,
                                borderRadius: 24,
                                backgroundColor: palette.inputBg,
                                border: `1.8px solid ${listening ? colors.secondary : palette.borderSoft}`,
                                minHeight: 42,
                                transition: 'all 0.25s ease',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: listening
                                        ? colors.secondary
                                        : 'rgba(255,255,255,0.4)',
                                    animation: listening ? `${pulse} 1.5s infinite` : 'none',
                                }}
                            />
                            <Typography
                                variant="body2"
                                sx={{
                                    color: listening ? 'white' : 'rgba(255,255,255,0.85)',
                                    fontWeight: listening ? 600 : 500,
                                    flexGrow: 1,
                                }}
                            >
                                {listening
                                    ? transcript || 'Listening... Speak now'
                                    : isProcessingVoice
                                      ? 'Processing speech...'
                                      : 'Tap microphone to start speaking'}
                            </Typography>
                        </Box>

                        {/* Voice Control Button */}
                        <IconButton
                            onClick={listening ? stopVoiceInput : startVoiceInput}
                            disabled={
                                busy || isProcessingVoice || !browserSupportsSpeechRecognition
                            }
                            sx={{
                                width: 56,
                                height: 42,
                                borderRadius: 24,
                                backgroundColor: listening ? colors.error : colors.secondary,
                                color: 'white',
                                boxShadow: listening
                                    ? `0 4px 20px ${alpha(colors.error, 0.4)}`
                                    : `0 4px 20px ${alpha(colors.secondary, 0.4)}`,
                                '&:hover': {
                                    backgroundColor: listening ? colors.error : colors.secondary,
                                    transform: 'translateY(-1px) scale(1.05)',
                                    boxShadow: listening
                                        ? `0 6px 24px ${alpha(colors.error, 0.5)}`
                                        : `0 6px 24px ${alpha(colors.secondary, 0.5)}`,
                                },
                                '&.Mui-disabled': {
                                    backgroundColor: alpha(colors.secondary, 0.3),
                                    color: 'rgba(255,255,255,0.5)',
                                },
                                transition: 'all 0.25s ease',
                                animation: listening ? `${pulse} 2s infinite` : 'none',
                            }}
                            aria-label={listening ? 'Stop listening' : 'Start voice input'}
                        >
                            {isProcessingVoice ? (
                                <CircularProgress size={20} sx={{ color: 'inherit' }} />
                            ) : listening ? (
                                <MicOffRoundedIcon />
                            ) : (
                                <MicRoundedIcon />
                            )}
                        </IconButton>
                    </Box>
                )}
            </DialogActions>
        </Dialog>
    );
}
