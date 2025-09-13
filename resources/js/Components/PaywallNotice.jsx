import React from 'react';
import { Box, Paper, Typography, Button, Stack, Chip, useTheme, alpha } from '@mui/material';
import {
    LockRounded as LockIcon,
    UpgradeRounded as UpgradeIcon,
    StarRounded as StarIcon,
    RocketLaunchRounded as RocketIcon,
    Settings as SettingsIcon,
    Group as GroupIcon,
    Assessment as AssessmentIcon,
    AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function PaywallNotice({
    feature,
    currentPlan = 'free',
    showUpgrade = true,
    fullWidth = false,
    variant = 'card', // 'card' | 'banner' | 'modal'
}) {
    const theme = useTheme();
    const { t } = useTranslation();
    
    const featureInfo = {
        ai_task_generation: {
            title: t('paywall.aiTaskGeneration'),
            description: t('paywall.aiTaskGenerationDesc'),
            icon: <RocketIcon />,
            color: 'primary',
        },
        automation: {
            title: t('paywall.automationTitle'),
            description: t('paywall.automationDescription'),
            icon: <SettingsIcon />,
            color: 'secondary',
        },
        members: {
            title: t('paywall.teamCollaborationTitle'),
            description: t('paywall.teamCollaborationDescription'),
            icon: <GroupIcon />,
            color: 'info',
        },
        reports: {
            title: t('paywall.advancedReports'),
            description: t('paywall.advancedReportsDesc'),
            icon: <AssessmentIcon />,
            color: 'success',
        },
        ai_assistant: {
            title: t('paywall.aiAssistantTitle'),
            description: t('paywall.aiAssistantDescription'),
            icon: <AutoAwesomeIcon />,
            color: 'warning',
        },
    };
    
    const info = featureInfo[feature] || {
        title: t('paywall.premiumFeature'),
        description: t('features.premiumFeatureDesc'),
        icon: <StarIcon />,
        color: 'primary',
    };

    const handleUpgrade = () => {
        router.get('/billing');
    };

    const handleStartTrial = () => {
        router.get('/billing?action=trial');
    };

    if (variant === 'banner') {
        return (
            <Box
                sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${alpha(theme.palette[info.color].main, 0.1)} 0%, ${alpha(theme.palette[info.color].main, 0.05)} 100%)`,
                    border: `1px solid ${alpha(theme.palette[info.color].main, 0.2)}`,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: 1,
                            background: alpha(theme.palette[info.color].main, 0.1),
                            color: theme.palette[info.color].main,
                        }}
                    >
                        <LockIcon />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                            {info.title} - {t('paywall.premiumFeature')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {info.description}
                        </Typography>
                    </Box>
                    {showUpgrade && (
                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleStartTrial}
                                sx={{ textTransform: 'none' }}
                            >
                                {t('paywall.startTrial')}
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleUpgrade}
                                sx={{ textTransform: 'none' }}
                            >
                                {t('paywall.upgradeNow')}
                            </Button>
                                size="small"
                                onClick={handleStartTrial}
                                sx={{ fontWeight: 600 }}
                            >
                                Start Trial
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                color={info.color}
                                onClick={handleUpgrade}
                                startIcon={<UpgradeIcon />}
                                sx={{ fontWeight: 600 }}
                            >
                                Upgrade
                            </Button>
                        </Stack>
                    )}
                </Stack>
            </Box>
        );
    }

    return (
        <Paper
            elevation={0}
            sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 4,
                background: `linear-gradient(135deg, ${alpha(theme.palette[info.color].main, 0.08)} 0%, ${alpha(theme.palette[info.color].main, 0.02)} 100%)`,
                border: `2px dashed ${alpha(theme.palette[info.color].main, 0.3)}`,
                width: fullWidth ? '100%' : 'auto',
                maxWidth: fullWidth ? 'none' : 500,
                mx: 'auto',
            }}
        >
            <Stack spacing={3} alignItems="center">
                <Box
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${theme.palette[info.color].main}, ${theme.palette[info.color].dark})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 32,
                    }}
                >
                    <LockIcon sx={{ fontSize: 32 }} />
                </Box>

                <Stack spacing={1} alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                            icon={info.icon}
                            label={info.title}
                            color={info.color}
                            sx={{ fontWeight: 700 }}
                        />
                        <Chip
                            label={t('features.premiumFeature')}
                            size="small"
                            sx={{
                                background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
                                color: 'white',
                                fontWeight: 700,
                            }}
                        />
                    </Stack>

                    <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
                        {t('paywall.unlockPremiumFeatures')}
                    </Typography>

                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
                        {info.description}. Upgrade to a paid plan or start your free trial to
                        access this feature.
                    </Typography>
                </Stack>

                {currentPlan === 'free' && (
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            background: alpha(theme.palette.info.main, 0.1),
                            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                            width: '100%',
                        }}
                    >
                        <Typography variant="body2" color="info.main" fontWeight={600}>
                            💡 Start with a 7-day free trial - no commitment required!
                        </Typography>
                    </Box>
                )}

                {showUpgrade && (
                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="outlined"
                            size="large"
                            onClick={handleStartTrial}
                            sx={{
                                fontWeight: 700,
                                borderRadius: 3,
                                px: 3,
                            }}
                        >
                            Start Free Trial
                        </Button>
                        <Button
                            variant="contained"
                            size="large"
                            color={info.color}
                            onClick={handleUpgrade}
                            startIcon={<UpgradeIcon />}
                            sx={{
                                fontWeight: 700,
                                borderRadius: 3,
                                px: 3,
                                background: `linear-gradient(135deg, ${theme.palette[info.color].main}, ${theme.palette[info.color].dark})`,
                                boxShadow: `0 8px 20px ${alpha(theme.palette[info.color].main, 0.3)}`,
                                '&:hover': {
                                    boxShadow: `0 12px 24px ${alpha(theme.palette[info.color].main, 0.4)}`,
                                },
                            }}
                        >
                            Upgrade Now
                        </Button>
                    </Stack>
                )}
            </Stack>
        </Paper>
    );
}

// Import the missing icons
import {
    Settings as SettingsIcon,
    Group as GroupIcon,
    Assessment as AssessmentIcon,
    AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
