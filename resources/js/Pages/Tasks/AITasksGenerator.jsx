import React, { useEffect, useMemo, useState, useRef, forwardRef } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useIsolatedSpeechRecognition } from '@/hooks/useIsolatedSpeechRecognition';
import {
    alpha,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    IconButton,
    InputAdornment,
    Paper,
    Slide,
    Stack,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import TipsAndUpdatesRoundedIcon from '@mui/icons-material/TipsAndUpdatesRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { useSubscription } from '@/Hooks/useSubscription';
import FeatureOverlay from '@/Components/FeatureOverlay';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import ElectricBoltRoundedIcon from '@mui/icons-material/ElectricBoltRounded';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import { getCsrfToken } from '@/utils/csrf';

/** GET suggestions (no CSRF). `max` is clamped 3..8 for backend service to prevent timeouts. */
async function loadAISuggestions(projectId, max = 8) {
    const clamped = Math.max(3, Math.min(8, max || 8));
    const url = route('tasks.ai.suggestions', projectId) + `?max=${encodeURIComponent(clamped)}`;
    const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data?.suggestions)
        ? data.suggestions.filter((s) => typeof s === 'string' && s.trim() !== '')
        : [];
}

/** Read file content as text */
async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

/** Extract text from various file types */
async function extractTextFromFile(file) {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    // Text files
    if (
        fileType.startsWith('text/') ||
        fileName.endsWith('.txt') ||
        fileName.endsWith('.md') ||
        fileName.endsWith('.json') ||
        fileName.endsWith('.csv')
    ) {
        return await readFileAsText(file);
    }

    // For other file types, just return basic info
    return `File uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)
    
Please describe the contents or relevant details from this file that should be considered when generating tasks.`;
}

/** Case-insensitive contains */
function includesLine(haystack, needle) {
    return haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Slide transition for modal */
const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export default function AITasksGenerator({ auth, project, prefill = {} }) {
    const theme = useTheme();
    const { processing, errors = {} } = usePage().props;
    const { userPlan } = useSubscription();

    // Add CSS animation for microphone pulse
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.1); }
                100% { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    const handleUpgrade = () => {
        router.visit(userPlan?.billing_url || '/billing');
    };

    const [count, setCount] = useState(Number(prefill.count) || 5);
    const [prompt, setPrompt] = useState(prefill.prompt || '');
    const [chips, setChips] = useState([]);
    const [loadingChips, setLoadingChips] = useState(false);
    const [chipError, setChipError] = useState('');

    // Pinned tasks from previous generation
    const [pinnedTasks, setPinnedTasks] = useState(prefill.pinnedTasks || []);

    // File upload state
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [fileContent, setFileContent] = useState('');
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const fileInputRef = useRef(null);

    // Isolated speech recognition for this component
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition,
        startListening: startSpeechRecognition,
        stopListening: stopSpeechRecognition,
    } = useIsolatedSpeechRecognition('ai-task-generator');

    const [isGenerating, setIsGenerating] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // One-by-one step display + percentage (only text transitions)
    const [stepIndex, setStepIndex] = useState(0);
    const [prevStepIndex, setPrevStepIndex] = useState(-1);
    const [showPrevText, setShowPrevText] = useState(false);
    const [progressPct, setProgressPct] = useState(0);

    // Timers/flags
    const debounceRef = useRef(null);
    const stepsTimerRef = useRef(null);
    const prevHideTimerRef = useRef(null);
    const activeRef = useRef(false);

    // Consistent text-only transition timing
    const ANIM_MS = 700;

    // Define steps. Only the final one reaches 100% and is shown after server completion.
    const STEPS = useMemo(
        () => [
            {
                text: '🧠 Analyzing project context and requirements…',
                pct: 10,
                icon: <PsychologyRoundedIcon fontSize="small" />,
            },
            {
                text: '🎯 Mapping your goals to smart task themes…',
                pct: 22,
                icon: <AutoAwesomeRoundedIcon fontSize="small" />,
            },
            {
                text: '⚙️ Spinning up mini-agents & parsing dependencies…',
                pct: 35,
                icon: <SettingsRoundedIcon fontSize="small" />,
            },
            {
                text: '🔍 Cross-checking best practices & standards…',
                pct: 50,
                icon: <TipsAndUpdatesRoundedIcon fontSize="small" />,
            },
            {
                text: '📋 Drafting detailed acceptance criteria…',
                pct: 65,
                icon: <ChecklistIconLike theme={theme} />,
            },
            {
                text: '🔗 Weaving task relationships & critical paths…',
                pct: 78,
                icon: <ElectricBoltRoundedIcon fontSize="small" />,
            },
            {
                text: '✨ Polishing copy & sequencing workstreams…',
                pct: 92,
                icon: <AutoAwesomeRoundedIcon fontSize="small" />,
            },
            {
                text: '🚀 Finalizing your tailored task set…',
                pct: 100,
                icon: <RocketLaunchRoundedIcon fontSize="small" />,
            },
        ],
        [theme]
    );
    const LAST = STEPS.length - 1;
    const MAX_SIM_INDEX = LAST - 1; // stop auto-advance before 100%

    /** Fetch & set suggestions; filters out ones already in the prompt */
    const fetchSuggestions = async (qty = count) => {
        try {
            setLoadingChips(true);
            setChipError('');
            const list = await loadAISuggestions(project.id, qty);
            const filtered = list.filter((s) => !includesLine(prompt, s));
            setChips(filtered);
        } catch (e) {
            console.error('AI suggestions error:', e);
            setChipError(
                'Could not load AI suggestions. You can still type your own instructions.'
            );
            setChips([
                'Comprehensive architecture documentation & technical specifications',
                'Advanced performance monitoring & analytics infrastructure',
                'Security audit & penetration testing framework',
                'Automated CI/CD pipeline with deployment strategies',
                'User acceptance testing & quality assurance protocols',
                'Scalability assessment & optimization recommendations',
                'API documentation & developer onboarding resources',
                'Compliance review & regulatory requirements analysis',
                'Cross-platform integration testing & validation',
                'Advanced error handling & monitoring systems',
            ]);
        } finally {
            setLoadingChips(false);
        }
    };

    /** Initial + reactive load (debounced) — reload when count changes */
    useEffect(() => {
        if (!project?.id) return;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(count);
        }, 350);
        return () => clearTimeout(debounceRef.current);
    }, [project?.id, count]); // eslint-disable-line react-hooks/exhaustive-deps

    /** Append chip to prompt */
    const appendChip = (text) => {
        setPrompt((prev) => {
            if (!prev) return text;
            if (includesLine(prev, text)) return prev;
            return `${prev.trim()}\n- ${text}`;
        });
        setChips((prev) => prev.filter((c) => c !== text));
    };

    /** Handle file upload */
    const handleFileUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setIsProcessingFile(true);
        try {
            for (const file of files) {
                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert(`File ${file.name} is too large. Maximum size is 5MB.`);
                    continue;
                }

                const content = await extractTextFromFile(file);
                setUploadedFiles((prev) => [
                    ...prev,
                    {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        content: content.substring(0, 2000), // Limit content preview
                    },
                ]);

                // Add file content to prompt
                setPrompt((prev) => {
                    const fileSection = `\n\n--- File: ${file.name} ---\n${content}\n--- End File ---`;
                    return prev + fileSection;
                });
            }
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file. Please try again.');
        } finally {
            setIsProcessingFile(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    /** Remove uploaded file */
    const removeFile = (index) => {
        const file = uploadedFiles[index];
        setUploadedFiles((prev) => prev.filter((_, i) => i !== index));

        // Remove file content from prompt
        setPrompt((prev) => {
            const fileSection = `--- File: ${file.name} ---`;
            const startIndex = prev.indexOf(fileSection);
            if (startIndex === -1) return prev;

            const endSection = '--- End File ---';
            const endIndex = prev.indexOf(endSection, startIndex);
            if (endIndex === -1) return prev;

            return prev.substring(0, startIndex) + prev.substring(endIndex + endSection.length);
        });
    };

    /** Speech recognition handlers */
    const startListening = () => {
        console.log('Starting speech recognition for AI task generator...', {
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
            console.log('Attempting to start listening for AI task generator...');
            const success = startSpeechRecognition();
            if (success) {
                console.log('Speech recognition started successfully for AI task generator');
            } else {
                console.error('Failed to start speech recognition for AI task generator');
                alert('Failed to start speech recognition. Please try again.');
            }
        } catch (error) {
            console.error('Error starting speech recognition for AI task generator:', error);
            alert('Failed to start speech recognition: ' + error.message);
        }
    };

    const stopListening = () => {
        console.log('Stopping speech recognition for AI task generator...');
        try {
            stopSpeechRecognition();
            console.log('Speech recognition stopped for AI task generator');
        } catch (error) {
            console.error('Error stopping speech recognition for AI task generator:', error);
        }
    };

    const handleSpeechResult = () => {
        if (transcript) {
            setPrompt((prev) => {
                const addition = prev ? `\n${transcript}` : transcript;
                return prev + addition;
            });
            resetTranscript();
        }
    };

    // Update prompt when speech recognition transcript changes
    useEffect(() => {
        if (transcript && !listening) {
            setPrompt((prev) => {
                const addition = prev ? `\n${transcript}` : transcript;
                return prev + addition;
            });
            resetTranscript();
        }
    }, [transcript, listening, resetTranscript]);

    /** Start sequential modal animation (one item at a time; stop before last) */
    const startSequentialModal = () => {
        activeRef.current = true;
        setShowModal(true);
        setIsGenerating(true);
        setPrevStepIndex(-1);
        setShowPrevText(false);
        setStepIndex(0);
        setProgressPct(Math.min(STEPS[0].pct, 99));

        clearInterval(stepsTimerRef.current);
        stepsTimerRef.current = setInterval(() => {
            if (!activeRef.current) {
                clearInterval(stepsTimerRef.current);
                return;
            }
            setStepIndex((current) => {
                const next = Math.min(current + 1, MAX_SIM_INDEX);
                if (next !== current) {
                    setPrevStepIndex(current);
                    setProgressPct(Math.min(STEPS[next].pct, 99));
                    setShowPrevText(true);
                    clearTimeout(prevHideTimerRef.current);
                    prevHideTimerRef.current = setTimeout(() => setShowPrevText(false), ANIM_MS);
                } else {
                    clearInterval(stepsTimerRef.current);
                }
                return next;
            });
        }, 1300);
    };

    /** Complete the sequence: reveal last step and set 100% ONLY when tasks are done */
    const completeSequentialModal = () => {
        setPrevStepIndex(stepIndex);
        setShowPrevText(true);
        setStepIndex(LAST);
        setProgressPct(100);
        clearTimeout(prevHideTimerRef.current);
        prevHideTimerRef.current = setTimeout(() => setShowPrevText(false), ANIM_MS);
    };

    /** Stop and reset modal state */
    const stopSequentialModal = () => {
        activeRef.current = false;
        clearInterval(stepsTimerRef.current);
        clearTimeout(prevHideTimerRef.current);
        setIsGenerating(false);
        setShowModal(false);
        setStepIndex(0);
        setPrevStepIndex(-1);
        setShowPrevText(false);
        setProgressPct(0);
    };

    /** React to Inertia processing flag */
    useEffect(() => {
        if (processing && !activeRef.current) {
            startSequentialModal();
        }
        if (!processing && activeRef.current) {
            completeSequentialModal();
            const t = setTimeout(() => {
                stopSequentialModal();
            }, 1100); // a brief beat to show 100%
            return () => clearTimeout(t);
        }
    }, [processing]); // eslint-disable-line react-hooks/exhaustive-deps

    // Align with backend validation (min 1, max 8 to prevent timeouts)
    const inc = () => setCount((n) => Math.min(8, Math.max(1, n + 1)));
    const dec = () => setCount((n) => Math.min(8, Math.max(1, n - 1)));
    const reset = () => {
        setCount(5);
        setPrompt('');
        fetchSuggestions(5);
    };

    const generate = () => {
        // Stop speech recognition if it's active to capture final transcript
        if (listening) {
            stopSpeechRecognition();
        }

        // Small delay to allow final transcript processing
        setTimeout(
            () => {
                if (!activeRef.current) startSequentialModal();

                // Build complete prompt with all context
                let fullPrompt = prompt;

                // Add any remaining transcript that hasn't been processed
                if (transcript && transcript.trim()) {
                    const addition = fullPrompt ? `\n${transcript}` : transcript;
                    fullPrompt = fullPrompt + addition;
                }

                console.log('Generating tasks with:', {
                    count,
                    promptLength: fullPrompt.length,
                    hasFiles: uploadedFiles.length > 0,
                    hasTranscript: !!transcript,
                });

                const token = getCsrfToken() || '';
                router.post(
                    route('tasks.ai.preview', project.id),
                    { 
                        count, 
                        prompt: fullPrompt,
                        pinnedTasks: pinnedTasks 
                    },
                    {
                        preserveScroll: true,
                        headers: {
                            'X-XSRF-TOKEN': token,
                            Accept: 'text/html, application/xhtml+xml',
                        },
                        onFinish: () => {
                            completeSequentialModal();
                            setTimeout(() => stopSequentialModal(), 1100);
                        },
                        onError: (errors) => {
                            console.error('Generate tasks error:', errors);
                            stopSequentialModal();
                        },
                    }
                );
            },
            listening ? 500 : 0
        ); // Wait 500ms if listening, otherwise proceed immediately
    };

    const cancel = () => {
        router.visit(route('tasks.index', project.id), { preserveScroll: true });
    };

    const meterPct = useMemo(
        () => Math.max(0, Math.min(100, Math.round((count / 8) * 100))),
        [count]
    );

    /** Pretty palettes for suggestion chips (rotating) */
    const chipPalettes = useMemo(() => {
        const p = theme.palette;
        return [
            { bg: alpha(p.info.main, 0.12), brd: alpha(p.info.main, 0.35) },
            { bg: alpha(p.success.main, 0.12), brd: alpha(p.success.main, 0.35) },
            { bg: alpha(p.warning.main, 0.12), brd: alpha(p.warning.main, 0.35) },
            { bg: alpha(p.secondary.main, 0.12), brd: alpha(p.secondary.main, 0.35) },
            { bg: alpha(p.primary.main, 0.12), brd: alpha(p.primary.main, 0.35) },
            { bg: alpha(p.error.main, 0.1), brd: alpha(p.error.main, 0.3) },
        ];
    }, [theme.palette]);

    // Cycling mini-quips to keep user engaged
    const MINI_QUIPS = useMemo(
        () => [
            'Our tiny robots are tightening virtual bolts…',
            'Sifting through best practices like a pro librarian…',
            'Teaching tasks to line up in perfect order…',
            'Sharpening acceptance criteria pencils ✏️…',
            'Calibrating effort vs. impact meters…',
            'Powering up dependency graph thrusters…',
            'Dusting off your roadmap with extra sparkle…',
        ],
        []
    );
    const [quipIndex, setQuipIndex] = useState(0);
    useEffect(() => {
        if (!showModal) return;
        const id = setInterval(() => {
            setQuipIndex((i) => (i + 1) % MINI_QUIPS.length);
        }, 1600);
        return () => clearInterval(id);
    }, [showModal, MINI_QUIPS.length]);

    // Current and previous steps for the text transition
    const currentStep = STEPS[stepIndex] || STEPS[0];
    const prevStep = prevStepIndex >= 0 ? STEPS[prevStepIndex] : null;

    return (
        <>
            <Head title="AI Task Generator" />
            <AuthenticatedLayout user={auth?.user}>
                <Box
                    sx={{
                        minHeight: '100vh',
                        background:
                            theme.palette.mode === 'light'
                                ? 'linear-gradient(140deg,#F6F9FC 0%,#F1F6FD 55%,#E9F1FB 100%)'
                                : 'linear-gradient(140deg,#0F1823,#101B27)',
                        display: 'flex',
                        py: { xs: 3, md: 6 },
                    }}
                >
                    <Container maxWidth="md">
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 2.5, md: 3.5 },
                                borderRadius: 4,
                                background:
                                    'linear-gradient(145deg,rgba(255,255,255,0.95),rgba(255,255,255,0.74))',
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                                boxShadow:
                                    '0 14px 34px -18px rgba(30,50,90,.28), 0 2px 6px rgba(0,0,0,.06)',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                        >
                            {/* No overlay here; overlay only shown on preview page */}
                            <Box
                                aria-hidden
                                sx={{
                                    position: 'absolute',
                                    width: 300,
                                    height: 300,
                                    top: -130,
                                    right: -110,
                                    background:
                                        'radial-gradient(circle at 60% 40%, rgba(255,255,255,0.7), transparent 70%)',
                                }}
                            />

                            {/* Header */}
                            <Stack direction="row" spacing={1.2} alignItems="center" mb={1}>
                                <AutoAwesomeRoundedIcon
                                    sx={{ color: alpha(theme.palette.primary.main, 0.9) }}
                                />
                                <Typography variant="h6" fontWeight={900} letterSpacing={-0.2}>
                                    AI Task Generator
                                </Typography>
                                <Chip
                                    size="small"
                                    label={`${count} Task${count === 1 ? '' : 's'}`}
                                    sx={{
                                        ml: 'auto',
                                        fontWeight: 800,
                                        height: 26,
                                        borderRadius: 999,
                                        background:
                                            'linear-gradient(135deg,#22c55e22,#22c55e14 60%,#16a34a22)',
                                        border: `1px solid ${alpha('#22c55e', 0.35)}`,
                                    }}
                                />
                            </Stack>
                            <Typography
                                variant="body2"
                                sx={{ color: alpha(theme.palette.text.primary, 0.7), mb: 2 }}
                            >
                                Project: <strong>{project?.name}</strong>
                            </Typography>

                            {errors?.ai && (
                                <Box
                                    sx={{
                                        mb: 2,
                                        p: 1.5,
                                        borderRadius: 2,
                                        border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
                                        backgroundColor: alpha(theme.palette.error.main, 0.06),
                                    }}
                                >
                                    <Typography color="error" fontWeight={700}>
                                        {errors.ai}
                                    </Typography>
                                </Box>
                            )}

                            <Divider sx={{ mb: 2.5 }} />

                            {/* Count control */}
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    fontWeight: 900,
                                    letterSpacing: 0.3,
                                    mb: 0.5,
                                    color: alpha(theme.palette.text.primary, 0.85),
                                }}
                            >
                                NUMBER OF TASKS
                            </Typography>

                            <Typography
                                variant="caption"
                                sx={{
                                    mb: 1.5,
                                    color: alpha(theme.palette.text.secondary, 0.8),
                                    fontStyle: 'italic',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                }}
                            >
                                <TipsAndUpdatesRoundedIcon sx={{ fontSize: 14 }} />
                                Generate up to 8 tasks at a time to prevent timeout issues
                            </Typography>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <TextField
                                    type="number"
                                    size="small"
                                    value={count}
                                    onChange={(e) =>
                                        setCount(() =>
                                            Math.min(8, Math.max(1, Number(e.target.value) || 1))
                                        )
                                    }
                                    disabled={isGenerating || processing}
                                    inputProps={{ min: 1, max: 8 }}
                                    sx={{ width: 120 }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Tooltip title="Decrease">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={dec}
                                                            disabled={
                                                                count <= 1 ||
                                                                isGenerating ||
                                                                processing
                                                            }
                                                        >
                                                            <RemoveRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <Tooltip title="Increase">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={inc}
                                                            disabled={
                                                                count >= 8 ||
                                                                isGenerating ||
                                                                processing
                                                            }
                                                        >
                                                            <AddRoundedIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </InputAdornment>
                                        ),
                                    }}
                                />

                                <Box
                                    aria-label="count meter"
                                    sx={{
                                        flexGrow: 1,
                                        height: 10,
                                        mt: 1,
                                        borderRadius: 999,
                                        background: alpha(theme.palette.primary.main, 0.1),
                                        overflow: 'hidden',
                                        position: 'relative',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: `${meterPct}%`,
                                            height: '100%',
                                            background:
                                                'linear-gradient(90deg,#34D399,#10B981 55%,#059669)',
                                            transition: 'width .25s ease',
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            position: 'absolute',
                                            right: 8,
                                            top: -18,
                                            color: alpha(theme.palette.text.primary, 0.55),
                                            fontWeight: 600,
                                        }}
                                    >
                                        {count}/10 requested
                                    </Typography>
                                </Box>
                            </Stack>

                            {/* Prompt */}
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    fontWeight: 900,
                                    letterSpacing: 0.3,
                                    mt: 3,
                                    mb: 1,
                                    color: alpha(theme.palette.text.primary, 0.85),
                                }}
                            >
                                EXTRA INSTRUCTIONS (OPTIONAL)
                            </Typography>

                            {/* File Upload and Speech Recognition Controls */}
                            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                {/* File Upload Button */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".txt,.md,.json,.csv,text/*"
                                    multiple
                                    style={{ display: 'none' }}
                                />
                                <Tooltip title="Upload context files (txt, md, json, csv)">
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={
                                            isProcessingFile ? (
                                                <CircularProgress size={16} />
                                            ) : (
                                                <UploadFileRoundedIcon />
                                            )
                                        }
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isGenerating || processing || isProcessingFile}
                                        sx={{
                                            textTransform: 'none',
                                            borderColor: alpha(theme.palette.primary.main, 0.3),
                                        }}
                                    >
                                        {isProcessingFile ? 'Processing...' : 'Upload Files'}
                                    </Button>
                                </Tooltip>

                                {/* Speech Recognition Button */}
                                {browserSupportsSpeechRecognition && (
                                    <Tooltip
                                        title={listening ? 'Stop recording' : 'Start voice input'}
                                    >
                                        <Button
                                            variant={listening ? 'contained' : 'outlined'}
                                            size="small"
                                            startIcon={
                                                listening ? (
                                                    <MicOffRoundedIcon />
                                                ) : (
                                                    <MicRoundedIcon />
                                                )
                                            }
                                            onClick={listening ? stopListening : startListening}
                                            disabled={isGenerating || processing}
                                            sx={{
                                                textTransform: 'none',
                                                borderColor: alpha(theme.palette.primary.main, 0.3),
                                                ...(listening && {
                                                    backgroundColor: theme.palette.error.main,
                                                    '&:hover': {
                                                        backgroundColor: theme.palette.error.dark,
                                                    },
                                                }),
                                            }}
                                        >
                                            {listening ? 'Stop' : 'Voice'}
                                        </Button>
                                    </Tooltip>
                                )}
                            </Stack>

                            {/* Uploaded Files Display */}
                            {uploadedFiles.length > 0 && (
                                <Stack spacing={1} sx={{ mb: 2 }}>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: alpha(theme.palette.text.primary, 0.6) }}
                                    >
                                        Uploaded Files:
                                    </Typography>
                                    {uploadedFiles.map((file, index) => (
                                        <Paper
                                            key={index}
                                            sx={{
                                                p: 1.5,
                                                display: 'flex',
                                                alignItems: 'center',
                                                backgroundColor: alpha(
                                                    theme.palette.primary.main,
                                                    0.05
                                                ),
                                                border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                                            }}
                                        >
                                            <AttachFileRoundedIcon
                                                fontSize="small"
                                                sx={{
                                                    mr: 1,
                                                    color: alpha(theme.palette.text.primary, 0.6),
                                                }}
                                            />
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontWeight: 600 }}
                                                >
                                                    {file.name}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: alpha(
                                                            theme.palette.text.primary,
                                                            0.6
                                                        ),
                                                    }}
                                                >
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </Typography>
                                            </Box>
                                            <IconButton
                                                size="small"
                                                onClick={() => removeFile(index)}
                                                disabled={isGenerating || processing}
                                                sx={{ color: theme.palette.error.main }}
                                            >
                                                <DeleteRoundedIcon fontSize="small" />
                                            </IconButton>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}

                            {/* Speech Recognition Status */}
                            {listening && (
                                <Paper
                                    sx={{
                                        p: 1.5,
                                        mb: 2,
                                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                                        border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <MicRoundedIcon
                                        sx={{
                                            mr: 1,
                                            color: theme.palette.error.main,
                                            animation: 'pulse 1.5s infinite',
                                        }}
                                    />
                                    <Typography
                                        variant="body2"
                                        sx={{ color: theme.palette.error.main, fontWeight: 600 }}
                                    >
                                        🎤 Listening... Speak now
                                    </Typography>
                                </Paper>
                            )}

                            {/* Live Transcript Display */}
                            {transcript && (
                                <Paper
                                    sx={{
                                        p: 1.5,
                                        mb: 2,
                                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                                        border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{ color: alpha(theme.palette.text.primary, 0.6) }}
                                    >
                                        Speech Recognition:
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ mt: 0.5, fontStyle: 'italic' }}
                                    >
                                        "{transcript}"
                                    </Typography>
                                </Paper>
                            )}

                            <TextField
                                multiline
                                minRows={5}
                                fullWidth
                                placeholder="e.g. Include tasks for safety checks specific to Khartoum site, local permitting, and budget tracking cadence…"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isGenerating || processing}
                            />

                            {/* AI chips */}
                            <Stack spacing={0.8} mt={1.4}>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                    sx={{ mb: 0.3 }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{ color: alpha(theme.palette.text.primary, 0.6) }}
                                    >
                                        Add context to guide the AI
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label={`${chips.length} suggestion${chips.length === 1 ? '' : 's'}`}
                                        sx={{
                                            height: 22,
                                            fontWeight: 700,
                                            background: alpha(theme.palette.primary.main, 0.08),
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                        }}
                                    />
                                    <Box sx={{ flexGrow: 1 }} />
                                    <Tooltip title="Regenerate suggestions">
                                        <span>
                                            <Button
                                                size="small"
                                                variant="text"
                                                onClick={() => fetchSuggestions(count)}
                                                startIcon={<AutorenewRoundedIcon />}
                                                disabled={loadingChips}
                                                sx={{ textTransform: 'none', fontWeight: 700 }}
                                            >
                                                Refresh
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </Stack>

                                {chipError && (
                                    <Typography variant="caption" color="error" sx={{ mb: 0.5 }}>
                                        {chipError}
                                    </Typography>
                                )}

                                <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1.2}>
                                    {loadingChips
                                        ? Array.from({
                                              length: Math.max(6, Math.min(10, count)),
                                          }).map((_, i) => (
                                              <Chip
                                                  key={`skeleton-${i}`}
                                                  label="Loading…"
                                                  icon={<TipsAndUpdatesRoundedIcon />}
                                                  sx={{
                                                      opacity: 0.65,
                                                      fontWeight: 700,
                                                      background: alpha(
                                                          theme.palette.info.main,
                                                          0.12
                                                      ),
                                                      border: `1px solid ${alpha(theme.palette.info.main, 0.35)}`,
                                                  }}
                                              />
                                          ))
                                        : chips.map((s, idx) => {
                                              const pal = chipPalettes[idx % chipPalettes.length];
                                              return (
                                                  <Chip
                                                      key={`${idx}-${s}`}
                                                      onClick={() => appendChip(s)}
                                                      icon={<TipsAndUpdatesRoundedIcon />}
                                                      label={s}
                                                      sx={{
                                                          cursor: 'pointer',
                                                          fontWeight: 700,
                                                          background: pal.bg,
                                                          border: `1px solid ${pal.brd}`,
                                                          transition:
                                                              'transform .15s, box-shadow .15s, background .15s',
                                                          '&:hover': {
                                                              background: alpha(pal.brd, 0.18),
                                                              transform: 'translateY(-1px)',
                                                              boxShadow: `0 6px 16px -8px ${alpha(pal.brd, 0.55)}`,
                                                          },
                                                      }}
                                                  />
                                              );
                                          })}
                                </Stack>
                            </Stack>

                            {/* Actions */}
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.2}
                                justifyContent="flex-end"
                                mt={3}
                            >
                                <Button
                                    variant="text"
                                    startIcon={<RestartAltRoundedIcon />}
                                    onClick={reset}
                                    disabled={isGenerating || processing}
                                    sx={{ textTransform: 'none', fontWeight: 700 }}
                                >
                                    Reset
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={cancel}
                                    disabled={isGenerating || processing}
                                    sx={{ textTransform: 'none', fontWeight: 700 }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={generate}
                                    disabled={isGenerating || processing}
                                    startIcon={
                                        isGenerating || processing ? (
                                            <CircularProgress size={16} color="inherit" />
                                        ) : (
                                            <AutoAwesomeRoundedIcon />
                                        )
                                    }
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 900,
                                        px: 2.6,
                                        background:
                                            isGenerating || processing
                                                ? 'linear-gradient(135deg,#9CA3AF,#6B7280)'
                                                : 'linear-gradient(135deg,#6366F1,#4F46E5 55%,#4338CA)',
                                        boxShadow:
                                            '0 8px 20px -8px rgba(79,70,229,.55), 0 2px 6px rgba(0,0,0,.25)',
                                        '&:hover': {
                                            background:
                                                isGenerating || processing
                                                    ? 'linear-gradient(135deg,#9CA3AF,#6B7280)'
                                                    : 'linear-gradient(135deg,#595CEB,#4841D6 55%,#3B32B8)',
                                        },
                                        '&:disabled': {
                                            background: 'linear-gradient(135deg,#9CA3AF,#6B7280)',
                                            color: 'rgba(255,255,255,0.7)',
                                        },
                                    }}
                                >
                                    {isGenerating || processing
                                        ? `🧠 Generating ${count} Advanced Tasks...`
                                        : '🚀 Generate Advanced Tasks'}
                                </Button>
                            </Stack>

                            {/* Pinned tasks from previous generation - subtle display at bottom */}
                            {pinnedTasks.length > 0 && (
                                <Box sx={{ 
                                    mt: 3, 
                                    p: 1.5, 
                                    borderRadius: 2,
                                    background: alpha(theme.palette.grey[100], 0.4),
                                    border: `1px solid ${alpha(theme.palette.grey[300], 0.5)}`,
                                }}>
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                        <PushPinRoundedIcon sx={{ 
                                            fontSize: 14, 
                                            color: alpha(theme.palette.text.secondary, 0.7),
                                            transform: 'rotate(45deg)' 
                                        }} />
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: alpha(theme.palette.text.secondary, 0.8),
                                                fontWeight: 500,
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            Will keep {pinnedTasks.length} pinned task{pinnedTasks.length === 1 ? '' : 's'} from previous generation
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                        {pinnedTasks.map((task, index) => (
                                            <Chip
                                                key={index}
                                                label={task?.title ? (task.title.length > 25 ? task.title.substring(0, 25) + '...' : task.title) : `Task ${index + 1}`}
                                                size="small"
                                                sx={{
                                                    height: 24,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 500,
                                                    background: alpha(theme.palette.primary.main, 0.08),
                                                    color: alpha(theme.palette.text.secondary, 0.9),
                                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                                                    '& .MuiChip-label': {
                                                        px: 1
                                                    }
                                                }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            <Divider sx={{ my: 2.5 }} />

                            <Stack direction="row" spacing={1} alignItems="center">
                                <HelpRoundedIcon sx={{ color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                    Suggestions adapt to your project description & meta. Click any
                                    chip to add it to the prompt—selected chips disappear so you can
                                    keep picking fresh ones.
                                </Typography>
                            </Stack>
                        </Paper>
                    </Container>
                </Box>

                {/* PROGRESS MODAL — stationary card; only the text transitions; 100% only on completion */}
                <Dialog
                    fullWidth
                    maxWidth="sm"
                    open={showModal}
                    TransitionComponent={Transition}
                    keepMounted
                    PaperProps={{
                        sx: {
                            borderRadius: 3,
                            overflow: 'hidden',
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                            background:
                                theme.palette.mode === 'light'
                                    ? 'linear-gradient(150deg, rgba(255,255,255,0.98), rgba(239,242,255,0.96))'
                                    : 'linear-gradient(150deg, rgba(13,18,28,0.98), rgba(18,23,34,0.96))',
                            boxShadow:
                                '0 24px 48px -24px rgba(31,41,55,.35), 0 6px 18px rgba(0,0,0,.20)',
                        },
                    }}
                >
                    <DialogTitle
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            pr: 1,
                        }}
                    >
                        {isGenerating && progressPct < 100 ? (
                            <RobotTypingAnimation theme={theme} size={24} />
                        ) : (
                            <AutoAwesomeRoundedIcon sx={{ color: theme.palette.primary.main }} />
                        )}
                        <Typography variant="subtitle1" fontWeight={900}>
                            {isGenerating && progressPct < 100
                                ? 'AI Assistant is thinking...'
                                : 'Crafting Your Tasks'}
                        </Typography>
                        <Box sx={{ ml: 'auto' }}>
                            <IconButton
                                aria-label="close"
                                onClick={stopSequentialModal}
                                disabled={processing}
                                size="small"
                            >
                                <CloseRoundedIcon />
                            </IconButton>
                        </Box>
                    </DialogTitle>

                    <DialogContent
                        dividers
                        sx={{
                            position: 'relative',
                            overflow: 'hidden',
                            pb: 2,
                        }}
                    >
                        {/* Global keyframes for text-only transition */}
                        <Box
                            aria-hidden
                            sx={{
                                '@keyframes textIn': {
                                    '0%': { opacity: 0, transform: 'translateY(10px)' },
                                    '100%': { opacity: 1, transform: 'translateY(0)' },
                                },
                                '@keyframes textOut': {
                                    '0%': { opacity: 1, transform: 'translateY(0)' },
                                    '100%': { opacity: 0, transform: 'translateY(-8px)' },
                                },
                                '@keyframes bob': {
                                    '0%': { transform: 'translateY(0)' },
                                    '50%': { transform: 'translateY(-6px)' },
                                    '100%': { transform: 'translateY(0)' },
                                },
                                '@keyframes stripShimmer': {
                                    '0%': { opacity: 0.3 },
                                    '50%': { opacity: 1 },
                                    '100%': { opacity: 0.3 },
                                },
                                '@keyframes confettiUp': {
                                    '0%': { transform: 'translateY(0) scale(1)', opacity: 1 },
                                    '80%': {
                                        transform: 'translateY(-22px) scale(1.1)',
                                        opacity: 1,
                                    },
                                    '100%': {
                                        transform: 'translateY(-28px) scale(0.9)',
                                        opacity: 0,
                                    },
                                },
                                '@keyframes blinkCursor': {
                                    '0%, 100%': { opacity: 0 },
                                    '50%': { opacity: 1 },
                                },
                            }}
                        />

                        {/* TOP: progress strip + percentage */}
                        <Stack spacing={1.2} sx={{ mb: 2 }}>
                            <Box
                                sx={{
                                    width: '100%',
                                    height: 8,
                                    borderRadius: 999,
                                    background: alpha(theme.palette.primary.main, 0.12),
                                    overflow: 'hidden',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: `${progressPct}%`,
                                        height: '100%',
                                        background:
                                            'linear-gradient(90deg, rgba(99,102,241,0.65), rgba(79,70,229,0.9))',
                                        position: 'relative',
                                        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                                        '&::after': {
                                            content: '""',
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            width: 28,
                                            height: '100%',
                                            background:
                                                'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                                            animation: 'stripShimmer 1.2s ease-in-out infinite',
                                        },
                                    }}
                                />
                            </Box>

                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box
                                    sx={{
                                        position: 'relative',
                                        width: 56,
                                        height: 56,
                                    }}
                                >
                                    <CircularProgress
                                        size={56}
                                        thickness={4}
                                        value={progressPct}
                                        variant="determinate"
                                        sx={{
                                            color: theme.palette.primary.main,
                                            '& .MuiCircularProgress-circle': {
                                                strokeLinecap: 'round',
                                            },
                                            filter: 'drop-shadow(0 4px 10px rgba(79,70,229,.25))',
                                        }}
                                    />
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            fontWeight={900}
                                            color="primary"
                                        >
                                            {progressPct}%
                                        </Typography>
                                    </Box>
                                </Box>

                                <Typography variant="caption" color="text.secondary">
                                    {MINI_QUIPS[quipIndex]}
                                </Typography>

                                <Box sx={{ ml: 'auto', position: 'relative' }}>
                                    <Box
                                        sx={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(145deg, #ffffff, #EEF2FF)',
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 10px 24px rgba(79,70,229,.22)',
                                            animation: 'bob 2.4s ease-in-out infinite',
                                        }}
                                    >
                                        <Box
                                            aria-hidden
                                            sx={{ fontSize: 20, transform: 'translateY(1px)' }}
                                        >
                                            🤖
                                        </Box>
                                    </Box>

                                    {/* Typing dots for the robot */}
                                    {progressPct < 100 && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: -8,
                                                right: -8,
                                                background: alpha(theme.palette.primary.main, 0.9),
                                                borderRadius: '12px',
                                                px: 1,
                                                py: 0.5,
                                                display: 'flex',
                                                gap: 0.3,
                                                alignItems: 'center',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                '@keyframes robotTypingDot1': {
                                                    '0%, 60%, 100%': {
                                                        transform: 'scale(0.8)',
                                                        opacity: 0.5,
                                                    },
                                                    '30%': { transform: 'scale(1)', opacity: 1 },
                                                },
                                                '@keyframes robotTypingDot2': {
                                                    '0%, 30%, 90%, 100%': {
                                                        transform: 'scale(0.8)',
                                                        opacity: 0.5,
                                                    },
                                                    '60%': { transform: 'scale(1)', opacity: 1 },
                                                },
                                                '@keyframes robotTypingDot3': {
                                                    '0%, 60%, 100%': {
                                                        transform: 'scale(0.8)',
                                                        opacity: 0.5,
                                                    },
                                                    '90%': { transform: 'scale(1)', opacity: 1 },
                                                },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 3,
                                                    height: 3,
                                                    borderRadius: '50%',
                                                    background: 'white',
                                                    animation:
                                                        'robotTypingDot1 1.8s ease-in-out infinite',
                                                }}
                                            />
                                            <Box
                                                sx={{
                                                    width: 3,
                                                    height: 3,
                                                    borderRadius: '50%',
                                                    background: 'white',
                                                    animation:
                                                        'robotTypingDot2 1.8s ease-in-out infinite',
                                                }}
                                            />
                                            <Box
                                                sx={{
                                                    width: 3,
                                                    height: 3,
                                                    borderRadius: '50%',
                                                    background: 'white',
                                                    animation:
                                                        'robotTypingDot3 1.8s ease-in-out infinite',
                                                }}
                                            />
                                        </Box>
                                    )}
                                </Box>
                            </Stack>
                        </Stack>

                        {/* STATIONARY CARD — only the TEXT swaps with animation */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2,
                                borderRadius: 2.5,
                                background: alpha(theme.palette.primary.main, 0.06),
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                position: 'relative',
                                minHeight: 72,
                            }}
                        >
                            {/* Left icon bubble (no animation on container) */}
                            <Box
                                sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: alpha(
                                        stepIndex === LAST && progressPct === 100
                                            ? theme.palette.success.main
                                            : theme.palette.primary.main,
                                        0.12
                                    ),
                                    border: `1px solid ${alpha(
                                        stepIndex === LAST && progressPct === 100
                                            ? theme.palette.success.main
                                            : theme.palette.primary.main,
                                        0.45
                                    )}`,
                                    color:
                                        stepIndex === LAST && progressPct === 100
                                            ? theme.palette.success.main
                                            : theme.palette.primary.main,
                                    flex: '0 0 auto',
                                }}
                            >
                                {stepIndex === LAST && progressPct === 100 ? (
                                    <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
                                ) : progressPct < 100 ? (
                                    <RobotTypingAnimation theme={theme} size={16} />
                                ) : (
                                    currentStep.icon
                                )}
                            </Box>

                            {/* Center: TEXT area with layered in/out transitions */}
                            <Box
                                sx={{ position: 'relative', flexGrow: 1, minWidth: 0, height: 28 }}
                            >
                                {/* Outgoing previous text */}
                                {showPrevText && prevStep && (
                                    <Typography
                                        variant="body1"
                                        fontWeight={800}
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            animation: `textOut ${ANIM_MS}ms cubic-bezier(0.2, 0.6, 0.2, 1) both`,
                                            willChange: 'transform, opacity',
                                        }}
                                    >
                                        {prevStep.text}
                                    </Typography>
                                )}

                                {/* Incoming/current text */}
                                <Typography
                                    key={`text-${stepIndex}`}
                                    variant="body1"
                                    fontWeight={800}
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        pr: 1.5,
                                        animation: `textIn ${ANIM_MS}ms cubic-bezier(0.2, 0.6, 0.2, 1) both`,
                                        willChange: 'transform, opacity',
                                        ...(progressPct < 100 && {
                                            '&::after': {
                                                content: '""',
                                                marginLeft: 6,
                                                width: 8,
                                                height: 16,
                                                background: alpha(theme.palette.text.primary, 0.85),
                                                animation: 'blinkCursor .9s step-end infinite',
                                            },
                                        }),
                                    }}
                                >
                                    {currentStep.text}
                                </Typography>
                            </Box>

                            {/* Right percentage (no animation) */}
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 900,
                                    color:
                                        stepIndex === LAST && progressPct === 100
                                            ? theme.palette.success.main
                                            : alpha(theme.palette.text.primary, 0.7),
                                    flex: '0 0 auto',
                                }}
                            >
                                {stepIndex === LAST && progressPct === 100
                                    ? '100%'
                                    : `${Math.min(currentStep.pct, 99)}%`}
                            </Typography>
                        </Paper>

                        {/* Confetti sparkles when 100% */}
                        {stepIndex === LAST && progressPct === 100 && (
                            <Box
                                aria-hidden
                                sx={{
                                    position: 'relative',
                                    mt: 2,
                                    height: 0,
                                    '& .sparkle': {
                                        position: 'absolute',
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: alpha(theme.palette.secondary.main, 0.95),
                                        boxShadow: `0 0 0 2px ${alpha(theme.palette.secondary.main, 0.18)}`,
                                        animation: 'confettiUp 1.8s ease-in-out infinite',
                                    },
                                    '& .sparkle:nth-of-type(1)': {
                                        left: '6%',
                                        top: 0,
                                        animationDelay: '0s',
                                    },
                                    '& .sparkle:nth-of-type(2)': {
                                        left: '22%',
                                        top: 0,
                                        animationDelay: '.2s',
                                    },
                                    '& .sparkle:nth-of-type(3)': {
                                        left: '44%',
                                        top: 0,
                                        animationDelay: '.4s',
                                    },
                                    '& .sparkle:nth-of-type(4)': {
                                        left: '66%',
                                        top: 0,
                                        animationDelay: '.6s',
                                    },
                                    '& .sparkle:nth-of-type(5)': {
                                        left: '84%',
                                        top: 0,
                                        animationDelay: '.8s',
                                    },
                                }}
                            >
                                <Box className="sparkle" />
                                <Box className="sparkle" />
                                <Box className="sparkle" />
                                <Box className="sparkle" />
                                <Box className="sparkle" />
                            </Box>
                        )}
                    </DialogContent>

                    <DialogActions
                        sx={{
                            px: 2,
                            py: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                color: alpha(theme.palette.text.primary, 0.65),
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                            }}
                        >
                            {isGenerating && progressPct < 100 ? (
                                <RobotTypingAnimation theme={theme} size={12} />
                            ) : (
                                <ElectricBoltRoundedIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                            )}
                            {isGenerating && progressPct < 100 ? (
                                <>
                                    AI is analyzing and crafting tasks for{' '}
                                    <strong style={{ marginLeft: 4 }}>{project?.name}</strong>
                                </>
                            ) : (
                                <>
                                    Generating {count} tasks tailored to{' '}
                                    <strong style={{ marginLeft: 4 }}>{project?.name}</strong>
                                </>
                            )}
                        </Typography>

                        <Stack direction="row" spacing={1}>
                            <Button
                                onClick={stopSequentialModal}
                                variant="text"
                                disabled={processing}
                                sx={{ textTransform: 'none', fontWeight: 700 }}
                            >
                                Hide
                            </Button>
                            <Button
                                onClick={stopSequentialModal}
                                variant="contained"
                                disabled={processing}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 800,
                                    background:
                                        'linear-gradient(135deg,#6366F1,#4F46E5 55%,#4338CA)',
                                }}
                            >
                                Continue in Background
                            </Button>
                        </Stack>
                    </DialogActions>
                </Dialog>
            </AuthenticatedLayout>
        </>
    );
}

/** Simple checklist glyph without importing another icon */
function ChecklistIconLike({ theme }) {
    return (
        <Box
            component="span"
            sx={{
                width: 16,
                height: 16,
                borderRadius: '4px',
                border: `2px solid ${alpha(theme.palette.success.main, 0.9)}`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                '&::after': {
                    content: '""',
                    width: 6,
                    height: 10,
                    borderRight: `2px solid ${theme.palette.success.main}`,
                    borderBottom: `2px solid ${theme.palette.success.main}`,
                    transform: 'rotate(45deg)',
                    position: 'absolute',
                },
            }}
        />
    );
}

/** Robot typing animation component */
function RobotTypingAnimation({ theme, size = 20 }) {
    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                '@keyframes robotBounce': {
                    '0%, 20%, 50%, 80%, 100%': {
                        transform: 'translateY(0) rotate(0deg)',
                    },
                    '40%': {
                        transform: 'translateY(-2px) rotate(-2deg)',
                    },
                    '60%': {
                        transform: 'translateY(-1px) rotate(1deg)',
                    },
                },
                '@keyframes typingDot1': {
                    '0%, 80%, 100%': {
                        transform: 'scale(0.6)',
                        opacity: 0.4,
                    },
                    '40%': {
                        transform: 'scale(1)',
                        opacity: 1,
                    },
                },
                '@keyframes typingDot2': {
                    '0%, 20%, 60%, 100%': {
                        transform: 'scale(0.6)',
                        opacity: 0.4,
                    },
                    '40%': {
                        transform: 'scale(1)',
                        opacity: 1,
                    },
                },
                '@keyframes typingDot3': {
                    '0%, 40%, 80%, 100%': {
                        transform: 'scale(0.6)',
                        opacity: 0.4,
                    },
                    '60%': {
                        transform: 'scale(1)',
                        opacity: 1,
                    },
                },
            }}
        >
            <SmartToyRoundedIcon
                sx={{
                    fontSize: size,
                    color: theme.palette.primary.main,
                    animation: 'robotBounce 2s ease-in-out infinite',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
                }}
            />
            <Box
                sx={{
                    display: 'flex',
                    gap: 0.2,
                    alignItems: 'center',
                    ml: 0.2,
                }}
            >
                <Box
                    sx={{
                        width: size * 0.15,
                        height: size * 0.15,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        animation: 'typingDot1 1.4s ease-in-out infinite',
                    }}
                />
                <Box
                    sx={{
                        width: size * 0.15,
                        height: size * 0.15,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        animation: 'typingDot2 1.4s ease-in-out infinite 0.2s',
                    }}
                />
                <Box
                    sx={{
                        width: size * 0.15,
                        height: size * 0.15,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        animation: 'typingDot3 1.4s ease-in-out infinite 0.4s',
                    }}
                />
            </Box>
        </Box>
    );
}
