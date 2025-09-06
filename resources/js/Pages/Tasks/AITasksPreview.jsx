import React, { useCallback, useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    alpha,
    Box,
    Button,
    Checkbox,
    Chip,
    Divider,
    FormControlLabel,
    Paper,
    Stack,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';

import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';

export default function AITasksPreview({
    auth,
    project,
    generated = [],
    originalInput = {},
    showOverlay = false,
    upgradeUrl = '/billing',
    limitExceeded = false,
}) {
    const theme = useTheme();
    const [pinnedTasks, setPinnedTasks] = useState(new Set());

    const handlePinToggle = (taskIndex) => {
        setPinnedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskIndex)) {
                newSet.delete(taskIndex);
            } else {
                newSet.add(taskIndex);
            }
            return newSet;
        });
    };

    const redo = () => {
        const pinnedTasksArray = Array.from(pinnedTasks).map(index => generated[index]);
        console.log('Preview: Sending pinned tasks to generator:', {
            pinnedIndices: Array.from(pinnedTasks),
            pinnedTasksArray: pinnedTasksArray,
            pinnedCount: pinnedTasksArray.length,
            originalInputKeys: Object.keys(originalInput),
        });
        
        router.visit(route('tasks.ai.form', project.id), {
            method: 'get',
            data: {
                ...originalInput,
                pinnedTasks: pinnedTasksArray,
            },
            preserveState: true,
            preserveScroll: true,
        });
    };

    const accept = () =>
        router.post(route('tasks.ai.accept', project.id), {
            generated: generated,
            preserveScroll: true,
        });

    const keyHandler = useCallback(
        (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') accept();
        },
        [generated]
    );

    useEffect(() => {
        window.addEventListener('keydown', keyHandler);
        return () => window.removeEventListener('keydown', keyHandler);
    }, [keyHandler]);

    return (
        <>
            <Head title="AI Tasks Preview" />
            <AuthenticatedLayout user={auth.user}>
                <Box
                    sx={{
                        minHeight: '100vh',
                        p: { xs: 2, md: 4 },
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        background:
                            theme.palette.mode === 'light'
                                ? 'linear-gradient(135deg,#F2F7FC 0%,#E9F0F9 50%,#E2E9F3 100%)'
                                : 'linear-gradient(135deg,#0F1823,#101B27)',
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            width: '100%',
                            maxWidth: 900,
                            p: { xs: 3, md: 4 },
                            borderRadius: 4,
                            position: 'relative',
                            overflow: 'hidden',
                            background:
                                'linear-gradient(145deg,rgba(255,255,255,0.88),rgba(255,255,255,0.62))',
                            backdropFilter: 'blur(16px)',
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            boxShadow:
                                '0 12px 36px -14px rgba(28,46,78,.3), 0 2px 4px rgba(0,0,0,.05)',
                        }}
                    >
                        <Box
                            aria-hidden
                            sx={{
                                position: 'absolute',
                                width: 340,
                                height: 340,
                                top: -140,
                                right: -110,
                                borderRadius: '50%',
                                background:
                                    'radial-gradient(circle at 60% 40%, rgba(255,255,255,0.65), transparent 70%)',
                            }}
                        />

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            justifyContent="space-between"
                            mb={2.5}
                        >
                            <Stack spacing={1}>
                                <Typography
                                    variant="h5"
                                    fontWeight={800}
                                    sx={{
                                        letterSpacing: '-0.5px',
                                        background:
                                            'linear-gradient(90deg,#101E40,#2F4370 55%,#456092 90%)',
                                        WebkitBackgroundClip: 'text',
                                        color: 'transparent',
                                    }}
                                >
                                    Preview {generated.length} Tasks
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: alpha(theme.palette.text.primary, 0.7),
                                        lineHeight: 1.55,
                                        maxWidth: 620,
                                    }}
                                >
                                    Review the AI‑generated tasks for{' '}
                                    <strong>{project.name}</strong>. You can accept them, or redo
                                    the generation with different settings.
                                </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip
                                    icon={<AutoAwesomeIcon />}
                                    label="AI Draft"
                                    size="small"
                                    sx={{
                                        fontWeight: 600,
                                        background: alpha(theme.palette.primary.main, 0.12),
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                    }}
                                />
                                <Chip
                                    icon={<TaskAltRoundedIcon />}
                                    label={`${generated.length} Items`}
                                    size="small"
                                    sx={{
                                        fontWeight: 600,
                                        background: alpha(theme.palette.success.main, 0.15),
                                        border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                                    }}
                                />
                            </Stack>
                        </Stack>

                        <Divider sx={{ mb: 3 }} />

                        {/* Instructions for pinning */}
                        {generated.length > 0 && (
                            <Box sx={{ mb: 2, p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.06), borderRadius: 2, border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                                <Typography variant="body2" sx={{ color: alpha(theme.palette.text.primary, 0.8) }}>
                                    📌 <strong>All tasks start unpinned.</strong> Click the pin icon on tasks you want to keep, then click "Redo" to regenerate only the unpinned ones.
                                </Typography>
                            </Box>
                        )}

                        <Stack spacing={2} sx={{ position: 'relative' }}>
                            {generated.map((t, i) => {
                                const palette = [
                                    '#6366F1',
                                    '#2C8DFF',
                                    '#9C4DFF',
                                    '#22B36B',
                                    '#FFA432',
                                ];
                                const accent = palette[i % palette.length];
                                return (
                                    <Paper
                                        key={i}
                                        elevation={0}
                                        sx={{
                                            p: 2.1,
                                            position: 'relative',
                                            borderRadius: 3,
                                            background:
                                                'linear-gradient(145deg,rgba(255,255,255,0.75),rgba(255,255,255,0.5))',
                                            border: `1px solid ${alpha(accent, 0.35)}`,
                                            boxShadow:
                                                '0 3px 10px -5px rgba(0,0,0,.15), 0 1px 0 0 rgba(255,255,255,0.65) inset',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1,
                                            transition: 'all .35s',
                                            '&:before': {
                                                content: '""',
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                bottom: 0,
                                                width: 6,
                                                background: `linear-gradient(180deg,${accent},${alpha(
                                                    accent,
                                                    0.35
                                                )})`,
                                            },
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow:
                                                    '0 8px 22px -10px rgba(0,0,0,.28), 0 1px 0 0 rgba(255,255,255,0.7) inset',
                                            },
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle1"
                                            fontWeight={700}
                                            sx={{ lineHeight: 1.35, mb: 1 }}
                                        >
                                            {t.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: alpha(theme.palette.text.primary, 0.75),
                                                whiteSpace: 'pre-line',
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            {t.description || (
                                                <Typography
                                                    variant="body2"
                                                    component="span"
                                                    sx={{ fontStyle: 'italic', opacity: 0.6 }}
                                                >
                                                    (No description)
                                                </Typography>
                                            )}
                                        </Typography>
                                        {t.end_date && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    mt: 0.5,
                                                    fontWeight: 600,
                                                    letterSpacing: 0.4,
                                                    color: alpha(theme.palette.text.primary, 0.6),
                                                }}
                                            >
                                                Execute by: {t.end_date}
                                            </Typography>
                                        )}

                                        {/* 3D Pin at bottom of card */}
                                        <Box sx={{ 
                                            display: 'flex', 
                                            justifyContent: 'flex-end', 
                                            mt: 1.5,
                                            position: 'relative'
                                        }}>
                                            <Tooltip title={pinnedTasks.has(i) ? "Unpin task" : "Pin task to keep when redoing"}>
                                                <Box
                                                    onClick={() => handlePinToggle(i)}
                                                    sx={{
                                                        cursor: 'pointer',
                                                        position: 'relative',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        background: pinnedTasks.has(i) 
                                                            ? `linear-gradient(135deg, ${accent}22, ${accent}15)`
                                                            : `linear-gradient(135deg, ${alpha(theme.palette.grey[200], 0.2)}, ${alpha(theme.palette.grey[100], 0.1)})`,
                                                        border: pinnedTasks.has(i) 
                                                            ? `2px solid ${alpha(accent, 0.4)}`
                                                            : `2px solid ${alpha(theme.palette.grey[300], 0.2)}`,
                                                        boxShadow: pinnedTasks.has(i)
                                                            ? `
                                                                0 4px 8px -2px ${alpha(accent, 0.3)},
                                                                0 2px 4px -1px ${alpha(accent, 0.2)},
                                                                inset 0 1px 0 rgba(255,255,255,0.3),
                                                                inset 0 -1px 0 ${alpha(accent, 0.1)}
                                                            `
                                                            : `
                                                                0 3px 6px -2px rgba(0,0,0,0.15),
                                                                0 1px 3px -1px rgba(0,0,0,0.1),
                                                                inset 0 1px 0 rgba(255,255,255,0.4),
                                                                inset 0 -1px 0 rgba(0,0,0,0.05)
                                                            `,
                                                        transition: 'all 0.2s ease-in-out',
                                                        '&:hover': {
                                                            transform: 'translateY(-1px) scale(1.05)',
                                                            boxShadow: pinnedTasks.has(i)
                                                                ? `
                                                                    0 6px 12px -3px ${alpha(accent, 0.4)},
                                                                    0 3px 6px -2px ${alpha(accent, 0.3)},
                                                                    inset 0 1px 0 rgba(255,255,255,0.4),
                                                                    inset 0 -1px 0 ${alpha(accent, 0.2)}
                                                                `
                                                                : `
                                                                    0 5px 10px -3px rgba(0,0,0,0.2),
                                                                    0 2px 5px -2px rgba(0,0,0,0.15),
                                                                    inset 0 1px 0 rgba(255,255,255,0.5),
                                                                    inset 0 -1px 0 rgba(0,0,0,0.08)
                                                                `,
                                                        },
                                                        '&:active': {
                                                            transform: 'translateY(0) scale(0.98)',
                                                        }
                                                    }}
                                                >
                                                    <PushPinRoundedIcon 
                                                        sx={{ 
                                                            fontSize: 18,
                                                            color: pinnedTasks.has(i) ? accent : alpha(theme.palette.grey[500], 0.5),
                                                            filter: pinnedTasks.has(i) 
                                                                ? `drop-shadow(0 1px 2px ${alpha(accent, 0.3)})`
                                                                : 'drop-shadow(0 1px 1px rgba(0,0,0,0.05))',
                                                            transition: 'all 0.2s ease-in-out',
                                                        }} 
                                                    />
                                                </Box>
                                            </Tooltip>
                                        </Box>
                                        <Chip
                                            size="small"
                                            label={`#${i + 1}`}
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                height: 22,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                background: alpha(accent, 0.12),
                                                border: `1px solid ${alpha(accent, 0.3)}`,
                                            }}
                                        />
                                    </Paper>
                                );
                            })}
                        </Stack>

                        {generated.length === 0 && (
                            <Typography
                                variant="body2"
                                sx={{
                                    mt: 1,
                                    fontStyle: 'italic',
                                    color: alpha(theme.palette.text.primary, 0.6),
                                }}
                            >
                                No tasks were generated. Try again with different input.
                            </Typography>
                        )}

                        <Divider sx={{ my: 4 }} />

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            justifyContent="flex-end"
                        >
                            <Button
                                variant="text"
                                color="inherit"
                                startIcon={<ArrowBackRoundedIcon />}
                                onClick={() => router.visit(route('tasks.ai.form', project.id), {
                                    method: 'get',
                                    data: originalInput,
                                    preserveState: true,
                                    preserveScroll: true,
                                })}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Back
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<ReplayRoundedIcon />}
                                onClick={redo}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    borderRadius: 2,
                                }}
                            >
                                {pinnedTasks.size > 0 ? `Redo (Keep ${pinnedTasks.size})` : 'Redo'}
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<CheckCircleRoundedIcon />}
                                onClick={accept}
                                disabled={generated.length === 0}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    px: 3,
                                    borderRadius: 2,
                                    background:
                                        'linear-gradient(135deg,#6366F1,#4F46E5 55%,#4338CA)',
                                    boxShadow:
                                        '0 6px 18px -6px rgba(79,70,229,.55), 0 2px 6px rgba(0,0,0,.25)',
                                    '&:hover': {
                                        background:
                                            'linear-gradient(135deg,#595CEB,#4841D6 55%,#3B32B8)',
                                    },
                                }}
                            >
                                Accept & Save
                                <Chip
                                    label={generated.length}
                                    size="small"
                                    sx={{
                                        ml: 1,
                                        height: 22,
                                        fontWeight: 600,
                                        background: alpha(theme.palette.success.main, 0.18),
                                        border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
                                    }}
                                />
                            </Button>
                        </Stack>

                        <Box sx={{ mt: 3, textAlign: 'right' }}>
                            <Typography
                                variant="caption"
                                sx={{ color: alpha(theme.palette.text.primary, 0.55) }}
                            >
                                Tip: Cmd/Ctrl + Enter to accept instantly.
                            </Typography>
                        </Box>

                        {showOverlay && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    // Soft baby‑blue → pink translucent gradient + blur so users see layout but not read text clearly
                                    background:
                                        'linear-gradient(135deg, rgba(173,216,255,0.30), rgba(255,183,213,0.30))',
                                    backdropFilter: 'blur(2px) saturate(1.03)',
                                    WebkitBackdropFilter: 'blur(2px) saturate(1.03)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    zIndex: 20,
                                    p: 3,
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                }}
                            >
                                <Box sx={{ fontSize: 46, mb: 1 }}>🔒</Box>
                                <Typography
                                    variant="h6"
                                    fontWeight={800}
                                    sx={{
                                        mb: 1,
                                        background: 'linear-gradient(90deg,#1e3a8a,#6366f1)',
                                        WebkitBackgroundClip: 'text',
                                        color: 'transparent',
                                        textShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    {limitExceeded
                                        ? 'Monthly AI Task Limit Reached'
                                        : 'Upgrade to Unlock Task Details'}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: '#1e293b',
                                        fontWeight: 500,
                                        mb: 2.2,
                                        maxWidth: 460,
                                        lineHeight: 1.55,
                                        textShadow: '0 1px 4px rgba(255,255,255,0.6)',
                                    }}
                                >
                                    {limitExceeded
                                        ? 'You have used all of your included AI task generations for this month. Upgrade now to unlock more capacity and save these tasks.'
                                        : 'Subscribe to reveal full AI‑generated task descriptions and save them directly to your project.'}
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <Button
                                        variant="contained"
                                        onClick={() => router.visit(upgradeUrl)}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            px: 3,
                                            background:
                                                'linear-gradient(135deg,#60a5fa,#6366F1 55%,#a855f7)',
                                            boxShadow: '0 10px 24px -6px rgba(99,102,241,0.45)',
                                        }}
                                    >
                                        Upgrade Now
                                    </Button>
                                    <Button
                                        variant="text"
                                        onClick={() =>
                                            router.visit(route('tasks.ai.form', project.id), {
                                                method: 'get',
                                                data: originalInput,
                                                preserveState: true,
                                                preserveScroll: true,
                                            })
                                        }
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            color: '#1e3a8a',
                                            '&:hover': { textDecoration: 'underline' },
                                        }}
                                    >
                                        Back
                                    </Button>
                                </Stack>
                            </Box>
                        )}
                    </Paper>
                </Box>
            </AuthenticatedLayout>
        </>
    );
}
