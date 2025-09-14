import React, { useEffect, useState, useCallback, useRef, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
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
import DocumentUploadStep from './DocumentUploadStep';

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
    const { t } = useTranslation();
    const steps = [
        t('projects.steps.method'),
        t('projects.steps.basics'),
        t('projects.steps.scopeTeam'),
        t('projects.steps.objectives'),
        t('projects.steps.review'),
    ];
    const [active, setActive] = useState(0);
    const [creationMethod, setCreationMethod] = useState(null); // 'manual' or 'document'
    const [documentAnalysisData, setDocumentAnalysisData] = useState(null);

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

    // Debug: Log form data changes
    useEffect(() => {
        console.log('Form data changed:', data);
    }, [data]);

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
    const validate = useCallback((idx) => validateStep(idx, data, setLocalErrors, t), [data, t]);

    const next = useCallback(() => {
        // Skip validation for method selection step
        if (active === 0) {
            setActive((n) => Math.min(steps.length - 1, n + 1));
            return;
        }
        if (!validate(active)) return;
        setActive((n) => Math.min(steps.length - 1, n + 1));
    }, [active, validate, steps.length]);

    const back = useCallback(() => setActive((n) => Math.max(0, n - 1)), []);

    const handleDocumentAnalyzed = useCallback(
        (analysisDataRaw) => {
            console.log('=== DOCUMENT ANALYSIS DEBUG ===');
            console.log('Raw analysis data:', analysisDataRaw);
            console.log('Type:', typeof analysisDataRaw);
            if (Array.isArray(analysisDataRaw)) {
                console.warn('Analysis data is an array; taking first element.');
            }

            // Defensive: unwrap array / nested structures some models might return
            let analysisData = Array.isArray(analysisDataRaw)
                ? analysisDataRaw[0]
                : analysisDataRaw;
            if (
                analysisData &&
                typeof analysisData === 'object' &&
                analysisData.data &&
                typeof analysisData.data === 'object'
            ) {
                console.log('Unwrapping nested data property.');
                analysisData = analysisData.data;
            }
            if (
                analysisData &&
                typeof analysisData === 'object' &&
                analysisData.project &&
                typeof analysisData.project === 'object'
            ) {
                console.log('Unwrapping nested project property.');
                analysisData = { ...analysisData.project, ...analysisData }; // project fields take precedence
            }

            if (!analysisData || typeof analysisData !== 'object') {
                console.warn('Analysis data is not an object; aborting population.');
                setActive(1);
                return;
            }

            // Normalization / fallback field names
            const name = analysisData.name || analysisData.project_name || analysisData.title || '';
            const description =
                analysisData.description ||
                analysisData.summary ||
                analysisData.project_description ||
                '';
            const objectives =
                analysisData.objectives ||
                analysisData.goals ||
                analysisData.project_objectives ||
                '';
            const constraints = analysisData.constraints || analysisData.limitations || '';
            const risks = analysisData.risks || analysisData.project_risks || '';
            const primary_stakeholder =
                analysisData.primary_stakeholder ||
                analysisData.stakeholder ||
                analysisData.client ||
                '';
            let project_type = analysisData.project_type || analysisData.type || '';
            let domain = analysisData.domain || analysisData.industry || '';
            const area = analysisData.area || analysisData.focus_area || '';
            const location = analysisData.location || analysisData.site || '';
            const budget = analysisData.budget || analysisData.estimated_budget || '';
            const start_date =
                analysisData.start_date || analysisData.start || analysisData.project_start || '';
            const end_date =
                analysisData.end_date || analysisData.deadline || analysisData.project_end || '';
            const team_size =
                analysisData.team_size ||
                analysisData.team ||
                analysisData.estimated_team_size ||
                data.meta.team_size;

            const projectKey = name ? generateKeyFromName(name) : '';

            console.log('Normalized fields:', {
                name,
                projectKey,
                description,
                project_type,
                domain,
                area,
                location,
                team_size,
                budget,
                primary_stakeholder,
                objectives,
                constraints,
                start_date,
                end_date,
            });
            console.log('Current form data before update:', data);

            // --- Normalize dropdown selections ---
            const normalizeDropdown = (incoming, options, aliasMap = {}) => {
                if (!incoming) return '';
                let raw = String(incoming).trim();
                const lower = raw.toLowerCase();
                // alias direct mapping first
                if (aliasMap[lower]) raw = aliasMap[lower];
                // try exact value/label match (case-insensitive)
                for (const opt of options) {
                    const val = (opt.value || opt).toString();
                    const lbl = (opt.label || opt).toString();
                    if (val.toLowerCase() === lower || lbl.toLowerCase() === lower) return val;
                }
                // try title-cased version
                const title = raw.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                for (const opt of options) {
                    const val = (opt.value || opt).toString();
                    const lbl = (opt.label || opt).toString();
                    if (val === title || lbl === title) return val;
                }
                // fallbacks: alias to first viable generic if not present
                return '';
            };

            const projectTypeAlias = {
                software: 'Software',
                marketing: 'Marketing',
                design: 'Design',
                research: 'Research',
                construction: 'Construction',
                consulting: 'Operations', // no Consulting option
                other: 'Operations',
            };
            const domainAlias = {
                healthcare: 'Healthcare',
                finance: 'Finance',
                financial: 'Finance',
                education: 'Education',
                retail: 'Retail',
                'e-commerce': 'E-commerce',
                ecommerce: 'E-commerce',
                logistics: 'Logistics',
                manufacturing: 'Manufacturing',
                hospitality: 'Hospitality',
                government: 'Government',
                nonprofit: 'Nonprofit',
                energy: 'Energy',
                telecom: 'Telecom',
                media: 'Media',
                travel: 'Travel',
                saas: 'SaaS',
                agriculture: 'Agriculture',
            };

            const mappedProjectType = normalizeDropdown(
                project_type,
                projectTypes,
                projectTypeAlias
            );
            const mappedDomain = normalizeDropdown(domain, domains, domainAlias);

            project_type = mappedProjectType || project_type; // keep original for downstream if needed
            domain = mappedDomain || domain;

            const newData = {
                ...data,
                name: name || '',
                key: projectKey,
                description: description || '',
                start_date: start_date || '',
                end_date: end_date || '',
                meta: {
                    ...data.meta,
                    project_type: mappedProjectType || project_type || '',
                    domain: mappedDomain || domain || '',
                    area: area || '',
                    location: location || '',
                    team_size: team_size || data.meta.team_size,
                    budget: budget || '',
                    primary_stakeholder: primary_stakeholder || '',
                    objectives: objectives || '',
                    constraints: [constraints, risks].filter(Boolean).join('\n'),
                },
            };

            setDocumentAnalysisData(analysisDataRaw);
            setCreationMethod('document');
            setData(newData); // IMPORTANT: use standard setData(object) (Inertia useForm)
            console.log('New form data after population:', newData);
            console.log('=== END DOCUMENT ANALYSIS DEBUG ===');

            // If critical fields are still empty, stay on step 0 so user can retry / choose manual
            if (!newData.name && !newData.description) {
                console.warn('AI did not return name/description; staying on upload step.');
                window.dispatchEvent(
                    new CustomEvent('project-ai-empty', {
                        detail: { reason: 'missing_core_fields' },
                    })
                );
                return;
            }

            // Advance to basics step
            setActive(1);
        },
        [setData, data, projectTypes, domains]
    );

    const handleManualCreate = useCallback(() => {
        setCreationMethod('manual');
        setActive(1);
    }, []);

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
                    <DocumentUploadStep
                        onDocumentAnalyzed={handleDocumentAnalyzed}
                        onManualCreate={handleManualCreate}
                    />
                );
            case 1:
                return (
                    <Suspense fallback={<StepLoader />}>
                        <CreateStepBasics {...commonProps} nameRef={nameRef} />
                    </Suspense>
                );
            case 2:
                return (
                    <Suspense fallback={<StepLoader />}>
                        <CreateStepScope {...commonProps} />
                    </Suspense>
                );
            case 3:
                return (
                    <Suspense fallback={<StepLoader />}>
                        <CreateStepObjectives {...commonProps} />
                    </Suspense>
                );
            case 4:
                return (
                    <Suspense fallback={<StepLoader />}>
                        <CreateStepReview
                            data={data}
                            documentAnalysisData={documentAnalysisData}
                            creationMethod={creationMethod}
                        />
                    </Suspense>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Head title={t('projects.createProject')} />
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
                                {t('common.dashboard')}
                            </MuiLink>
                            <MuiLink
                                underline="hover"
                                color="inherit"
                                href="/projects"
                                sx={{ fontWeight: 500 }}
                            >
                                {t('common.projects')}
                            </MuiLink>
                            <Typography color="inherit" sx={{ fontWeight: 600 }}>
                                {t('buttons.create')}
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
                            {t('projects.createNewProjectTitle')}
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{ mt: 2, maxWidth: 720, color: alpha('#fff', 0.92) }}
                        >
                            {t('projects.createNewProjectSubtitle')}
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
                                        {t('projects.backToProjects')}
                                    </Button>
                                    <Typography variant="h5" fontWeight={700}>
                                        {t('projects.projectSetup')}
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

                                    {/* Hide navigation buttons on method selection step */}
                                    {active > 0 && (
                                        <Stack
                                            direction="row"
                                            spacing={2}
                                            justifyContent="space-between"
                                        >
                                            <Button
                                                disabled={active === 1}
                                                onClick={back}
                                                variant="outlined"
                                                sx={{ textTransform: 'none' }}
                                            >
                                                {t('projects.back')}
                                            </Button>

                                            {active === steps.length - 1 ? (
                                                <Button
                                                    type="submit"
                                                    variant="contained"
                                                    disabled={processing}
                                                    startIcon={<SaveIcon />}
                                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                                >
                                                    {processing ? t('projects.creating') : t('projects.createProject')}
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={next}
                                                    variant="contained"
                                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                                >
                                                    {t('projects.nextWith', { label: steps[active + 1] })}
                                                </Button>
                                            )}
                                        </Stack>
                                    )}
                                </form>
                            </Paper>
                        </Fade>
                    </Container>
                </Box>
            </AuthenticatedLayout>
        </>
    );
}
