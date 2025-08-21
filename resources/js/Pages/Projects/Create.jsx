import React, { useEffect, useState, useCallback, useRef, Suspense, lazy } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Box,
    Breadcrumbs,
    Button,
    Container,
    Fade,
    LinearProgress,
    Link as MuiLink,
    Paper,
    Stack,
    Step,
    StepLabel,
    Stepper,
    Typography,
    alpha,
    useTheme,
    CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { validateStep, generateKeyFromName } from './CreateFormValidation';

// Lazy load form steps for better performance
const CreateStepBasics = lazy(() => import('./CreateStepBasics'));
const CreateStepScope = lazy(() => import('./CreateStepScope'));
const CreateStepObjectives = lazy(() => import('./CreateStepObjectives'));
const CreateStepReview = lazy(() => import('./CreateStepReview'));

// Loading component for lazy-loaded steps
const StepLoader = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
    </Box>
);

export default function Create({ auth, projectTypes = [], domains = [] }) {
    const theme = useTheme();
    const steps = ['Basics', 'Scope & Team', 'Objectives', 'Review'];
    const [active, setActive] = useState(0);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        key: '',
        description: '',
        start_date: '',
        end_date: '',
        meta: {
            project_type: '',
            domain: '',
            area: '',
            location: '',
            team_size: 3,
            budget: '',
            primary_stakeholder: '',
            objectives: '',
            constraints: '',
        },
    });

    // Client-side errors (UX)
    const [localErrors, setLocalErrors] = useState({});

    // Autofocus first input
    const nameRef = useRef(null);
    useEffect(() => {
        nameRef.current?.focus();
    }, []);

    // Auto-suggest key from name
    useEffect(() => {
        if (!data.name || data.meta.__keyTouched) return;
        const key = generateKeyFromName(data.name);
        setData('key', key);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.name]);

    // Memoized helper functions
    const setMeta = useCallback(
        (k, val) => setData('meta', { ...data.meta, [k]: val }),
        [data.meta, setData]
    );

    // Validation function using extracted logic
    const validate = useCallback((idx) => validateStep(idx, data, setLocalErrors), [data]);

    const next = useCallback(() => {
        if (!validate(active)) return;
        setActive((n) => Math.min(steps.length - 1, n + 1));
    }, [active, validate, steps.length]);

    const back = useCallback(() => setActive((n) => Math.max(0, n - 1)), []);

    const submit = useCallback(
        (e) => {
            e.preventDefault();
            if (!validate(active)) return;
            post('/projects', {
                onSuccess: () => {
                    reset();
                },
            });
        },
        [active, validate, post, reset]
    );

    // Keyboard shortcut (Ctrl/Cmd + S)
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (!processing) {
                    if (active < steps.length - 1) next();
                    else submit(e);
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [processing, active, next, submit, steps.length]);

    // Memoized gradient to prevent recalculation
    const gradient = `linear-gradient(115deg, ${alpha(
        theme.palette.primary.main,
        0.85
    )} 0%, ${alpha(theme.palette.secondary.main, 0.8)} 60%, ${alpha(
        theme.palette.primary.dark,
        0.85
    )} 100%)`;

    // Step content renderer with lazy loading
    const renderStepContent = () => {
        const commonProps = {
            data,
            setData,
            setMeta,
            errors,
            localErrors,
            projectTypes,
            domains,
        };

        switch (active) {
            case 0:
                return (
                    <Suspense fallback={<StepLoader />}>
                        <CreateStepBasics {...commonProps} nameRef={nameRef} />
                    </Suspense>
                );
            case 1:
                return (
                    <Suspense fallback={<StepLoader />}>
                        <CreateStepScope {...commonProps} />
                    </Suspense>
                );
            case 2:
                return (
                    <Suspense fallback={<StepLoader />}>
                        <CreateStepObjectives {...commonProps} />
                    </Suspense>
                );
            case 3:
                return (
                    <Suspense fallback={<StepLoader />}>
                        <CreateStepReview data={data} />
                    </Suspense>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Head title="Create Project" />
            <AuthenticatedLayout user={auth.user}>
                {/* Hero */}
                <Box
                    sx={{
                        background: gradient,
                        color: '#fff',
                        pt: { xs: 7, md: 9 },
                        pb: { xs: 8, md: 10 },
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        aria-hidden
                        sx={{
                            position: 'absolute',
                            top: -120,
                            left: -80,
                            width: 440,
                            height: 440,
                            borderRadius: '50%',
                            background: alpha('#fff', 0.12),
                            filter: 'blur(90px)',
                        }}
                    />
                    <Box
                        aria-hidden
                        sx={{
                            position: 'absolute',
                            bottom: -140,
                            right: -120,
                            width: 500,
                            height: 500,
                            borderRadius: '50%',
                            background: alpha('#fff', 0.14),
                            filter: 'blur(100px)',
                        }}
                    />
                    <Container maxWidth="md" sx={{ position: 'relative' }}>
                        <Breadcrumbs
                            aria-label="breadcrumb"
                            sx={{
                                '& a, & .MuiTypography-root': {
                                    color: alpha('#fff', 0.9),
                                    fontSize: 14,
                                },
                            }}
                        >
                            <MuiLink
                                underline="hover"
                                color="inherit"
                                href="/dashboard"
                                sx={{ fontWeight: 500 }}
                            >
                                Dashboard
                            </MuiLink>
                            <MuiLink
                                underline="hover"
                                color="inherit"
                                href="/projects"
                                sx={{ fontWeight: 500 }}
                            >
                                Projects
                            </MuiLink>
                            <Typography color="inherit" sx={{ fontWeight: 600 }}>
                                Create
                            </Typography>
                        </Breadcrumbs>

                        <Typography
                            variant="h3"
                            fontWeight={700}
                            sx={{
                                mt: 3,
                                letterSpacing: '-0.5px',
                                textShadow: '0 4px 22px rgba(0,0,0,0.25)',
                            }}
                        >
                            Create a New Project
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{ mt: 2, maxWidth: 720, color: alpha('#fff', 0.92) }}
                        >
                            Step through basics, scope, and goals so AI can generate hyper-relevant
                            suggestions later.
                        </Typography>
                    </Container>
                </Box>

                {/* Form Section */}
                <Box
                    sx={{ bgcolor: 'background.default', py: { xs: 5, md: 8 }, minHeight: '60vh' }}
                >
                    <Container maxWidth="md">
                        <Fade in timeout={500}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 3, sm: 5 },
                                    borderRadius: 4,
                                    position: 'relative',
                                    border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                                    background:
                                        theme.palette.mode === 'light'
                                            ? 'linear-gradient(145deg,#ffffff,#f8f9fb)'
                                            : alpha(theme.palette.background.paper, 0.7),
                                    backdropFilter: 'blur(6px)',
                                    boxShadow:
                                        theme.palette.mode === 'light'
                                            ? '0 4px 18px -4px rgba(0,0,0,.12)'
                                            : '0 4px 18px -6px rgba(0,0,0,.7)',
                                    overflow: 'hidden',
                                }}
                            >
                                {processing && (
                                    <LinearProgress
                                        sx={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            width: '100%',
                                            borderTopLeftRadius: 16,
                                            borderTopRightRadius: 16,
                                        }}
                                    />
                                )}

                                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<ArrowBackIcon />}
                                        href="/projects"
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Back to Projects
                                    </Button>
                                    <Typography variant="h5" fontWeight={700}>
                                        Project Setup
                                    </Typography>
                                </Stack>

                                <Stepper activeStep={active} alternativeLabel sx={{ mb: 4 }}>
                                    {steps.map((label) => (
                                        <Step key={label}>
                                            <StepLabel>{label}</StepLabel>
                                        </Step>
                                    ))}
                                </Stepper>

                                <form onSubmit={submit}>
                                    <Box sx={{ mb: 4, minHeight: 400 }}>{renderStepContent()}</Box>

                                    <Stack
                                        direction="row"
                                        spacing={2}
                                        justifyContent="space-between"
                                    >
                                        <Button
                                            disabled={active === 0}
                                            onClick={back}
                                            variant="outlined"
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Back
                                        </Button>

                                        {active === steps.length - 1 ? (
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                disabled={processing}
                                                startIcon={<SaveIcon />}
                                                sx={{ textTransform: 'none', fontWeight: 600 }}
                                            >
                                                {processing ? 'Creating...' : 'Create Project'}
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={next}
                                                variant="contained"
                                                sx={{ textTransform: 'none', fontWeight: 600 }}
                                            >
                                                Next: {steps[active + 1]}
                                            </Button>
                                        )}
                                    </Stack>
                                </form>
                            </Paper>
                        </Fade>
                    </Container>
                </Box>
            </AuthenticatedLayout>
        </>
    );
}
