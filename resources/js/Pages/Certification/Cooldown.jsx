import { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Box,
    Card,
    CardContent,
    Typography,
    LinearProgress,
    Button,
    Alert,
    Container,
    Divider,
    Chip,
    Stack,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockIcon from '@mui/icons-material/Lock';
import RestartAltIcon from '@mui/icons-material/RestartAlt';


import { useTranslation } from 'react-i18next';export default function Cooldown({ hoursRemaining, nextAttemptAt, reason }) {
  const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState({
        hours: Math.floor(hoursRemaining),
        minutes: Math.floor((hoursRemaining % 1) * 60),
    });

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const nextAttempt = new Date(nextAttemptAt);
            const diff = nextAttempt - now;

            if (diff <= 0) {
                setTimeLeft({ hours: 0, minutes: 0 });
                // Reload page to allow new attempt
                window.location.reload();
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            setTimeLeft({ hours, minutes });
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, [nextAttemptAt]);

    const progressValue = ((24 - hoursRemaining) / 24) * 100;

    return (
        <AuthenticatedLayout>
            <Head title={t('head.certification.cooldown')} />

            <Container maxWidth="md" sx={{ py: 4 }}>
                <Card elevation={3}>
                    <CardContent sx={{ p: 4 }}>
                        <Stack spacing={3} alignItems="center" textAlign="center">
                            <Box>
                                <LockIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
                                <Typography variant="h4" gutterBottom color="error">
                                    Exam Cooldown Active
                                </Typography>
                            </Box>

                            <Alert severity="warning" sx={{ width: '100%' }}>
                                <Typography variant="body1">
                                    {reason ||
                                        'Previous exam attempt was not completed within the time limit.'}
                                </Typography>
                            </Alert>

                            <Divider sx={{ width: '100%' }} />

                            <Box sx={{ width: '100%' }}>
                                <Typography variant="h6" gutterBottom color="text.secondary">
                                    Time Until Next Attempt
                                </Typography>

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h3" color="primary" gutterBottom>
                                        {timeLeft.hours}h {timeLeft.minutes}m
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Next attempt available: {nextAttemptAt}
                                    </Typography>
                                </Box>

                                <LinearProgress
                                    variant="determinate"
                                    value={progressValue}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        mb: 2,
                                        backgroundColor: 'grey.200',
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 4,
                                        },
                                    }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {Math.round(progressValue)}% of cooldown period completed
                                </Typography>
                            </Box>

                            <Divider sx={{ width: '100%' }} />

                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    Understanding the Cooldown System
                                </Typography>
                                <Stack spacing={2} sx={{ textAlign: 'left', maxWidth: 600 }}>
                                    <Alert severity="info" icon={<AccessTimeIcon />}>
                                        <Typography variant="body2">
                                            <strong>Exam Duration:</strong> You have exactly 20
                                            minutes to complete the certification exam once started.
                                        </Typography>
                                    </Alert>
                                    <Alert severity="warning" icon={<RestartAltIcon />}>
                                        <Typography variant="body2">
                                            <strong>Time Management:</strong> The timer continues
                                            running even if you navigate away or close the browser.
                                        </Typography>
                                    </Alert>
                                    <Alert severity="error" icon={<LockIcon />}>
                                        <Typography variant="body2">
                                            <strong>Cooldown Period:</strong> If time expires
                                            without completion, you must wait 24 hours before your
                                            next attempt.
                                        </Typography>
                                    </Alert>
                                </Stack>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                                <Button
                                    component={Link}
                                    href="/dashboard"
                                    variant="outlined"
                                    size="large"
                                >
                                    Return to Dashboard
                                </Button>

                                <Button
                                    variant="contained"
                                    size="large"
                                    disabled={timeLeft.hours > 0 || timeLeft.minutes > 0}
                                    component={
                                        timeLeft.hours === 0 && timeLeft.minutes === 0
                                            ? Link
                                            : 'button'
                                    }
                                    href={
                                        timeLeft.hours === 0 && timeLeft.minutes === 0
                                            ? '/certification/cleanup'
                                            : undefined
                                    }
                                    method={
                                        timeLeft.hours === 0 && timeLeft.minutes === 0
                                            ? 'post'
                                            : undefined
                                    }
                                    startIcon={<RestartAltIcon />}
                                >
                                    {timeLeft.hours === 0 && timeLeft.minutes === 0
                                        ? 'Start New Attempt'
                                        : 'Attempt Locked'}
                                </Button>
                            </Box>

                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary">
                                    This cooldown system ensures fair exam conditions and prevents
                                    rapid retries.
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Container>
        </AuthenticatedLayout>
    );
}
