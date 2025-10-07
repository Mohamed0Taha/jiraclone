import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateCustomView } from '@/lib/ai-actions';
import { router, usePage } from '@inertiajs/react';
import { csrfFetch } from '@/utils/csrf';
import { route } from 'ziggy-js';
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
    useTheme,
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

const toTitleCase = (value) => {
    if (!value) return '';
    return String(value)
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
};

const formatPlanValue = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => formatPlanValue(item)).join(', ');
    }

    if (value && typeof value === 'object') {
        const entries = Object.entries(value).filter(([, v]) => v !== undefined && v !== null);
        if (entries.length === 1 && entries[0][0] === 'id') {
            const idVal = entries[0][1];

            return typeof idVal === 'number' ? `#${idVal}` : String(idVal);
        }

        return entries
            .map(([key, val]) => `${toTitleCase(key)}: ${formatPlanValue(val)}`)
            .join(' • ');
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (value === null || typeof value === 'undefined') {
        return '—';
    }

    return String(value);
};

const summarizeCommandPlan = (plan) => {
    if (!plan || typeof plan !== 'object') {
        return [];
    }

    const rows = [];
    const append = (label, value) => {
        const formatted = formatPlanValue(value);
        if (formatted && formatted !== '—') {
            rows.push({ label, value: formatted });
        }
    };

    if (plan.type) {
        append('Action', toTitleCase(plan.type));
    }

    if (plan.selector && Object.keys(plan.selector).length > 0) {
        append('Selector', plan.selector);
    }

    if (plan.filters && Object.keys(plan.filters).length > 0) {
        append('Filters', plan.filters);
    }

    if (plan.payload && Object.keys(plan.payload).length > 0) {
        append('Payload', plan.payload);
    }

    if (plan.changes && Object.keys(plan.changes).length > 0) {
        append('Changes', plan.changes);
    }

    if (plan.updates && Object.keys(plan.updates).length > 0) {
        append('Updates', plan.updates);
    }

    if (plan.assignee) {
        append('Assignee', plan.assignee);
    }

    if (plan.assignee_hint) {
        append('Assignee Hint', plan.assignee_hint);
    }

    if (plan.limit || plan.order || plan.order_by) {
        append('Window', {
            limit: plan.limit,
            order: plan.order,
            order_by: plan.order_by,
        });
    }

    return rows;
};

const sanitizeAssistantText = (text) => {
    if (!text) return '';
    return text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trim();
};

const stripClassifierFooter = (text) => {
    if (!text) return '';

    return text
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => !/^(intent|tool|rephrased|classification|confidence|intentions?)\s*:/i.test(line.trim()))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const structureAssistantMessage = (text) => {
    const sanitized = stripClassifierFooter(sanitizeAssistantText(text));
    if (!sanitized) {
        return [];
    }

    const lines = sanitized.split(/\r?\n/);
    const blocks = [];
    let listBuffer = null;

    const flushList = () => {
        if (listBuffer && listBuffer.length > 0) {
            blocks.push({ type: 'list', items: listBuffer });
        }
        listBuffer = null;
    };

    lines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (line === '') {
            flushList();
            return;
        }

        if (/^(intent|tool|rephrased|classification|confidence|intentions?)\s*:/i.test(line)) {
            // Skip classifier metadata the backend may include for debugging
            return;
        }

        const bulletMatch = line.match(/^(?:[•*\-]|\d+\.)\s*(.+)$/);
        if (bulletMatch) {
            if (!listBuffer) {
                listBuffer = [];
            }
            listBuffer.push(bulletMatch[1]);

            return;
        }

        flushList();
        blocks.push({ type: 'paragraph', text: line });
    });

    flushList();

    return blocks;
};

export default function AssistantChat({ project, tasks, allTasks, users, methodology, open, onClose, isCustomView = false, onSpaGenerated = null, viewName, currentComponentCode = null }) {
    const { t } = useTranslation();
    const theme = useTheme();
    const palette = useMemo(() => {
        const isDark = theme.palette.mode === 'dark';
        const primary = theme.palette.primary?.main ?? '#2563eb';
        const primaryDark = theme.palette.primary?.dark ?? '#1e3a8a';
        const secondary = theme.palette.secondary?.main ?? '#0ea5e9';
        const secondaryDark = theme.palette.secondary?.dark ?? '#0369a1';
        const success = theme.palette.success?.main ?? '#16a34a';
        const warning = theme.palette.warning?.main ?? '#d97706';
        const error = theme.palette.error?.main ?? '#dc2626';
        const info = theme.palette.info?.main ?? '#2563eb';
        const grey = theme.palette.grey ?? {};

        const tone = {
            primary,
            primaryDark,
            secondary,
            secondaryDark,
            success,
            warning,
            error,
            info,
            neutral: {
                50: grey[50] ?? '#f8fafc',
                100: grey[100] ?? '#f1f5f9',
                200: grey[200] ?? '#e2e8f0',
                300: grey[300] ?? '#cbd5f5',
                400: grey[400] ?? '#94a3b8',
                500: grey[500] ?? '#64748b',
                600: grey[600] ?? '#475569',
            },
        };

        const lightPalette = {
            tone,
            appBg: 'linear-gradient(180deg, #f3f4f6 0%, #ffffff 80%)',
            panelBg: '#ffffff',
            panelBorder: 'rgba(148,163,184,0.18)',
            panelShadow: '0 24px 48px rgba(15,23,42,0.12)',
            titleBg: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            headerText: '#ffffff',
            headerIcon: 'rgba(255,255,255,0.92)',
            projectChipBg: 'rgba(255,255,255,0.18)',
            projectChipBorder: 'rgba(255,255,255,0.22)',
            projectChipText: '#ffffff',
            ribbonBg: 'rgba(255,255,255,0.92)',
            ribbonBorder: 'rgba(148,163,184,0.25)',
            ribbonLabel: '#1f2937',
            ribbonText: '#334155',
            ribbonTextMuted: '#64748b',
            chipGold: '#1d4ed8',
            chipGoldBg: '#dbeafe',
            chipGoldHover: '#bfdbfe',
            chipGoldBorder: '#bfdbfe',
            scrollbar: 'rgba(148,163,184,0.55)',
            scrollTrack: '#f1f5f9',
            asstBubble: '#ffffff',
            asstBubbleBorder: 'rgba(15,23,42,0.08)',
            assistantStripe: 'linear-gradient(90deg, rgba(14,165,233,0.18), rgba(59,130,246,0.16))',
            stripeAsst: 'linear-gradient(90deg, rgba(14,165,233,0.18), rgba(59,130,246,0.16))',
            assistantText: '#1f2937',
            userBubble: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            userBubbleBorder: 'rgba(29,78,216,0.35)',
            userStripe: 'linear-gradient(90deg, rgba(251,191,36,0.28), rgba(255,255,255,0))',
            stripeUser: 'linear-gradient(90deg, rgba(251,191,36,0.28), rgba(255,255,255,0))',
            userText: '#ffffff',
            metaCaption: '#475569',
            metaTime: '#64748b',
            inputBg: '#ffffff',
            inputBgHover: '#f8fafc',
            inputBgFocus: '#f1f5f9',
            inputOutline: 'rgba(148,163,184,0.45)',
            inputFocusRing: '0 0 0 2px rgba(37,99,235,0.18)',
            sendGradient: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
            sendGradientHover: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
            sendShadow: '0 14px 30px rgba(14,116,233,0.18)',
            sendShadowHover: '0 16px 34px rgba(14,116,233,0.26)',
            successBg: '#dcfce7',
            successText: '#15803d',
            cancelBg: '#fee2e2',
            cancelText: '#dc2626',
            dangerBg: '#fdecec',
            dangerBorder: '#fca5a5',
            commandPreviewBg: '#fef3c7',
            commandPreviewBorder: '#facc15',
            deletePreviewBg: '#fee2e2',
            deletePreviewBorder: '#f87171',
            snapshotBg: '#e0f2fe',
            snapshotBorder: '#93c5fd',
            badgeBg: '#e0f2fe',
            badgeText: '#1d4ed8',
            isDark,
        };

        const darkPalette = {
            tone,
            appBg: 'radial-gradient(circle at 10% -10%, rgba(14,32,58,0.9) 0%, rgba(2,6,15,0.95) 55%, rgba(1,3,10,0.98) 100%)',
            panelBg: alpha('#0b1220', 0.94),
            panelBorder: 'rgba(148,163,184,0.14)',
            panelShadow: '0 32px 68px rgba(3,7,18,0.65)',
            titleBg: 'linear-gradient(120deg, rgba(30,41,59,0.95), rgba(51,65,85,0.92))',
            headerText: '#f8fbff',
            headerIcon: 'rgba(226,232,240,0.9)',
            projectChipBg: 'rgba(148,163,184,0.12)',
            projectChipBorder: 'rgba(148,163,184,0.24)',
            projectChipText: '#f1f5f9',
            ribbonBg: 'rgba(8,14,24,0.88)',
            ribbonBorder: 'rgba(148,163,184,0.18)',
            ribbonLabel: 'rgba(148,163,184,0.7)',
            ribbonText: 'rgba(226,232,240,0.92)',
            ribbonTextMuted: 'rgba(148,163,184,0.6)',
            chipGold: '#facc15',
            chipGoldBg: 'rgba(250,204,21,0.12)',
            chipGoldHover: 'rgba(250,204,21,0.2)',
            chipGoldBorder: 'rgba(250,204,21,0.3)',
            scrollbar: 'rgba(148,163,184,0.45)',
            scrollTrack: 'rgba(14,20,32,0.55)',
            asstBubble: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(51,65,85,0.92))',
            asstBubbleBorder: 'rgba(148,163,184,0.25)',
            assistantStripe: 'linear-gradient(90deg, rgba(56,189,248,0.28), rgba(59,130,246,0.2))',
            stripeAsst: 'linear-gradient(90deg, rgba(56,189,248,0.28), rgba(59,130,246,0.2))',
            assistantText: 'rgba(241,245,249,0.95)',
            userBubble: 'linear-gradient(135deg, rgba(59,130,246,0.9), rgba(37,99,235,0.85))',
            userBubbleBorder: 'rgba(96,165,250,0.3)',
            userStripe: 'linear-gradient(90deg, rgba(250,204,21,0.32), rgba(148,163,184,0.2))',
            stripeUser: 'linear-gradient(90deg, rgba(250,204,21,0.32), rgba(148,163,184,0.2))',
            userText: '#ffffff',
            metaCaption: 'rgba(148,163,184,0.75)',
            metaTime: 'rgba(148,163,184,0.55)',
            inputBg: 'rgba(15,23,42,0.65)',
            inputBgHover: 'rgba(23,37,69,0.72)',
            inputBgFocus: 'rgba(30,41,59,0.8)',
            inputOutline: 'rgba(59,130,246,0.35)',
            inputFocusRing: '0 0 0 2px rgba(59,130,246,0.25)',
            sendGradient: `linear-gradient(135deg, ${secondary}, ${primary})`,
            sendGradientHover: `linear-gradient(135deg, ${primary}, ${secondary})`,
            sendShadow: '0 10px 28px rgba(15,23,42,0.65)',
            sendShadowHover: '0 12px 30px rgba(15,23,42,0.7)',
            successBg: 'rgba(34,197,94,0.18)',
            successText: success,
            cancelBg: 'rgba(248,113,113,0.12)',
            cancelText: error,
            dangerBg: 'rgba(220,88,88,0.14)',
            dangerBorder: 'rgba(220,38,38,0.3)',
            commandPreviewBg: 'rgba(245,158,11,0.18)',
            commandPreviewBorder: 'rgba(253,224,71,0.35)',
            deletePreviewBg: 'rgba(239,68,68,0.18)',
            deletePreviewBorder: 'rgba(248,113,113,0.42)',
            snapshotBg: 'rgba(14,165,233,0.12)',
            snapshotBorder: 'rgba(56,189,248,0.28)',
            badgeBg: 'rgba(56,189,248,0.16)',
            badgeText: 'rgba(125,211,252,0.9)',
            isDark,
        };

        return isDark ? darkPalette : lightPalette;
    }, [theme]);

    const tone = palette.tone;
    const neutral = tone.neutral;
    const isDarkMode = palette.isDark;

    useEffect(() => {
        if (open && isCustomView) {
            console.log('[AssistantChat Debug] Dialog opened - Project data:', project);
            console.log('[AssistantChat Debug] Dialog opened - Tasks data:', tasks);
            console.log('[AssistantChat Debug] Dialog opened - All tasks data:', allTasks);
            console.log('[AssistantChat Debug] Dialog opened - Users data:', users);
            console.log('[AssistantChat Debug] Dialog opened - Methodology:', methodology);
        }
    }, [open, isCustomView, project, tasks, allTasks, users, methodology]);

    // Methodology-aware status mapping (matches the backend ProjectContextService)
    const getMethodologyStatusLabels = (methodology) => {
        switch (methodology) {
            case 'waterfall':
                return {
                    todo: 'Requirements',
                    inprogress: 'Design',
                    review: 'Verification',
                    done: 'Maintenance'
                };
            case 'lean':
                return {
                    todo: 'Backlog',
                    inprogress: 'Todo',
                    review: 'Testing',
                    done: 'Done'
                };
            case 'scrum':
            case 'agile':
                return {
                    todo: 'Backlog',
                    inprogress: 'In Progress',
                    review: 'Testing',
                    done: 'Done'
                };
            case 'kanban':
            default:
                return {
                    todo: 'Todo',
                    inprogress: 'In Progress',
                    review: 'Review',
                    done: 'Done'
                };
        }
    };

    const statusLabels = getMethodologyStatusLabels(methodology || 'kanban');
    const { props } = usePage();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [busy, setBusy] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [expandedPlanIndex, setExpandedPlanIndex] = useState(null);
    const [pendingCommand, setPendingCommand] = useState(null);
    const [generationProgress, setGenerationProgress] = useState(null); // New state for SPA generation progress

    // Voice interaction state
    const [voiceMode, setVoiceMode] = useState(false);
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);

    // AI Enhancement state - Default to enabled
    const [aiEnhanced, setAiEnhanced] = useState(true);
    const [capabilities, setCapabilities] = useState({});

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

    const fetchCapabilities = async () => {
        try {
            console.log('🔍 Fetching AI capabilities for project:', project.id);
            const response = await fetch(route('projects.assistant.capabilities', project.id));
            const data = await response.json();
            console.log('📊 Capabilities response:', data);
            if (data.success) {
                setCapabilities(data.capabilities);
                setAiEnhanced(data.capabilities.ai_enhanced ?? true); // Default to true
                console.log('✅ AI Enhanced state:', data.capabilities.ai_enhanced ?? true);
            }
        } catch (err) {
            console.error('❌ Failed to fetch capabilities:', err);
        }
    };

    // AI Enhancement is now always enabled by default
    // No toggle function needed

    useEffect(() => {
        if (!open) return;

        // Fetch AI capabilities when dialog opens
        fetchCapabilities();

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
                .catch(() => { });
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
                    text: stripClassifierFooter(data?.message || 'Command executed.'),
                    response: data,
                    ts: Date.now(),
                });
                return next;
            });
            setExpandedPlanIndex(null);

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
            setExpandedPlanIndex(null);
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
        setExpandedPlanIndex(null);
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

        // For custom view mode, show detailed progress
        if (isCustomView) {
            setGenerationProgress({
                step: 1,
                total: 4,
                message: '🔍 Analyzing your request...'
            });
        }

        try {
            const payload = {
                message: text,
                session_id: sessionRef.current,
                view_name: (typeof window !== 'undefined' ? window?.Ziggy?.route?.params?.name : null) || (isCustomView ? (props?.viewName || viewName || 'default') : 'default'),
                conversation_history: messages.map((m) => ({
                    role: m.role,
                    content: m.text,
                })),
                // Include project context for AI to generate data-aware components
                project_context: isCustomView ? {
                    project: {
                        id: project?.id,
                        name: project?.name,
                        description: project?.description,
                        key: project?.key,
                        start_date: project?.start_date,
                        end_date: project?.end_date,
                        meta: project?.meta,
                        methodology: methodology || 'kanban',
                    },
                    methodology: {
                        name: methodology || 'kanban',
                        status_labels: statusLabels,
                        description: `This project uses ${methodology || 'kanban'} methodology. Use the correct status terminology in generated components.`
                    },
                    tasks: tasks ? {
                        todo: (tasks.todo || []).map(t => ({
                            id: t.id,
                            title: t.title,
                            status: t.status,
                            description: t.description,
                            priority: t.priority,
                            due_date: t.due_date || t.end_date || null,
                            assignee: t.assignee?.name || null,
                            creator: t.creator?.name || null,
                        })),
                        inprogress: (tasks.inprogress || []).map(t => ({
                            id: t.id,
                            title: t.title,
                            status: t.status,
                            description: t.description,
                            priority: t.priority,
                            due_date: t.due_date || t.end_date || null,
                            assignee: t.assignee?.name || null,
                            creator: t.creator?.name || null,
                        })),
                        review: (tasks.review || []).map(t => ({
                            id: t.id,
                            title: t.title,
                            status: t.status,
                            description: t.description,
                            priority: t.priority,
                            due_date: t.due_date || t.end_date || null,
                            assignee: t.assignee?.name || null,
                            creator: t.creator?.name || null,
                        })),
                        done: (tasks.done || []).map(t => ({
                            id: t.id,
                            title: t.title,
                            status: t.status,
                            description: t.description,
                            priority: t.priority,
                            due_date: t.due_date || t.end_date || null,
                            assignee: t.assignee?.name || null,
                            creator: t.creator?.name || null,
                        })),
                        // Include additional status categories
                        backlog: (tasks.backlog || []).map(t => ({
                            id: t.id,
                            title: t.title,
                            status: t.status,
                            description: t.description,
                            priority: t.priority,
                            due_date: t.due_date || t.end_date || null,
                            assignee: t.assignee?.name || null,
                            creator: t.creator?.name || null,
                        })),
                        testing: (tasks.testing || []).map(t => ({
                            id: t.id,
                            title: t.title,
                            status: t.status,
                            description: t.description,
                            priority: t.priority,
                            due_date: t.due_date || t.end_date || null,
                            assignee: t.assignee?.name || null,
                            creator: t.creator?.name || null,
                        })),
                        total_count: (tasks.todo?.length || 0) + (tasks.inprogress?.length || 0) + (tasks.review?.length || 0) + (tasks.done?.length || 0) + (tasks.backlog?.length || 0) + (tasks.testing?.length || 0),
                        completion_rate: Math.round(((tasks.done?.length || 0) / Math.max(1, (tasks.todo?.length || 0) + (tasks.inprogress?.length || 0) + (tasks.review?.length || 0) + (tasks.done?.length || 0) + (tasks.backlog?.length || 0) + (tasks.testing?.length || 0))) * 100),
                    } : null,
                    // Also include all tasks as a flat array for easier processing
                    all_tasks: allTasks ? allTasks.map(t => ({
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        description: t.description,
                        priority: t.priority,
                        due_date: t.due_date || t.end_date || null,
                        assignee: t.assignee?.name || null,
                        creator: t.creator?.name || null,
                        created_at: t.created_at,
                        updated_at: t.updated_at,
                    })) : [],
                    users: users ? users.map(u => ({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                    })) : [],
                } : null,
                // ALWAYS CREATE NEW COMPONENT: Include current component only as reference for understanding context
                // but don't ask AI to modify it directly - instead create entirely new component with full conversation history
                current_component_reference: isCustomView && currentComponentCode ? {
                    code: currentComponentCode,
                    length: currentComponentCode.length,
                    note: "This is the current component for reference only. Create a completely new component that incorporates both the previous functionality and the new request."
                } : null,
            };

            // Debug the payload being sent
            console.log('[AssistantChat Debug] Payload being sent to API:', {
                isCustomView: isCustomView,
                hasProjectContext: !!payload.project_context,
                hasCurrentComponentReference: !!payload.current_component_reference,
                currentComponentLength: payload.current_component_reference ? payload.current_component_reference.length : 0,
                projectContextSummary: payload.project_context ? {
                    project_name: payload.project_context.project?.name,
                    methodology: payload.project_context.methodology?.name,
                    tasks_summary: {
                        todo: payload.project_context.tasks?.todo?.length || 0,
                        inprogress: payload.project_context.tasks?.inprogress?.length || 0,
                        review: payload.project_context.tasks?.review?.length || 0,
                        done: payload.project_context.tasks?.done?.length || 0,
                    },
                    all_tasks_count: payload.project_context.all_tasks?.length || 0,
                    users_count: payload.project_context.users?.length || 0,
                } : null,
                conversationLength: payload.conversation_history?.length || 0,
                approach: "Creating new component with full conversation history instead of modifying existing"
            });

            // Route to different endpoints based on context
            const endpoint = isCustomView
                ? `/projects/${project.id}/custom-views/chat` // moved from /api to web route for session auth
                : `/projects/${project.id}/assistant/chat`;

            // Update progress for custom view
            if (isCustomView) {
                setGenerationProgress({
                    step: 2,
                    total: 4,
                    message: '🤖 Generating custom application with AI...'
                });
            }

            // Use streaming client for custom view mode to align with AI SDK-like structure
            if (isCustomView) {
                await generateCustomView({
                    projectId: project.id,
                    viewName: payload.view_name,
                    message: payload.message,
                    conversationHistory: payload.conversation_history,
                    projectContext: payload.project_context,
                    currentComponentCode: payload.current_component_reference?.code || null,
                    onEvent: (evt) => {
                        if (!evt) return;
                        if (evt.type === 'status') {
                            setGenerationProgress({ step: evt.stage || 1, total: evt.total || 4, message: evt.message || 'Processing...' });
                        } else if (evt.type === 'spa_generated' && evt.html) {
                            setGenerationProgress({ step: 4, total: 4, message: '🎉 Your custom application is ready!' });
                            const asstMsg = {
                                role: 'assistant',
                                text: stripClassifierFooter(evt.message || 'Generated your custom application!'),
                                response: evt,
                                ts: Date.now(),
                            };
                            setMessages((prev) => [...prev, asstMsg]);
                            setExpandedPlanIndex(null);
                            if (onSpaGenerated) onSpaGenerated(evt.html, evt);
                            setTimeout(() => setGenerationProgress(null), 1500);
                        } else if (evt.type === 'error') {
                            setMessages((prev) => [
                                ...prev,
                                { role: 'assistant', text: `Error: ${evt.message || 'Generation failed'}`, error: true, ts: Date.now(), response: { type: 'error' } },
                            ]);
                            setExpandedPlanIndex(null);
                        }
                    },
                });
                setBusy(false);
                return;
            }

            // Non-custom view path: keep existing JSON-based assistant chat
            const response = await csrfFetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response. Please check your connection and try again.');
            }
            const data = await response.json();

            // Handle enhanced conversation flow responses
            if (data?.type === 'conversation_continue') {
                // AI is asking questions or needs clarification
                setGenerationProgress({
                    step: 2,
                    total: 4,
                    message: '🤔 AI needs more information...'
                });

                setTimeout(() => setGenerationProgress(null), 2000);

                const asstMsg = {
                    role: 'assistant',
                    text: stripClassifierFooter(data?.message || 'I need some clarification to provide you with the best solution.'),
                    response: data,
                    conversation_type: data?.response_type,
                    requires_response: data?.requires_user_response,
                    ts: Date.now(),
                };

                setMessages((prev) => [...prev, asstMsg]);
                setExpandedPlanIndex(null);
                setBusy(false);
                return;
            }

            // Handle custom view SPA generation
            if (isCustomView && data?.type === 'spa_generated' && data?.html) {
                // Update progress
                setGenerationProgress({
                    step: 3,
                    total: 4,
                    message: '✨ Enhancing your application...'
                });

                // Short delay to show progress
                await new Promise(resolve => setTimeout(resolve, 500));

                setGenerationProgress({
                    step: 4,
                    total: 4,
                    message: '🎉 Your custom application is ready!'
                });

                const asstMsg = {
                    role: 'assistant',
                    text: stripClassifierFooter(data?.message || 'Generated your custom application!'),
                    response: data,
                    ts: Date.now(),
                };

                setMessages((prev) => [...prev, asstMsg]);
                setExpandedPlanIndex(null);

                // Notify parent component about the generated SPA
                if (onSpaGenerated) {
                    onSpaGenerated(data.html, data);
                }

                // Clear progress after a moment
                setTimeout(() => setGenerationProgress(null), 2000);
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
                setExpandedPlanIndex(null);
                setBusy(false);
                return;
            }

            const asstMsg = {
                role: 'assistant',
                text: stripClassifierFooter(data?.message || data?.content || ''),
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
            setExpandedPlanIndex(null);
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
            setExpandedPlanIndex(null);
        } finally {
            setBusy(false);
            setGenerationProgress(null);
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
        setExpandedPlanIndex(null);
    };

    const handleSuggestion = (s) => sendMessage(s);

    const copyMessage = async (idx, text) => {
        try {
            await navigator.clipboard.writeText(text || '');
            setCopiedIndex(idx);
            setTimeout(() => setCopiedIndex(null), 1200);
        } catch { }
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
                    border: `1px solid ${palette.panelBorder}`,
                    boxShadow: palette.panelShadow,
                    display: 'flex',
                    width: 'clamp(420px, 92vw, 900px)',
                    minWidth: 420,
                    height: '86vh',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    pl: 3,
                    pr: 6,
                    py: 1.5,
                    background: palette.titleBg,
                    borderBottom: `1px solid ${palette.panelBorder}`,
                    color: palette.headerText,
                    position: 'relative',
                }}
            >
                <Avatar
                    sx={{
                        width: 36,
                        height: 36,
                        background: `linear-gradient(140deg, ${tone.secondary}, ${tone.primary})`,
                        border: `1px solid ${alpha(tone.primaryDark, 0.4)}`,
                        boxShadow: `0 12px 28px ${alpha(tone.primaryDark, 0.35)}`,
                        animation: `${pulse} 2.6s ease-in-out infinite`,
                    }}
                >
                    <SmartToyRoundedIcon fontSize="small" sx={{ color: palette.headerIcon }} />
                </Avatar>
                <Typography
                    variant="subtitle1"
                    component="div"
                    sx={{
                        fontWeight: 700,
                        letterSpacing: 0.25,
                        color: palette.headerText,
                    }}
                >
                    {isCustomView ? 'Custom SPA Generator' : 'Project Assistant'}
                </Typography>
                <Chip
                    size="small"
                    label={project?.name || 'Project'}
                    sx={{
                        ml: 1.5,
                        fontWeight: 600,
                        height: 24,
                        px: 1.25,
                        borderRadius: 999,
                        background: palette.projectChipBg,
                        border: `1px solid ${palette.projectChipBorder}`,
                        color: palette.projectChipText,
                        textTransform: 'none',
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
                                    color: tone.secondary,
                                    '& + .MuiSwitch-track': {
                                        backgroundColor: alpha(tone.secondary, 0.65),
                                    },
                                },
                                '& .MuiSwitch-track': {
                                    backgroundColor: alpha(palette.headerIcon, 0.25),
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
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 600, color: alpha(palette.headerText, 0.85) }}
                            >
                                {voiceMode ? t('aiTask.voice') : t('common.text')}
                            </Typography>
                        </Box>
                    }
                    sx={{
                        ml: 2.5,
                        '& .MuiFormControlLabel-label': {
                            color: alpha(palette.headerText, 0.9),
                        },
                    }}
                />

                <IconButton
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        color: palette.headerIcon,
                        '&:hover': {
                            color: palette.headerText,
                        },
                    }}
                    aria-label={t('assistantChat.close')}
                >
                    <CloseRoundedIcon fontSize="small" />
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
                    backgroundColor: palette.panelBg,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: isCustomView
                            ? 'linear-gradient(145deg, rgba(8,15,30,0.35), rgba(3,8,18,0.15))'
                            : 'linear-gradient(145deg, rgba(15,23,42,0.08), rgba(15,23,42,0.02))',
                        pointerEvents: 'none',
                    },
                }}
            >
                {/* Suggestions ribbon */}
                <Box
                    sx={{
                        px: 2.75,
                        py: 1.5,
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        background: palette.ribbonBg,
                        backdropFilter: 'blur(18px)',
                        borderBottom: `1px solid ${palette.ribbonBorder}`,
                    }}
                >
                    {suggestions.length > 0 ? (
                        <Stack
                            direction="row"
                            spacing={1}
                            sx={{ flexWrap: 'wrap', rowGap: 0.9, alignItems: 'center' }}
                        >
                            <Typography
                                variant="caption"
                                component="span"
                                sx={{
                                    fontWeight: 700,
                                    pr: 0.75,
                                    alignSelf: 'center',
                                    color: palette.ribbonLabel,
                                    textTransform: 'uppercase',
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
                                        border: `1px solid ${palette.chipGoldBorder}`,
                                        background: palette.chipGoldBg,
                                        color: palette.chipGold,
                                        '&:hover': {
                                            background: palette.chipGoldHover,
                                            transform: 'translateY(-1px)',
                                            boxShadow: `0 6px 18px ${alpha(palette.chipGold, 0.24)}`,
                                        },
                                        transition: 'all 0.2s ease',
                                        fontWeight: 600,
                                        letterSpacing: 0.15,
                                        textTransform: 'none',
                                    }}
                                />
                            ))}
                        </Stack>
                    ) : (
                        <Typography
                            variant="caption"
                            component="span"
                            sx={{
                                opacity: 0.85,
                                color: palette.ribbonTextMuted,
                                fontWeight: 500,
                                letterSpacing: 0.15,
                            }}
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
                                    src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXZ6OXcxajF5aGIxZHB3dm5xdm95aWUzanJtaWljb2Y2M3VvcGY4aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LHZyixOnHwDDy/giphy.gif"
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
                                        background: alpha(tone.error, 0.18),
                                        color: tone.error,
                                        fontWeight: 600,
                                        letterSpacing: 0.1,
                                        mb: 1,
                                        border: `1px solid ${alpha(tone.error, 0.28)}`,
                                        textTransform: 'none',
                                    }}
                                />
                                <Chip
                                    label="Move Review → Done"
                                    sx={{
                                        background: alpha(tone.primary, 0.16),
                                        color: tone.primary,
                                        fontWeight: 600,
                                        letterSpacing: 0.1,
                                        mb: 1,
                                        border: `1px solid ${alpha(tone.primary, 0.28)}`,
                                        textTransform: 'none',
                                    }}
                                />
                                <Chip
                                    label="Assign tasks to Alex"
                                    sx={{
                                        background: alpha(tone.secondary, 0.18),
                                        color: tone.secondaryDark,
                                        fontWeight: 600,
                                        letterSpacing: 0.1,
                                        mb: 1,
                                        border: `1px solid ${alpha(tone.secondary, 0.28)}`,
                                        textTransform: 'none',
                                    }}
                                />
                                <Chip
                                    label="How many tasks are done?"
                                    sx={{
                                        background: palette.chipGoldBg,
                                        color: palette.chipGold,
                                        fontWeight: 600,
                                        letterSpacing: 0.1,
                                        mb: 1,
                                        border: `1px solid ${palette.chipGoldBorder}`,
                                        textTransform: 'none',
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

                    const planSummary = summarizeCommandPlan(cmdData);
                    const planExpanded = expandedPlanIndex === idx;
                    const structuredContent = !isUser ? structureAssistantMessage(m?.text || '') : [];
                    const previewBackground = isDeleteCommand
                        ? (palette.deletePreviewBg ?? palette.dangerBg)
                        : (palette.commandPreviewBg ?? alpha(tone.warning, 0.15));
                    const previewBorder = isDeleteCommand
                        ? (palette.deletePreviewBorder ?? palette.dangerBorder)
                        : (palette.commandPreviewBorder ?? alpha(tone.warning, 0.45));
                    const previewTitleColor = isDeleteCommand
                        ? (isDarkMode ? '#fca5a5' : '#b91c1c')
                        : (isDarkMode ? '#facc15' : '#b45309');
                    const previewBodyColor = isDarkMode ? 'rgba(248,250,252,0.95)' : '#1f2937';
                    const previewListColor = isDarkMode ? 'rgba(248,250,252,0.92)' : '#1f2937';

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
                                            background: `linear-gradient(145deg, ${tone.secondary}, ${tone.secondaryDark})`,
                                            border: `1px solid ${alpha(tone.secondaryDark, 0.4)}`,
                                            boxShadow: `0 10px 22px ${alpha(tone.secondaryDark, 0.35)}`,
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
                                        boxShadow: isUser
                                            ? `0 12px 26px ${alpha(tone.primaryDark, 0.22)}`
                                            : `0 12px 26px ${alpha(tone.secondaryDark, 0.18)}`,
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
                                                fontWeight: 700,
                                                color: isUser
                                                    ? alpha(palette.userText, 0.9)
                                                    : alpha(palette.assistantText, 0.85),
                                            }}
                                        >
                                            {isUser ? 'You' : 'Assistant'}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            component="span"
                                            sx={{
                                                color: isUser
                                                    ? (palette.isDark
                                                        ? alpha(palette.userText, 0.8)
                                                        : 'rgba(255,255,255,0.9)')
                                                    : alpha(palette.metaTime, 0.85),
                                            }}
                                        >
                                            {new Date(m?.ts || Date.now()).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Typography>
                                        {!isUser && (
                                            <Tooltip title={t('assistantChat.copyMessage')}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => copyMessage(idx, m?.text)}
                                                    sx={{ ml: 'auto' }}
                                                    aria-label={t('assistantChat.copyMessage')}
                                                >
                                                    {copiedIndex === idx ? (
                                                        <CheckRoundedIcon
                                                            fontSize="small"
                                                            sx={{ color: palette.assistantText }}
                                                        />
                                                    ) : (
                                                        <ContentCopyRoundedIcon
                                                            fontSize="small"
                                                            sx={{ color: alpha(palette.assistantText, 0.85) }}
                                                        />
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>

                                    {structuredContent.length > 0 ? (
                                        <Stack spacing={1.1} sx={{ mt: 0.5 }}>
                                            {structuredContent.map((block, blockIdx) => {
                                                if (block.type === 'list') {
                                                    return (
                                                        <Stack
                                                            key={`list-${blockIdx}`}
                                                            component="ul"
                                                            spacing={0.6}
                                                            sx={{
                                                                pl: 2.2,
                                                                m: 0,
                                                                listStyleType: 'disc',
                                                                color: palette.assistantText,
                                                            }}
                                                        >
                                                            {block.items.map((item, itemIdx) => (
                                                                <Box
                                                                    key={`list-${blockIdx}-item-${itemIdx}`}
                                                                    component="li"
                                                                    sx={{
                                                                        fontSize: '0.95rem',
                                                                        lineHeight: 1.65,
                                                                    }}
                                                                >
                                                                    {item}
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    );
                                                }

                                                return (
                                                    <Typography
                                                        key={`paragraph-${blockIdx}`}
                                                        variant="body2"
                                                        sx={{
                                                            lineHeight: 1.7,
                                                            color: palette.assistantText,
                                                            fontWeight: 500,
                                                        }}
                                                    >
                                                        {block.text}
                                                    </Typography>
                                                );
                                            })}
                                        </Stack>
                                    ) : (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                whiteSpace: 'pre-wrap',
                                                lineHeight: 1.7,
                                                color: isUser ? palette.userText : palette.assistantText,
                                                fontWeight: 500,
                                            }}
                                        >
                                            {m?.text}
                                        </Typography>
                                    )}

                                    {needsConfirm && (
                                        <Box
                                            sx={{
                                                mt: 1.8,
                                                p: 1.8,
                                                borderRadius: 2.5,
                                                border: `1px solid ${previewBorder}`,
                                                background: previewBackground,
                                            }}
                                        >
                                            <Typography
                                                variant="caption"
                                                component="div"
                                                sx={{
                                                    fontWeight: 900,
                                                    display: 'block',
                                                    mb: 0.8,
                                                    color: previewTitleColor,
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
                                                    color: previewBodyColor,
                                                }}
                                            >
                                                {m?.response?.message}
                                            </Typography>

                                        {planSummary.length > 0 && (
                                            <Stack
                                                component="ul"
                                                spacing={0.6}
                                                sx={{
                                                    pl: 2,
                                                    mt: 1.2,
                                                    color: previewListColor,
                                                    listStyleType: 'disc',
                                                }}
                                            >
                                                {planSummary.map((item, itemIdx) => (
                                                    <Box
                                                        component="li"
                                                        key={`plan-summary-${itemIdx}`}
                                                        sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}
                                                    >
                                                        <Box component="span" sx={{ fontWeight: 700 }}>
                                                            {item.label}:
                                                        </Box>{' '}
                                                        {item.value}
                                                    </Box>
                                                ))}
                                            </Stack>
                                        )}

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
                                                        boxShadow: isDeleteCommand
                                                            ? '0 10px 24px rgba(239,68,68,0.35)'
                                                            : '0 10px 24px rgba(22,163,74,0.32)',
                                                        background: isDeleteCommand
                                                            ? 'linear-gradient(135deg, #ef4444, #f97316)'
                                                            : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                                        '&:hover': {
                                                            transform:
                                                                'translateY(-1px) scale(1.03)',
                                                            boxShadow: isDeleteCommand
                                                                ? '0 12px 28px rgba(239,68,68,0.42)'
                                                                : '0 12px 28px rgba(22,163,74,0.38)',
                                                        },
                                                        transition: 'all 0.25s ease',
                                                    }}
                                                aria-label={t('assistantChat.confirmExecute')}
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
                                                        borderWidth: 1.6,
                                                        color: isDarkMode
                                                            ? 'rgba(248,250,252,0.92)'
                                                            : palette.cancelText,
                                                        borderColor: isDarkMode
                                                            ? 'rgba(248,250,252,0.42)'
                                                            : alpha(palette.cancelText, 0.5),
                                                        background: isDarkMode
                                                            ? 'rgba(248,113,113,0.1)'
                                                            : palette.cancelBg,
                                                        '&:hover': {
                                                            background: isDarkMode
                                                                ? 'rgba(248,113,113,0.16)'
                                                                : alpha(palette.cancelText, 0.12),
                                                            borderColor: isDarkMode
                                                                ? 'rgba(248,250,252,0.6)'
                                                                : alpha(palette.cancelText, 0.65),
                                                        },
                                                    }}
                                                    aria-label={t('assistantChat.cancelCommand')}
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
                                                            border: `1px solid ${alpha(tone.success, 0.45)}`,
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
                                                            border: `1px solid ${alpha(tone.error, 0.4)}`,
                                                        }}
                                                    />
                                            )}
                                        </Stack>

                                        {cmdData && (
                                            <Box sx={{ mt: 1.4 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="inherit"
                                                    onClick={() =>
                                                        setExpandedPlanIndex(
                                                            planExpanded ? null : idx
                                                        )
                                                    }
                                                    sx={{
                                                        textTransform: 'none',
                                                        borderRadius: 20,
                                                        fontWeight: 700,
                                                        borderColor: isDarkMode
                                                            ? 'rgba(248,250,252,0.4)'
                                                            : previewBorder,
                                                        color: isDarkMode
                                                            ? 'rgba(248,250,252,0.9)'
                                                            : '#1f2937',
                                                        background: isDarkMode
                                                            ? 'rgba(15,23,42,0.25)'
                                                            : '#ffffff',
                                                        '&:hover': {
                                                            borderColor: isDarkMode
                                                                ? 'rgba(248,250,252,0.65)'
                                                                : previewBorder,
                                                            background: isDarkMode
                                                                ? 'rgba(148,163,184,0.12)'
                                                                : alpha(previewBorder, 0.12),
                                                        },
                                                    }}
                                                >
                                                    {planExpanded ? 'Hide raw plan' : 'View raw plan'}
                                                </Button>
                                                {planExpanded && (
                                                    <Box
                                                        component="pre"
                                                        sx={{
                                                            mt: 1,
                                                            fontSize: '0.72rem',
                                                            whiteSpace: 'pre-wrap',
                                                            background: isDarkMode
                                                                ? 'rgba(15,23,42,0.35)'
                                                                : '#f8fafc',
                                                            borderRadius: 1.5,
                                                            p: 1.2,
                                                            color: isDarkMode
                                                                ? 'rgba(226,232,240,0.95)'
                                                                : '#0f172a',
                                                            maxHeight: 220,
                                                            overflow: 'auto',
                                                            border: isDarkMode
                                                                ? '1px solid rgba(148,163,184,0.2)'
                                                                : `1px solid ${alpha(previewBorder, 0.45)}`,
                                                        }}
                                                    >
                                                        {JSON.stringify(cmdData, null, 2)}
                                                    </Box>
                                                )}
                                            </Box>
                                        )}
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
                                                                        tone.secondary,
                                                                        0.2
                                                                    ),
                                                                    color: tone.secondary,
                                                                    border: `1px solid ${alpha(tone.secondary, 0.35)}`,
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
                                                                        tone.error,
                                                                        0.2
                                                                    ),
                                                                    color: tone.error,
                                                                    border: `1px solid ${alpha(tone.error, 0.35)}`,
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
                                            background: `linear-gradient(150deg, ${tone.primary}, ${tone.primaryDark})`,
                                            border: `1px solid ${alpha(tone.primaryDark, 0.35)}`,
                                            boxShadow: `0 10px 22px ${alpha(tone.primaryDark, 0.35)}`,
                                        }}
                                    >
                                        <PersonOutlineRoundedIcon fontSize="small" />
                                    </Avatar>
                                )}
                            </Stack>
                        );
                    })}

                    {/* Loading indicator with progress */}
                    {(busy || generationProgress) &&
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
                                        background: `linear-gradient(145deg, ${tone.secondary}, ${tone.secondaryDark})`,
                                        border: `1px solid ${alpha(tone.secondaryDark, 0.35)}`,
                                        boxShadow: `0 10px 22px ${alpha(tone.secondaryDark, 0.35)}`,
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
                                            sx={{
                                                fontWeight: 900,
                                                color: palette.isDark
                                                    ? 'rgba(236,254,255,0.95)'
                                                    : palette.assistantText,
                                            }}
                                        >
                                            Assistant
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            component="span"
                                            sx={{
                                                color: palette.isDark
                                                    ? 'rgba(255,255,255,0.9)'
                                                    : palette.metaTime,
                                            }}
                                        >
                                            {new Date().toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Typography>
                                    </Stack>

                                    {/* Enhanced progress display for custom view generation */}
                                    {generationProgress ? (
                                        <Box sx={{ textAlign: 'left' }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: palette.isDark
                                                        ? 'rgba(236,254,255,0.95)'
                                                        : palette.assistantText,
                                                    mb: 1,
                                                }}
                                            >
                                                {generationProgress.message}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box
                                                    sx={{
                                                        width: '100%',
                                                        height: 4,
                                                        backgroundColor: palette.isDark
                                                            ? 'rgba(255,255,255,0.2)'
                                                            : alpha(palette.assistantText, 0.12),
                                                        borderRadius: 2,
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: `${(generationProgress.step / generationProgress.total) * 100}%`,
                                                            height: '100%',
                                                            backgroundColor: tone.secondary,
                                                            borderRadius: 2,
                                                            transition: 'width 0.5s ease',
                                                        }}
                                                    />
                                                </Box>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: palette.isDark
                                                            ? 'rgba(255,255,255,0.9)'
                                                            : palette.metaTime,
                                                        minWidth: '40px',
                                                    }}
                                                >
                                                    {generationProgress.step}/{generationProgress.total}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ) : (
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
                                                    border: palette.isDark
                                                        ? '1px solid rgba(255,255,255,0.35)'
                                                        : `1px solid ${alpha(palette.assistantText, 0.2)}`,
                                                }}
                                            />
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: palette.isDark
                                                        ? 'rgba(236,254,255,0.95)'
                                                        : palette.assistantText,
                                                }}
                                            >
                                                Thinking...
                                            </Typography>
                                        </Box>
                                    )}
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
                                ? (currentComponentCode
                                    ? "Describe how you want to update your application..."
                                    : "Describe the SPA you want to create...")
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
                                        boxShadow: palette.inputFocusRing,
                                    },
                                },
                                '& .MuiOutlinedInput-input': {
                                    py: 1.25,
                                    px: 2,
                                    color: palette.isDark ? 'white' : '#1f2937',
                                    fontWeight: 500,
                                    '&::placeholder': {
                                        color: palette.isDark
                                            ? 'rgba(255,255,255,0.75)'
                                            : alpha('#1f2937', 0.45),
                                    },
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: palette.inputOutline,
                                    borderWidth: 1.6,
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
                                    background: `linear-gradient(135deg, ${alpha(tone.secondary, 0.45)}, ${alpha(tone.primary, 0.45)})`,
                                    color: 'rgba(255,255,255,0.85)',
                                },
                                transition: 'all 0.25s ease',
                            }}
                            startIcon={!busy ? <SendRoundedIcon /> : null}
                            aria-label={t('assistantChat.sendMessage')}
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
                                border: `1.8px solid ${listening ? tone.secondary : palette.borderSoft}`,
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
                                        ? tone.secondary
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
                                backgroundColor: listening ? tone.error : tone.secondary,
                                color: 'white',
                                boxShadow: listening
                                    ? `0 4px 20px ${alpha(tone.error, 0.4)}`
                                    : `0 4px 20px ${alpha(tone.secondary, 0.4)}`,
                                '&:hover': {
                                    backgroundColor: listening ? tone.error : tone.secondary,
                                    transform: 'translateY(-1px) scale(1.05)',
                                    boxShadow: listening
                                        ? `0 6px 24px ${alpha(tone.error, 0.5)}`
                                        : `0 6px 24px ${alpha(tone.secondary, 0.5)}`,
                                },
                                '&.Mui-disabled': {
                                    backgroundColor: alpha(tone.secondary, 0.3),
                                    color: 'rgba(255,255,255,0.5)',
                                },
                                transition: 'all 0.25s ease',
                                animation: listening ? `${pulse} 2s infinite` : 'none',
                            }}
                            aria-label={listening ? t('aiTask.stopListening') : t('aiTask.startVoiceInput')}
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
