// resources/js/Pages/Board/HeaderBanner.jsx
import React from 'react';
import {
    alpha,
    Box,
    Button,
    Chip,
    Paper,
    Stack,
    Typography,
    Tooltip,
    IconButton,
    useTheme,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AutoGraphRoundedIcon from '@mui/icons-material/AutoGraphRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LockIcon from '@mui/icons-material/Lock';
import ProCluster from './ProCluster'; // ✅ relative path (same folder)
import { useSubscription } from '@/Hooks/useSubscription';
import { router } from '@inertiajs/react';

export default function HeaderBanner({
    projectName = 'Project',
    totalTasks = 0,
    percentDone = 0,
    usersCount = 0,
    onAiTasks,
    isPro = false,
    onOpenMembers,
    onOpenAutomations,
    onOpenReport,
    onOpenDetails,
    onOpenAssistant,
}) {
    const theme = useTheme();
    const { t } = useTranslation();
    const { shouldShowOverlay, userPlan } = useSubscription();
    const assistantLocked = shouldShowOverlay('ai_chat');
    const automationLocked = shouldShowOverlay('automation');

    const handleAssistantClick = () => {
        // Always allow opening the chat - overlay will be shown on responses instead
        onOpenAssistant();
    };

    return (
        <Paper
            elevation={0}
            sx={{
                mb: 2.5,
                p: { xs: 2.4, md: 3.2 },
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden',
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)}, ${alpha(theme.palette.background.paper, 0.85)})`,
                backdropFilter: 'blur(16px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                boxShadow: theme.shadows[8],
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
                columnGap: { xs: 0, md: 3 },
                rowGap: 2,
                alignItems: 'center',
            }}
        >
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    width: 380,
                    height: 380,
                    top: -160,
                    right: -140,
                    background: `radial-gradient(circle at 60% 40%, ${alpha(theme.palette.primary.light, 0.3)}, transparent 65%)`,
                    pointerEvents: 'none',
                }}
            />

            <Stack spacing={1.25}>
                <Typography
                    variant="h6"
                    fontWeight={900}
                    sx={{
                        letterSpacing: '-0.4px',
                        background: `linear-gradient(90deg, ${theme.palette.text.primary}, ${alpha(theme.palette.text.primary, 0.8)} 40%, ${alpha(theme.palette.text.primary, 0.6)} 80%)`,
                        WebkitBackgroundClip: 'text',
                        color: 'transparent',
                    }}
                >
                    {projectName} – {t('board.taskBoard')}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    {/* Information Chips - Grouped together */}
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip
                            icon={<AutoGraphRoundedIcon />}
                            label={t('board.taskCount', { count: totalTasks })}
                            sx={{
                                fontWeight: 700,
                                background: `linear-gradient(120deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.light, 0.15)})`,
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                                height: 30,
                            }}
                        />
                        <Chip
                            icon={<CheckCircleRoundedIcon />}
                            label={t('board.percentComplete', { percent: percentDone })}
                            sx={{
                                fontWeight: 700,
                                background: `linear-gradient(120deg, ${alpha(theme.palette.success.main, 0.2)}, ${alpha(theme.palette.success.main, 0.1)})`,
                                border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
                                height: 30,
                            }}
                        />
                        <Chip
                            icon={<PersonRoundedIcon />}
                            label={t('members.memberCount', { count: usersCount })}
                            sx={{
                                fontWeight: 700,
                                background: `linear-gradient(120deg, ${alpha(theme.palette.info.main, 0.18)}, ${alpha(theme.palette.info.main, 0.08)})`,
                                border: `1px solid ${alpha(theme.palette.info.main, 0.45)}`,
                                height: 30,
                            }}
                        />
                    </Stack>

                    {/* Action Buttons - Grouped together with consistent styling */}
                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Tooltip title={t('features.aiChat')}>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleAssistantClick}
                                startIcon={<SmartToyIcon />}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: 999,
                                    px: 2,
                                    py: 0.7,
                                    height: 32,
                                    borderColor: 'secondary.main',
                                    color: 'secondary.main',
                                    '&:hover': {
                                        borderColor: 'secondary.dark',
                                        bgcolor: alpha(theme.palette.secondary.main, 0.04),
                                    },
                                }}
                            >
                                {t('features.aiAssistant')}
                            </Button>
                        </Tooltip>

                        <Tooltip title={t('board.viewDetails')}>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={onOpenDetails}
                                startIcon={<InfoOutlinedIcon />}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: 999,
                                    px: 2,
                                    py: 0.7,
                                    height: 32,
                                }}
                            >
                                {t('board.details')}
                            </Button>
                        </Tooltip>

                        <Button
                            variant="contained"
                            size="small"
                            onClick={onAiTasks}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: 999,
                                px: 2.1,
                                py: 0.7,
                                height: 32,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark} 60%, ${theme.palette.primary.dark})`,
                                boxShadow: theme.shadows[6],
                                '&:hover': {
                                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main} 60%, ${theme.palette.primary.light})`,
                                },
                            }}
                        >
                            {t('features.aiTasks')}
                        </Button>
                    </Box>
                </Stack>
            </Stack>

            <ProCluster
                isPro={isPro}
                onOpenMembers={onOpenMembers}
                onOpenAutomations={onOpenAutomations}
                onOpenReport={onOpenReport}
                automationLocked={automationLocked}
            />
        </Paper>
    );
}
