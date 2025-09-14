import React, { useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Box, Paper, Typography, Stack, Button, Chip, Divider } from '@mui/material';
import Grid from '@mui/material/Grid';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import QuizIcon from '@mui/icons-material/Quiz';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import SecurityIcon from '@mui/icons-material/Security';

export default function Intro({
    auth,
    attempt,
    totalQuestions,
    theoryDurationMinutes,
    practicalEstimatedMinutes,
    passingScore,
}) {
    const { t } = useTranslation();
    const [starting, setStarting] = useState(false);
    const startedRef = useRef(false);
    const startExam = () => {
        if (startedRef.current) return;
        startedRef.current = true;
        setStarting(true);
        router.post(
            '/certification/begin',
            {},
            {
                onError: () => {
                    startedRef.current = false;
                    setStarting(false);
                },
            }
        );
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={t('head.certification.overview')} />
            <Box sx={{ maxWidth: '900px', mx: 'auto', py: 6, px: 2 }}>
                <Typography variant="h3" fontWeight={700} gutterBottom>
                    {t('certification.title', 'Project Management with AI Certification')}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    {t('certification.subtitle', 'Demonstrate mastery of core PM concepts, applied scenario judgment, and AI-enabled delivery practices.')}
                </Typography>

                <Paper sx={{ p: 4, mb: 4 }} elevation={3}>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        Exam Structure
                                    </Typography>
                                    <ul
                                        style={{
                                            margin: 0,
                                            paddingLeft: '1.2rem',
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        <li>
                                            {totalQuestions} theory questions (single‑answer +
                                            situational).
                                        </li>
                                        <li>
                                            Followed by 1 practical simulation (multi‑step,
                                            adaptive).
                                        </li>
                                        <li>
                                            Immediate results & blockchain‑verifiable certificate if
                                            you pass.
                                        </li>
                                    </ul>
                                </Box>
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        Timing
                                    </Typography>
                                    <ul
                                        style={{
                                            margin: 0,
                                            paddingLeft: '1.2rem',
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        <li>
                                            {theoryDurationMinutes} minutes for theory section
                                            (countdown starts when you begin).
                                        </li>
                                        <li>
                                            Practical simulation ~{practicalEstimatedMinutes}{' '}
                                            minutes typical.
                                        </li>
                                        <li>
                                            No pause once started; unstable network may impact
                                            timer.
                                        </li>
                                    </ul>
                                </Box>
                            </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        Scoring
                                    </Typography>
                                    <ul
                                        style={{
                                            margin: 0,
                                            paddingLeft: '1.2rem',
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        <li>Theory + simulation combined weighted to 100%.</li>
                                        <li>Passing threshold: {passingScore}% overall.</li>
                                        <li>
                                            AI assists with qualitative simulation evaluation for
                                            consistency.
                                        </li>
                                    </ul>
                                </Box>
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        Integrity & Rules
                                    </Typography>
                                    <ul
                                        style={{
                                            margin: 0,
                                            paddingLeft: '1.2rem',
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        <li>Randomized question order & answer shuffling.</li>
                                        <li>
                                            Back navigation limited; time expires auto‑submits
                                            answered items.
                                        </li>
                                        <li>
                                            No external aides or collaboration allowed during
                                            attempt.
                                        </li>
                                    </ul>
                                </Box>
                            </Stack>
                        </Grid>
                    </Grid>
                    <Divider sx={{ my: 3 }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
                        <Chip
                            icon={<QuizIcon />}
                            label={`${totalQuestions} Questions`}
                            color="primary"
                        />
                        <Chip
                            icon={<AccessTimeIcon />}
                            label={`${theoryDurationMinutes}m Theory`}
                            color="secondary"
                        />
                        <Chip
                            icon={<PsychologyIcon />}
                            label={`+ Simulation (~${practicalEstimatedMinutes}m)`}
                        />
                        <Chip icon={<SecurityIcon />} label={`Pass ≥ ${passingScore}%`} />
                        <Chip icon={<TipsAndUpdatesIcon />} label="AI‑Augmented" />
                    </Stack>

                    <Box mt={5} textAlign="center">
                        <Button
                            size="large"
                            variant="contained"
                            color="primary"
                            startIcon={<PlayCircleOutlineIcon />}
                            onClick={startExam}
                            disabled={starting}
                        >
                            {starting ? t('certification.starting', 'Starting...') : t('certification.beginCertification', 'Begin Certification')}
                        </Button>
                        <Typography variant="caption" display="block" mt={1} color="text.secondary">
                            Timer starts when you click Begin.
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </AuthenticatedLayout>
    );
}
